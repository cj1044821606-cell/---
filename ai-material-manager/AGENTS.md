# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 传音储能事业部全球一线员工（销售/策划/设计师/审核人/维护者），跨国多语言环境，高频处理AI协作任务与物料管理
- **核心目的**: 将756种AI状态机翻译为人话待办卡片，把文件名还原为视觉化物料档案，建立人机协作信任与操作掌控感
- **情绪基调**: 沉稳掌控 / 高效专注；避免焦虑、信息过载、廉价感、装饰性干扰

### 1.2 设计方向

- **Design Style**: Muji 极简 + Grid 网格辅助 — 高密度业务信息需克制留白与零装饰，线性图标+等宽数据字段强化专业工具感与跨文化可读性
- **Application Type**: SaaS/Tool（移动端优先的内部工作台，桌面端自适应）
- **Aesthetic Direction**: 冷静深蓝基底承载权威感，四色语义状态精准点缀，数据字段等宽对齐，零装饰纯功能主义

## 2. Color System (色彩系统)

**色彩关系**: 沉稳深蓝主色 + 低饱和蓝灰底 + 深墨文字 + 四色语义状态（绿/灰/橙/红）
**配色设计理由**: 跨国团队需中性权威感，深蓝 hsl(215 60% 42%) 适配多肤色审美且降低长时间使用疲劳；语义色严格限定于状态徽章与优先标记
**主色推导**: primary = 品牌蓝对应"确认/领取/保存"核心动作；accent = 极浅蓝灰用于 hover/focus/skeleton 不抢注意力
**使用比例**: 60% 中性背景 / 30% 卡片容器 / 10% 主色；语义色仅用于状态徽章、优先分组天数、硬提示横幅

### 2.1 主题颜色

| Token                | HSL 值            | 说明                                     |
| -------------------- | ----------------- | ---------------------------------------- |
| `background`         | hsl(220 18% 97%)  | 页面底色，低饱和蓝灰减少眩光             |
| `card`               | hsl(0 0% 100%)    | 卡片/容器背景                            |
| `foreground`         | hsl(220 25% 15%)  | 主文字，深墨蓝非纯黑                     |
| `muted-foreground`   | hsl(220 12% 50%)  | 次要文字/标准命名/时间戳                 |
| `primary`            | hsl(215 60% 42%)  | 主交互：领取/确认/保存按钮填充           |
| `primary-foreground` | hsl(0 0% 100%)    | 主交互文字/图标                          |
| `accent`             | hsl(215 40% 95%)  | Ghost按钮hover/Dropdown focus/骨架屏背景 |
| `accent-foreground`  | hsl(215 60% 35%)  | accent上的文字/图标                      |
| `border`             | hsl(220 15% 90%)  | 边框/分隔线                              |

### 2.2 导航区配色

- **基调关系**: 复用主配色系统，移动端底部栏/桌面端顶栏背景=`card`，激活态=primary色相加深至 hsl(215 65% 36%)
- **关键状态**: 默认=muted-foreground；激活/Hover=primary；Focus=ring-primary/30；对比度≥4.5:1
- **边界与背景**: 非透明背景；移动端顶部细线 border-border 分隔，桌面端底部 1px border-border

### 2.3 语义颜色

| 用途         | HSL 值           | 衍生说明                                      |
| ------------ | ---------------- | --------------------------------------------- |
| 可用/ok      | hsl(145 60% 40%) | 绿系，背景 hsl(145 50% 95%)，边框中饱和       |
| 处理中/mute  | hsl(220 12% 50%) | 灰系，同 muted-foreground                     |
| 等你/warn    | hsl(35 85% 50%)  | 橙系，大字号用 hsl(35 80% 42%) 达 4.5:1       |
| 已过期/bad   | hsl(5 70% 50%)   | 红系，优先分组天数加粗；硬提示 bg=hsl(5 60% 95%) |

## 3. Typography (字体排版)

