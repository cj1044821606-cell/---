export interface UploadI18nEntry {
  zh: string;
  en: string;
}

/** 上传页模块字典 */
export const UPLOAD_I18N: Record<string, UploadI18nEntry> = {
  "upload.page.title": { zh: "上传新物料", en: "Upload new material" },
  "upload.page.subtitle": {
    zh: "提交后 AI 会自动识别并入库，进度可随时在待办箱查看",
    en: "AI will recognize and register it automatically. Track progress in your inbox",
  },
  "upload.gate.title": { zh: "暂无上传权限", en: "No upload access" },
  "upload.gate.desc": {
    zh: "上传功能仅对策划、设计师、区域营销角色开放",
    en: "Only planners, designers and regional marketing can upload",
  },
  "upload.field.fileM": { zh: "物料文件", en: "Material file" },
  "upload.field.fileM.hint": {
    zh: "要入库的成品文件（导出件）",
    en: "The finished file to register",
  },
  "upload.field.fileL": { zh: "源文件 L（选填）", en: "Source file L (optional)" },
  "upload.field.fileL.hint": {
    zh: "可编辑源文件，入库后保留给设计团队",
    en: "Editable source, kept for the design team",
  },
  "upload.field.fileS": { zh: "预览图 S（选填）", en: "Preview S (optional)" },
  "upload.field.fileS.hint": {
    zh: "轻量预览图，用于列表展示",
    en: "Lightweight preview for listing",
  },
  "upload.field.pick": { zh: "拖拽或选择文件", en: "Drop or choose file" },
  "upload.field.addMore": { zh: "继续添加文件", en: "Add more files" },
  "upload.field.uploading": { zh: "上传中…", en: "Uploading…" },
  "upload.field.chunking": { zh: "分片上传中", en: "Chunking" },
  "upload.field.largeFile": { zh: "大文件", en: "Large" },
  "upload.field.replace": { zh: "替换", en: "Replace" },
  "upload.field.uploadFailed": {
    zh: "文件上传失败，请重试",
    en: "File upload failed. Please retry",
  },
  "upload.field.originalFileName": { zh: "原始文件名", en: "Original file name" },
  "upload.field.originalFileName.placeholder": {
    zh: "选文件后自动填入，可修改",
    en: "Auto-filled from the file, editable",
  },
  "upload.field.brief": { zh: "设计 Brief", en: "Design brief" },
  "upload.field.brief.placeholder": {
    zh: "简单描述设计内容、语言版本、目标市场等",
    en: "Describe content, language, target market…",
  },
  "upload.field.note": { zh: "物料关键信息", en: "Key material info" },
  "upload.field.note.placeholder": {
    zh: "物料（产品/品牌）/型号/区域/语言/用途/颜色配置（RGB/CMYK）",
    en: "Material (product/brand) / model / region / language / usage / color (RGB/CMYK)",
  },
  "upload.field.versionReplace": { zh: "是否为版本替换", en: "Replacing an old version?" },
  "upload.field.versionReplace.hint": {
    zh: "勾选后需关联被替换的旧版本，入库后旧版本会被标记替代",
    en: "Link the old version being replaced",
  },
  "upload.field.oldVersion": { zh: "被替换的旧版本", en: "Old version to replace" },
  "upload.field.oldVersion.placeholder": {
    zh: "按物料名或版本号搜索",
    en: "Search by name or version no.",
  },
  "upload.field.oldVersion.empty": {
    zh: "未找到匹配版本",
    en: "No matching version",
  },
  "upload.field.planner": { zh: "策划人及审核人", en: "Planner & auditor" },
  "upload.field.planner.placeholder": {
    zh: "选择需求方策划人员",
    en: "Select planner(s)",
  },
  "upload.field.designer": { zh: "设计师", en: "Designer" },
  "upload.field.designer.placeholder": {
    zh: "选择设计师",
    en: "Select designer",
  },
  "upload.review.title": { zh: "提交检查", en: "Submission check" },
  "upload.review.desc": {
    zh: "这里展示完整度和 AI 将使用的识别线索",
    en: "Review completeness and the clues AI will use",
  },
  "upload.review.materialReady": {
    zh: "已上传物料文件",
    en: "Material file uploaded",
  },
  "upload.review.nameReady": {
    zh: "已确认原始文件名",
    en: "Original file name confirmed",
  },
  "upload.review.versionReady": {
    zh: "版本关系已完整",
    en: "Version relationship complete",
  },
  "upload.review.namingClues": {
    zh: "AI 命名线索",
    en: "AI naming clues",
  },
  "upload.review.fileName": { zh: "文件名", en: "File name" },
  "upload.review.keyInfo": { zh: "关键信息", en: "Key info" },
  "upload.review.files": { zh: "已上传文件", en: "Uploaded files" },
  "upload.review.people": { zh: "已选人员", en: "Selected people" },
  "upload.review.pending": { zh: "待补充", en: "Pending" },
  "upload.review.aiNotice": {
    zh: "最终标准命名会在 AI 读取物料内容后生成，此处不会提前伪造结果。",
    en: "The final standard name is generated only after AI reads the material.",
  },
  "upload.review.ready": { zh: "必填项已完整", en: "Required fields complete" },
  "upload.review.remaining": { zh: "还差必填项", en: "Required items remaining:" },
  "upload.submit": { zh: "提交给 AI 处理", en: "Submit to AI pool" },
  "upload.submit.uploadingFile": {
    zh: "请等待文件上传完成",
    en: "Wait for file upload to finish",
  },
  "upload.submit.needM": {
    zh: "请先上传物料文件",
    en: "Upload the material file first",
  },
  "upload.submit.needOldVersion": {
    zh: "请选择被替换的旧版本",
    en: "Select the old version to replace",
  },
  "upload.submit.failed": { zh: "提交失败，请重试", en: "Submit failed. Please retry" },
  "upload.done.title": { zh: "已提交，AI 开始处理", en: "Submitted. AI is on it" },
  "upload.done.desc": {
    zh: "记录已写入 AI 待处理池，识别完成后 AI 会找你确认。编号：",
    en: "Record written to the AI pool. AI will ask you to confirm. ID: ",
  },
  "upload.done.again": { zh: "再上传一个", en: "Upload another" },
  "upload.done.toInbox": { zh: "去待办箱看进度", en: "Track in inbox" },
};
