/** Codex 接入教程文案 */
export const TUTORIAL_I18N: Record<string, { zh: string; en: string }> = {
  'tutorial.title': {
    zh: '3 步，让 Codex 帮你传物料',
    en: '3 steps to let Codex upload for you',
  },
  'tutorial.subtitle': {
    zh: '不用懂技术：复制一段话发给 Codex，它会自己配置好。以后说一句话，就能完成命名、上传、打标记、预发布。',
    en: 'No tech skills needed: send one message to Codex and it sets itself up. Then one sentence names, uploads, tags and pre-releases your files.',
  },
  'tutorial.launcher': { zh: 'Codex 接入教程', en: 'Codex setup guide' },
  'tutorial.parked': {
    zh: '教程收在这里啦，随时点开重看',
    en: 'The guide lives here — reopen it any time',
  },
  'tutorial.prev': { zh: '上一步', en: 'Back' },
  'tutorial.next': { zh: '下一步', en: 'Next' },
  'tutorial.replay': { zh: '重播动画', en: 'Replay' },
  'tutorial.done': { zh: '开始使用', en: "Let's go" },
  'tutorial.copied': { zh: '已复制', en: 'Copied' },
  'tutorial.copyFailed': {
    zh: '复制失败，请手动选中复制',
    en: 'Copy failed, please copy manually',
  },
  'tutorial.step': { zh: '第 {n} 步', en: 'Step {n}' },

  'tutorial.s1.tab': { zh: '生成口令', en: 'Get message' },
  'tutorial.s1.title': {
    zh: '一键生成你的专属配置口令',
    en: 'Generate your personal setup message',
  },
  'tutorial.s1.body': {
    zh: '口令是一段写给 Codex 的话，里面带着物料库地址和只属于你的令牌。点下面的按钮生成，然后复制。',
    en: 'The setup message is a note for Codex containing the library address and a token that is yours alone. Generate it below, then copy it.',
  },
  'tutorial.s1.magic': { zh: '一键生成', en: 'One click' },
  'tutorial.s1.card': { zh: '配置口令', en: 'Setup message' },
  'tutorial.s1.only': { zh: '专属于你', en: 'Just for you' },
  'tutorial.s1.part.url': { zh: '物料库地址', en: 'Library URL' },
  'tutorial.s1.part.token': { zh: '你的令牌', en: 'Your token' },
  'tutorial.s1.part.skill': { zh: '操作手册', en: 'Playbook' },
  'tutorial.s1.line1': {
    zh: '请帮我把这台电脑上的 Codex 接入物料管理系统…',
    en: 'Please connect Codex on this computer to the library…',
  },
  'tutorial.s1.line2': {
    zh: '第 1 步：配置 MCP 服务',
    en: 'Step 1 — Configure the MCP server',
  },
  'tutorial.s1.line3': {
    zh: '第 2 步：安装 Skill 操作手册',
    en: 'Step 2 — Install the Skill',
  },
  'tutorial.s1.line4': { zh: '第 3 步：收尾', en: 'Step 3 — Finish' },
  'tutorial.s1.copy': { zh: '复制口令', en: 'Copy message' },
  'tutorial.s1.generate': {
    zh: '一键生成我的口令',
    en: 'Generate my message',
  },
  'tutorial.s1.generating': { zh: '生成中…', en: 'Generating…' },
  'tutorial.s1.generateHint': {
    zh: '会自动为你创建一个 90 天有效的令牌，只给你自己的 AI 用。',
    en: 'This creates a 90-day token for your own AI only.',
  },
  'tutorial.s1.ready': {
    zh: '口令已生成，复制后进入下一步',
    en: 'Your message is ready — copy it, then continue',
  },
  'tutorial.s1.copyBig': { zh: '复制口令', en: 'Copy message' },
  'tutorial.s1.warn': {
    zh: '口令里的令牌等同于你的登录身份，只发给你自己电脑上的 Codex，不要发到群里。关掉教程后就看不到了——弄丢了回来再生成一个就好。',
    en: 'The token equals your login — send it only to Codex on your own computer, never to a chat. It disappears when you close this guide; just generate a new one if you lose it.',
  },
  'tutorial.s1.error': {
    zh: '生成失败，请重试',
    en: 'Could not generate, please retry',
  },

  'tutorial.s2.tab': { zh: '发给 Codex', en: 'Send to Codex' },
  'tutorial.s2.title': {
    zh: '粘贴给 Codex，它会自己装好',
    en: 'Paste it into Codex — it sets itself up',
  },
  'tutorial.s2.body': {
    zh: 'Codex 会自己修改配置文件、下载并安装操作手册，你只需要在它申请权限时点「允许」。',
    en: 'Codex edits its own config and installs the playbook. You only click Allow when it asks.',
  },
  'tutorial.s2.do1': {
    zh: '打开 Codex，新建一个对话',
    en: 'Open Codex and start a new chat',
  },
  'tutorial.s2.do2': {
    zh: '粘贴口令，按回车发送',
    en: 'Paste the message and press Enter',
  },
  'tutorial.s2.do3': {
    zh: '它申请权限时点「允许」',
    en: 'Click Allow when it asks',
  },
  'tutorial.s2.do4': {
    zh: '完成后完全退出，再重新打开 Codex',
    en: 'Quit and reopen Codex when done',
  },
  'tutorial.s2.pasted': {
    zh: '请帮我把这台电脑上的 Codex 接入「传音储能物料管理系统」……',
    en: 'Please connect Codex on this computer to the Transsion ESS material library…',
  },
  'tutorial.s2.task.config': {
    zh: '写入 config.toml',
    en: 'Write config.toml',
  },
  'tutorial.s2.task.download': {
    zh: '下载 Skill 操作手册',
    en: 'Download the Skill',
  },
  'tutorial.s2.task.unzip': {
    zh: '安装到 skills 目录',
    en: 'Install into skills/',
  },
  'tutorial.s2.permission': {
    zh: 'Codex 请求修改文件',
    en: 'Codex wants to edit files',
  },
  'tutorial.s2.allowed': { zh: '已允许', en: 'Allowed' },
  'tutorial.s2.allow': { zh: '允许', en: 'Allow' },
  'tutorial.s2.deny': { zh: '拒绝', en: 'Deny' },
  'tutorial.s2.done': {
    zh: '全部配置好了！请完全退出并重新打开 Codex。',
    en: 'All set! Please quit and reopen Codex.',
  },
  'tutorial.s2.restart': { zh: '重启 Codex', en: 'Restart Codex' },
  'tutorial.s2.connected': { zh: '物料库已连接', en: 'Library connected' },

  'tutorial.s3.tab': { zh: '开始使用', en: 'Use it' },
  'tutorial.s3.title': {
    zh: '重启后，说一句话就能发布',
    en: 'After restarting, publish with one sentence',
  },
  'tutorial.s3.body': {
    zh: '直接用大白话告诉 Codex 要做什么。它会自己命名、上传、打标记，发布前一定先复述、等你点头。发出去是「预发布」：大家已经能下载，策划及审核人点「审核通过」后转为正式发布。',
    en: 'Just tell Codex what you need. It names, uploads and tags the files, and always recaps and waits for your OK. It goes out as a pre-release — downloadable right away, official once the reviewer approves.',
  },
  'tutorial.s3.ask': {
    zh: '把桌面上的 IPV-1K612U 巴基斯坦英文彩页预发布到物料库',
    en: 'Pre-release the IPV-1K612U Pakistan English leaflet on my desktop',
  },
  'tutorial.s3.upload': { zh: '上传 2 个文件', en: 'Uploading 2 files' },
  'tutorial.s3.confirm': {
    zh: '准备预发布「IPV-1K612U-彩页-EN-PK-V1.0」，审核人：王策划。确认吗？',
    en: 'Ready to pre-release “IPV-1K612U-Leaflet-EN-PK-V1.0”, reviewer: Wang. Go ahead?',
  },
  'tutorial.s3.yes': { zh: '确认', en: 'Yes' },
  'tutorial.s3.result': {
    zh: '已预发布！大家现在就能下载，等王策划审核通过后转正式。',
    en: 'Pre-released! Downloadable now; official once Wang approves.',
  },
  'tutorial.s3.try': {
    zh: '试试这样说（点一下复制）',
    en: 'Try saying (tap to copy)',
  },
  'tutorial.s3.p0': {
    zh: '调用 whoami，看看你能不能认出我',
    en: 'Call whoami and tell me who I am',
  },
  'tutorial.s3.p1': {
    zh: '把桌面上的储能海报预发布到物料库，替换旧版',
    en: 'Pre-release the storage poster on my desktop, replacing the old version',
  },
  'tutorial.s3.p2': {
    zh: '帮我找最新的逆变器白底图，下载到「下载」文件夹',
    en: 'Find the latest inverter white-background renders and download them',
  },
  'tutorial.s3.p3': {
    zh: '我现在有哪些物料待办？',
    en: 'What material to-dos do I have?',
  },
};
