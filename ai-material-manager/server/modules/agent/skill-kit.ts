import { MCP_SERVER_NAME } from "./agent.constants";
import { createZip, type ZipEntry } from "./zip";

export const SKILL_NAME = "material-assistant";

/**
 * Skill = 给 AI 助手的“操作手册”：什么时候用、按什么顺序调用 MCP 工具、哪些动作必须先问用户。
 * MCP 提供能力，Skill 提供做法，两者配合才能让本机 AI 稳定地完成上传与处理。
 * 命名规则摘自 tclaw/knowledge/命名与编码规则.md（服务端镜像不含 tclaw 目录，故内嵌于此）。
 */
export function buildSkillFiles(options: { baseUrl: string }): ZipEntry[] {
  const { baseUrl } = options;
  const skill = `---
name: ${SKILL_NAME}
description: 传音储能物料管理系统助手。当用户要把本地设计文件/物料上传或预发布到物料库、给物料命名、发布新版本替换旧版、查找或下载物料、查看物料待办时使用。依赖名为 ${MCP_SERVER_NAME} 的 MCP 服务。
---

# 物料管理系统助手

你通过 MCP 服务 \`${MCP_SERVER_NAME}\` 以用户本人身份操作物料管理系统（网页：${baseUrl}）。
所有数据保存在飞书多维表格，工具返回的都是真实业务数据。工具报错时把原文告诉用户，不要编造结果。

## 你负责的环节

识别命名 → 上传 → 打标记 → 预发布。整个过程在用户电脑上由你完成，服务器几秒内写完主表、版本记录、发布记录，
**不经过 TClaw**。预发布的物料所有人都能正常下载；**策划人及审核人**在网页点“审核通过”后变为正式发布，驳回则下架。

## 上传并预发布（按顺序做）

1. **确认身份**：\`whoami\`，确认 canUpload 为 true。
2. **读懂文件**：打开用户给的导出件（PDF/图片/视频）看内容，判断：
   - 物料大类：产品物料 / 品牌物料 / 展会物料；
   - 产品型号（照搬真实型号串，如 IPV-1K612U）、物料类型、语言、主市场码（如 PK）、版本号；
   - 标记：物料名称（中文可读名）、产品线、适用区域（多选）、风险标签、是否允许外发、是否推荐。
   规则见 [reference/naming.md](reference/naming.md)。**看不出来或有歧义的项直接问用户，一次问清，不要猜。**
3. **新物料还是新版本**：用 \`search_materials\` 按型号/类型查一下。已有同一份物料 → 这是版本更新，
   记下它的 materialId 作为 replaceMaterialId，并对比新旧导出件写出改动摘要（changeSummary）。
4. **规划命名**：\`plan_material(naming, replaceMaterialId?)\` → 得到最终 standardName；版本替换时参考返回的建议版本号
   （小改 V1.0→V1.1，结构/风格大改 →V2.0，参数修正需产品负责人确认）。
5. **上传文件**：每个文件
   - 读字节数（macOS/Linux：\`stat -f%z 文件\` 或 \`stat -c%s 文件\`；Windows：\`(Get-Item 文件).Length\`）；
   - \`prepare_upload(localPath, fileSize, standardName, kind)\`，kind：M=导出件（必有）、L=源文件（AI/PSD/INDD）、S=预览图；
   - 在用户电脑上执行返回的 \`commands.bash\`（macOS/Linux）或 \`commands.powershell\`（Windows），不要改写命令里的链接；
   - 记下 taskId。上传链接 2 小时内有效。
6. **等转存**：\`get_upload_status\` 直到全部为 done；failed 就重新上传该文件。
7. **指定审核人**：问用户谁是策划人及审核人，用 \`find_people\` 拿 open_id（必填）。设计师可选。
8. **发布前复述并取得同意**：标准命名、物料名称、类型、型号、语言、适用区域、是否外发、审核人、文件清单；
   版本替换要特别说明“旧版会立即下架并通知领取过旧版的人”。用户明确同意后调用 \`publish_material\`。
9. **回报**：告诉用户物料链接（webUrl），说明现在是预发布、等谁审核。

一次发布 = 一条物料。同一型号的多种物料类型（数据表、折页、海报…）要分别发布。

## 跟进

- \`list_my_tasks\`：\`prereleaseRejected\` 是被驳回的预发布，message 是驳回原因——按原因修改后重新走一遍上传并发布；
  \`prereleaseReview\` 是等用户本人审核的预发布，请引导用户到网页 ${baseUrl}/inbox 点审核按钮（审核必须由本人在网页完成）。
- 网页上传的文件仍由 TClaw 处理：它的追问用 \`answer_ai_question\` 回复；识别结果确认用 \`confirm_recognition\`，
  **必须由用户明确选择**“发布 / 仅入库 / 退回”后才调用，退回要写原因。

## 查找与下载

- \`search_materials\` 支持关键词、物料类型、型号、区域筛选；isPrerelease=true 表示还在预发布。
- \`get_material_files\` 返回下载链接（30 分钟有效），用 \`curl -fL -o "文件名" "链接"\` 保存到用户指定目录；
  linkType=external 的是飞书云盘链接，请用户在浏览器打开。
- externalSendAllowed=false 的物料，提醒用户不要发给公司外部。

## 注意

- 不要替用户做发布、替换、退回的决定；这些动作都要先复述再得到同意。
- 上传/下载链接绑定用户本人身份，不要发到群聊或外部。
`;

  const naming = `# 命名规则速查

> 来源：TClaw 命名与编码规则（2026-06 版）。plan_material 会按同样规则拼接并查重，这里帮助你从文件内容中判断各段取值。

## 三大类

| 大类 | 结构 | 例子 |
|---|---|---|
| 产品物料 | 产品型号-物料类型-语言-(区域)-版本号 | IPV-1K612U-Datasheet-En-(PK)-V1.0 |
| 品牌物料·Logo | 品牌-Logo-[语言]-[(区域)]-版本号 | itel-Logo-V1.0 |
| 品牌物料·其他 | 物料类型-语言-(区域)-版本号（不带品牌） | Brochure-En-(PK)-V1.0 |
| 展会物料 | (年份)展会缩写-物料类型-(区域)-版本号（无语言） | (2026)GITEX-Poster-(PK)-V1.0 |

- 名字里**不含日期**；任何更新只升版本号（V主.次）。
- **区域**：命名里用真实市场码括号，如 (PK)(NG)(UZ)；全球/总部/无指定区域整段省略；多区域只写主区域。
  这与“适用区域”（AF 非洲 / SEA 东南亚 / ME 中东 / LATAM 拉美 / GLOBAL 全球，多选）是两回事：
  适用区域决定谁能看到，照用户所说填全，**不要用 GLOBAL 兜底**。
- **产品型号**照搬真实串（含连字符），不解码不缩写。产品线（AIO 一体机 / INV 逆变器 / BAT 电池 / PPS 便携储能 / ESS 储能系统 / C&I 工商储…）只是分类，不进名字。
- **语言**：EN/CN/FR/AR/ES，命名里写成 En/Cn/Fr/Ar/Es；展会物料无语言段。

## 物料类型（命名取开头英文词）

Folder 折页 · Flyer 单页 · Datasheet 数据表 · DetailPage 详情页/长图 · KV 主视觉 · Manual 说明书 · USP 卖点文档 ·
ProductVideo 产品视频 · InstallVideo 安装视频 · Photo 产品图/场景图 · IDImage ID白底图 · Packaging 包装设计 ·
Social 社媒/一图读懂 · Brochure 画册 · Logo 品牌Logo · VI 品牌视觉 · Poster 海报 · PPT 演示 · Training 培训

## 版本号

| 改动 | 版本变化 | versionType |
|---|---|---|
| 首次发布 | V1.0 | （自动为首版） |
| 文案/图片/翻译小修 | V1.0 → V1.1 | 小改 |
| 产品参数修正（需产品负责人确认） | V1.0 → V1.1 | 错误修复 |
| 结构/设计风格大改 | V1.0 → V2.0 | 大改 |

## 物料名称与文件名

- 物料名称 = 给人看的中文名，如“IPV-1K612U 数据表·巴基斯坦”“itel 品牌画册”“2026 GITEX 海报”。
- 文件以“标准命名-M/L/S.扩展名”入库（prepare_upload 传 standardName 和 kind 会自动处理）：
  M 导出件（PDF/PNG/JPG/MP4）、L 源文件（PSD/AI）、S 轻量预览。
- Logo 的 RGB/CMYK 这类看起来一样的变体放在同一条物料里，不要另建。
`;

  return [
    { path: `${SKILL_NAME}/SKILL.md`, content: skill },
    { path: `${SKILL_NAME}/reference/naming.md`, content: naming },
  ];
}

export function buildSkillZip(options: { baseUrl: string }): Buffer {
  return createZip(buildSkillFiles(options));
}
