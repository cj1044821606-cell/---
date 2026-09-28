/** Codex 接入教程文案 */
export const TUTORIAL_I18N: Record<string, { zh: string; en: string }> = {
  'tutorial.title': {
    zh: '让 Codex 帮你上传物料',
    en: 'Let Codex upload materials for you',
  },
  'tutorial.subtitle': {
    zh: '配置一次，以后在自己电脑上用一句话完成命名、上传、打标记、预发布',
    en: 'Set it up once, then name, upload, tag and pre-release with one sentence',
  },
  'tutorial.launcher': { zh: 'Codex 接入教程', en: 'Codex setup guide' },
  'tutorial.parked': {
    zh: '教程收在这里啦，随时点开重看',
    en: 'The guide lives here — reopen it any time',
  },
  'tutorial.prev': { zh: '上一步', en: 'Back' },
  'tutorial.next': { zh: '下一步', en: 'Next' },
  'tutorial.pause': { zh: '暂停', en: 'Pause' },
  'tutorial.play': { zh: '播放', en: 'Play' },
  'tutorial.replay': { zh: '重播', en: 'Replay' },
  'tutorial.goCreate': { zh: '去创建令牌', en: 'Create a token' },
  'tutorial.done': { zh: '我知道了', en: 'Got it' },
  'tutorial.stepOf': { zh: '第 {n} / {total} 步', en: 'Step {n} of {total}' },
  'tutorial.demo': { zh: '动画示意', en: 'Illustration' },
  'tutorial.copy': { zh: '复制', en: 'Copy' },
  'tutorial.copied': { zh: '已复制', en: 'Copied' },
  'tutorial.copyFailed': {
    zh: '复制失败，请手动选中复制',
    en: 'Copy failed, please copy manually',
  },
  'tutorial.os.mac': { zh: 'macOS', en: 'macOS' },
  'tutorial.os.win': { zh: 'Windows', en: 'Windows' },

  'tutorial.s1.title': {
    zh: '① 在网页创建令牌',
    en: '① Create a token on the web',
  },
  'tutorial.s1.body': {
    zh: '令牌是一把只给 AI 用的钥匙：Codex 拿着它，以你本人的身份进出物料库。到「更多 → AI 助手接入」起个名字、点「创建令牌」，马上复制——它只显示这一次。',
    en: 'A token is a key just for your AI: Codex uses it to act as you. Go to More → AI assistant access, name it, click Create token and copy it right away — it is shown only once.',
  },
  'tutorial.s1.card': {
    zh: 'AI 助手接入（MCP）',
    en: 'AI assistant access (MCP)',
  },
  'tutorial.s1.label': { zh: 'Codex · 我的电脑', en: 'Codex · my laptop' },
  'tutorial.s1.create': { zh: '创建令牌', en: 'Create token' },
  'tutorial.s1.once': { zh: '只显示这一次', en: 'Shown only once' },

  'tutorial.s2.title': {
    zh: '② 把配置写进 Codex',
    en: '② Add the config to Codex',
  },
  'tutorial.s2.body': {
    zh: '打开 Codex 的配置文件 config.toml（没有就新建一个），把下面三行贴到末尾，令牌换成刚复制的那串，保存后重启 Codex。命令行、桌面 App、VS Code 插件共用这一个文件，配一次全都能用。',
    en: "Open Codex's config.toml (create it if missing), append the three lines below with your token, save and restart Codex. The CLI, desktop app and IDE extension share this file.",
  },
  'tutorial.s2.replace': {
    zh: '换成你刚复制的令牌',
    en: 'Replace with the token you just copied',
  },
  'tutorial.s2.path.mac': {
    zh: '文件位置：~/.codex/config.toml',
    en: 'File: ~/.codex/config.toml',
  },
  'tutorial.s2.path.win': {
    zh: '文件位置：%USERPROFILE%\\.codex\\config.toml',
    en: 'File: %USERPROFILE%\\.codex\\config.toml',
  },
  'tutorial.s2.open.mac': {
    zh: '不会找文件？在终端运行这行，会用文本编辑器打开它：',
    en: "Can't find it? Run this in Terminal to open it in TextEdit:",
  },
  'tutorial.s2.open.win': {
    zh: '不会找文件？在 PowerShell 运行这行，会用记事本打开它：',
    en: "Can't find it? Run this in PowerShell to open it in Notepad:",
  },

  'tutorial.s3.title': { zh: '③ 确认已经连上', en: '③ Check the connection' },
  'tutorial.s3.body': {
    zh: '在 Codex 里输入 /mcp，看到 transsion-ess-materials 和它的 12 个工具就说明连通了。看不到的话：检查令牌是否复制完整，Codex 是否已升级到最新版，再重启一次。',
    en: "Type /mcp in Codex. If transsion-ess-materials shows up with its 12 tools, you're connected. If not, check the token was copied in full, update Codex and restart it.",
  },
  'tutorial.s3.connected': { zh: '已连接', en: 'connected' },
  'tutorial.s3.tools': { zh: '12 个工具', en: '12 tools' },

  'tutorial.s4.title': {
    zh: '④ 装上 Skill 操作手册',
    en: '④ Install the Skill',
  },
  'tutorial.s4.body': {
    zh: 'Skill 是写给 Codex 的操作手册：上传流程、命名规则、哪些动作必须先问你。在「更多」页下载 Skill 压缩包，解压到 ~/.codex/skills/ 目录，重启 Codex。',
    en: "The Skill is Codex's playbook: upload flow, naming rules, and what needs your approval. Download the Skill zip on the More page, unzip it into ~/.codex/skills/ and restart Codex.",
  },
  'tutorial.s4.unzip.mac': {
    zh: '下载后在终端运行：',
    en: 'After downloading, run in Terminal:',
  },
  'tutorial.s4.unzip.win': {
    zh: '下载后在 PowerShell 运行：',
    en: 'After downloading, run in PowerShell:',
  },

  'tutorial.s5.title': {
    zh: '⑤ 开始用：一句话发布',
    en: '⑤ Use it: publish in one sentence',
  },
  'tutorial.s5.body': {
    zh: '直接用大白话告诉 Codex 要做什么。它会自己命名、上传、打标记，发布前一定先复述并等你点头。发出去是「预发布」：大家已经能下载，策划及审核人在网页点「审核通过」后转为正式发布。',
    en: 'Just tell Codex what you need. It names, uploads and tags the file, and always recaps and waits for your OK before publishing. It goes out as a pre-release — downloadable right away, and official once the reviewer approves on the web.',
  },
  'tutorial.s5.ask': {
    zh: '把桌面上的 IPV-1K612U 巴基斯坦英文彩页预发布到物料库',
    en: 'Pre-release the IPV-1K612U Pakistan English leaflet on my desktop',
  },
  'tutorial.s5.upload': { zh: '上传 2 个文件', en: 'Uploading 2 files' },
  'tutorial.s5.confirm': {
    zh: '准备预发布「IPV-1K612U-彩页-EN-PK-V1.0」，审核人：王策划。确认吗？',
    en: 'Ready to pre-release “IPV-1K612U-Leaflet-EN-PK-V1.0”, reviewer: Wang. Go ahead?',
  },
  'tutorial.s5.yes': { zh: '确认', en: 'Yes' },
  'tutorial.s5.result': {
    zh: '已预发布 ✓ 大家现在就能下载，等王策划审核通过后转正式。',
    en: 'Pre-released ✓ Downloadable now; becomes official once Wang approves.',
  },
  'tutorial.s5.try': {
    zh: '试试这样说（点一下复制）：',
    en: 'Try saying (tap to copy):',
  },
  'tutorial.s5.p1': {
    zh: '把桌面上的储能海报预发布到物料库，替换旧版',
    en: 'Pre-release the storage poster on my desktop, replacing the old version',
  },
  'tutorial.s5.p2': {
    zh: '帮我找最新的逆变器白底图，下载到「下载」文件夹',
    en: 'Find the latest inverter white-background renders and download them',
  },
  'tutorial.s5.p3': {
    zh: '我现在有哪些物料待办？',
    en: 'What material to-dos do I have?',
  },
};
