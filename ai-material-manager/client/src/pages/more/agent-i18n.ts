/** 「AI 助手接入」卡片文案 */
export const AGENT_I18N: Record<string, { zh: string; en: string }> = {
  "agent.title": { zh: "AI 助手接入（MCP）", en: "AI assistant access (MCP)" },
  "agent.intro": {
    zh: "让你电脑上的 AI 助手（Codex、Claude、Cursor 等）直接上传物料、查找下载、处理待办。它以你本人的身份操作，权限与网页一致。",
    en: "Let the AI assistant on your computer (Codex, Claude, Cursor, …) upload, search, download and handle to-dos for you. It acts as you, with the same permissions as the web app.",
  },
  "agent.step1": { zh: "① 创建个人访问令牌", en: "① Create a personal access token" },
  "agent.step2": { zh: "② 把配置粘贴到 AI 助手", en: "② Paste the config into your assistant" },
  "agent.step3": { zh: "③ 安装 Skill（推荐）", en: "③ Install the Skill (recommended)" },
  "agent.mcpUrl": { zh: "MCP 地址", en: "MCP URL" },
  "agent.label": { zh: "令牌名称", en: "Token name" },
  "agent.label.placeholder": {
    zh: "例如：我的 MacBook 上的 Claude",
    en: "e.g. Claude on my MacBook",
  },
  "agent.ttl": { zh: "有效期", en: "Expires in" },
  "agent.ttl.days": { zh: "{n} 天", en: "{n} days" },
  "agent.create": { zh: "创建令牌", en: "Create token" },
  "agent.creating": { zh: "创建中…", en: "Creating…" },
  "agent.created.title": {
    zh: "令牌已创建：只显示这一次，请立即复制到 AI 助手配置里",
    en: "Token created — shown only once, copy it into your assistant now",
  },
  "agent.created.done": { zh: "我已保存", en: "I've saved it" },
  "agent.config.placeholder": {
    zh: "创建令牌后，这里会生成带令牌的完整配置",
    en: "Create a token to get a ready-to-paste config",
  },
  "agent.config.promptTab": { zh: "发给 AI（推荐）", en: "Send to AI (easiest)" },
  "agent.config.prompt": {
    zh: "整段复制，粘贴给 Codex 发送，它会自己改好配置、装好 Skill；它申请权限时点「允许」，完成后重启 Codex",
    en: "Copy all of it and send it to Codex — it edits its own config and installs the Skill. Click Allow when asked, then restart Codex",
  },
  "agent.config.codex": {
    zh: "Codex（命令行 / 桌面 App / VS Code 插件通用）：粘贴到 ~/.codex/config.toml 末尾（Windows 是 %USERPROFILE%\\.codex\\config.toml），保存后重启 Codex",
    en: "Codex (CLI / desktop app / IDE extension): append to ~/.codex/config.toml (Windows: %USERPROFILE%\\.codex\\config.toml), save and restart Codex",
  },
  "agent.config.claudeCode": {
    zh: "在终端运行（Claude Code）",
    en: "Run in a terminal (Claude Code)",
  },
  "agent.config.claudeDesktop": {
    zh: "Claude 桌面版：设置 → 开发者 → 编辑配置，合并到 claude_desktop_config.json（需已安装 Node.js）",
    en: "Claude Desktop: Settings → Developer → Edit Config, merge into claude_desktop_config.json (Node.js required)",
  },
  "agent.config.generic": {
    zh: "Cursor / Windsurf / 其他支持远程 MCP 的助手：写入它的 mcp.json",
    en: "Cursor / Windsurf / other remote-MCP clients: add to their mcp.json",
  },
  "agent.skill.desc": {
    zh: "Skill 是给 AI 助手的操作手册，告诉它上传流程、命名规则、哪些动作必须先问你。Codex 解压到 ~/.codex/skills/，Claude Code 解压到 ~/.claude/skills/；Claude 桌面版/网页版在设置的 Skills 页面上传压缩包。",
    en: "The Skill is an operating manual for the assistant: upload flow, naming rules and which actions need your approval. Unzip into ~/.codex/skills/ for Codex or ~/.claude/skills/ for Claude Code; in the Claude app upload the zip on the Skills settings page.",
  },
  "agent.skill.download": { zh: "下载 Skill", en: "Download Skill" },
  "agent.tokens": { zh: "我的令牌", en: "My tokens" },
  "agent.tokens.empty": { zh: "还没有令牌", en: "No tokens yet" },
  "agent.tokens.expires": { zh: "到期 {date}", en: "Expires {date}" },
  "agent.tokens.lastUsed": { zh: "最近使用 {date}", en: "Last used {date}" },
  "agent.tokens.never": { zh: "尚未使用", en: "Never used" },
  "agent.revoke": { zh: "吊销", en: "Revoke" },
  "agent.revoke.confirm": {
    zh: "吊销后，使用这个令牌的 AI 助手会立刻失去访问权限。确定吊销「{label}」吗？",
    en: "Assistants using this token lose access immediately. Revoke “{label}”?",
  },
  "agent.revoked": { zh: "已吊销", en: "Revoked" },
  "agent.copy": { zh: "复制", en: "Copy" },
  "agent.copied": { zh: "已复制", en: "Copied" },
  "agent.copyFailed": {
    zh: "复制失败，请手动选中复制",
    en: "Copy failed, please select and copy manually",
  },
  "agent.safety": {
    zh: "令牌等同于你的登录身份：不要发到群聊、不要提交到代码仓库；设备丢失或不再使用时请吊销。",
    en: "A token equals your login: never post it in chats or commit it to code; revoke it when a device is lost or retired.",
  },
  "agent.error": { zh: "操作失败，请重试", en: "Something went wrong, please retry" },
};