- **Heading**: Inter, "SF Pro Display", "PingFang SC", system-ui, sans-serif
- **Body**: Inter, "SF Pro Text", "PingFang SC", system-ui, sans-serif
- **Mono**: "JetBrains Mono", "SF Mono", "Roboto Mono", monospace（仅用于标准命名/版本号/内部ID/耗时秒数/等待天数）
- **字体策略**: 系统字体栈保障弱网首屏渲染；mono 仅用于结构化数据字段，正文禁用；英文态下 standard_name 升为主标题字重 font-semibold，material_name 降为副标题 font-normal text-muted-foreground

## 4. Layout Strategy (布局策略)

- **导航意图**: 全局四Tab导航（待办/物料库/我的/更多）；移动端固定底部栏，桌面端固定顶栏；至多一套；非透明背景；待办Tab红点仅对有待办且默认不落在此的用户显示
- **页面架构**: 内容区填充父容器，max-w-[1200px] 居中；物料详情页 max-w-3xl 限制阅读宽度；运维表格紧凑布局无额外留白
- **响应式**: 移动端单列卡片流+底部Tab；桌面端双列物料网格+顶部Nav；触控目标 min-h-[38px]；资料包视图按型号聚合不分页

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-md (0.375rem)` · 阴影 `shadow-sm hover:shadow-md` · 间距基调 `standard (p-4/gap-4)`
- **识别签名**: AI原话蓝底引用块 bg=hsl(215 50% 94%) + 左边框 3px solid primary + 文字 hsl(215 60% 30%)；状态徽章 capsule+icon；版本时间线当前有效版绿色实心圆点带 box-shadow 光晕；编辑脏标记橙色小圆点
- **装饰策略**: 零装饰动画；仅交互反馈动效 120-180ms ease-out；禁止 loading 转圈以外的循环动画
- **动效原则**: 按钮/卡片 hover/展开/Toast 出入 120-180ms；领取按钮点击即变 disabled+已领取文案，乐观更新不转圈
- **可及性**: 对比度≥4.5:1（大字号≥3:1）；AI引用块文字 hsl(215 60% 30%) 确保达标；红底硬提示配白色文字；复杂背景加遮罩

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Card 覆盖 Default/Hover/Focus/Active/Disabled；领取按钮点击即变 disabled+已领取文案；分享按钮不满足外发条件时完全不渲染
- **层级清晰**: Primary=实心蓝底；Secondary=outline蓝边；Ghost=accent-bg-hover；表单 Focus=ring-2 ring-primary/40；编辑锁字段显示锁图标+不可改原因文案
- **一致性**: 所有图标 lucide-react 线性 stroke-currentColor；尺寸仅 12/13/15/16/20 五档；禁止 emoji；状态徽章双语文案（可用/Ready、处理中/In progress、等你/Waiting on you、已过期/Outdated）
- **空状态**: 插画替换为线性SVG图标+文案组合；骨架屏 shimmer 用 accent 色；封面降级链 previewFileS→coverImage→按 material_type 着色占位，绝不显示灰色破图

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 无强制图片需求；物料封面由用户上传或AI生成，前端仅负责降级渲染
- **Image Art Direction**: 占位图使用 primary 色相 hsl(215 60% 42%) + 低饱和渐变 + 物料类型线性图标居中；弱网优先加载轻量预览图并懒加载大图
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 禁止灰色破图图标；禁止通用 stock photo 占位；禁止 emoji 作为类型标识；禁止 AI 引用块使用深色或高饱和蓝底

## 8. 应避免 (Anti-patterns)

- ❌ 使用 emoji 表达状态或图标（Windows/低端安卓渲染不一致，无法跟随 currentColor）
- ❌ AI 引用块使用深色背景或高饱和蓝（应使用 hsl(215 50% 94%) 浅蓝底 + hsl(215 60% 30%) 深蓝字）
- ❌ 编辑态隐藏非白名单字段（必须显示锁图标+不可改原因，保持系统透明度）