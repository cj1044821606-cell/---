/**
 * 生成 AI 助手可直接执行的上传命令。
 * - 小文件：一条 curl -T（PUT 原始字节，避免 --data-binary 默认的表单类型），失败自动重试；
 * - 大文件：按固定分片大小循环 PUT，每片带 X-Chunk-Index，单片失败重试 3 次，服务端收齐后自动组装；
 *   同一分片重复提交是幂等的，所以整条命令重跑也安全。
 * Windows PowerShell 里 curl 是 Invoke-WebRequest 的别名，所以明确写 curl.exe。
 */
export interface UploadCommandInput {
  uploadUrl: string;
  localPath: string;
  chunkSize: number;
  chunkCount: number;
}

export interface UploadCommands {
  /** macOS / Linux / Git Bash */
  bash: string;
  /** Windows PowerShell 5.1+ */
  powershell: string;
}

const RETRIES = 3;

function bashQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function psQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildUploadCommands(input: UploadCommandInput): UploadCommands {
  const { uploadUrl, localPath, chunkSize, chunkCount } = input;
  if (chunkCount <= 1) {
    // 不用 --retry-all-errors：老版本 curl（Win10 早期、Ubuntu 20.04）不认识这个参数
    return {
      bash: [
        `ok=0; for t in $(seq 1 ${RETRIES}); do`,
        `  curl -fsS -T ${bashQuote(localPath)} ${bashQuote(uploadUrl)} && { ok=1; break; }`,
        `  sleep 2`,
        `done`,
        `[ "$ok" = 1 ] || exit 1`,
        `echo`,
      ].join("\n"),
      powershell: [
        `for ($t = 1; $t -le ${RETRIES}; $t++) {`,
        `  curl.exe -fsS -T ${psQuote(localPath)} ${psQuote(uploadUrl)}`,
        `  if ($LASTEXITCODE -eq 0) { break }`,
        `  if ($t -eq ${RETRIES}) { throw 'upload failed' }`,
        `  Start-Sleep -Seconds 2`,
        `}`,
      ].join("\n"),
    };
  }
  // 管道里的分片无法被 curl 自己重放，所以在外层按分片重试
  const bash = [
    `f=${bashQuote(localPath)}; u=${bashQuote(uploadUrl)}; cs=${chunkSize}; n=${chunkCount}`,
    `for i in $(seq 0 $((n-1))); do`,
    `  ok=0; for t in $(seq 1 ${RETRIES}); do`,
    `    dd if="$f" bs=$cs skip=$i count=1 2>/dev/null | curl -fsS -X PUT -H 'Content-Type: application/octet-stream' -H "X-Chunk-Index: $i" --data-binary @- "$u" && { ok=1; break; }`,
    `    sleep 2`,
    `  done`,
    `  [ "$ok" = 1 ] || { echo "chunk $i failed" >&2; exit 1; }`,
    `  echo`,
    `done`,
  ].join("\n");
  const powershell = [
    `$f = ${psQuote(localPath)}; $u = ${psQuote(uploadUrl)}; $cs = ${chunkSize}; $n = ${chunkCount}`,
    `$fs = [IO.File]::OpenRead($f); $buf = New-Object byte[] $cs`,
    `try { for ($i = 0; $i -lt $n; $i++) {`,
    `  [void]$fs.Seek([int64]$i * $cs, 'Begin'); $len = 0; while ($len -lt $cs) { $r = $fs.Read($buf, $len, $cs - $len); if ($r -le 0) { break }; $len += $r }`,
    `  $body = New-Object byte[] $len; [Array]::Copy($buf, $body, $len)`,
    `  for ($t = 1; $t -le ${RETRIES}; $t++) {`,
    `    try { (Invoke-WebRequest -UseBasicParsing -Method Put -Uri $u -ContentType 'application/octet-stream' -Headers @{ 'X-Chunk-Index' = "$i" } -Body $body).Content; break }`,
    `    catch { if ($t -eq ${RETRIES}) { throw }; Start-Sleep -Seconds 2 }`,
    `  }`,
    `} } finally { $fs.Close() }`,
  ].join("\n");
  return { bash, powershell };
}

/**
 * 把多个文件的上传命令合成一段脚本：用户只需批准执行一次，
 * 任一文件失败立即停止并打印是哪个文件。
 */
export function combineUploadCommands(
  items: Array<{ label: string; commands: UploadCommands }>,
): UploadCommands {
  const bash = items
    .map(
      ({ label, commands }) =>
        `echo ${bashQuote(`>>> ${label}`)}\n(\n${commands.bash}\n) || { echo ${bashQuote(`FAILED: ${label}`)} >&2; exit 1; }`,
    )
    .concat(`echo 'ALL UPLOADS SENT'`)
    .join("\n");
  const powershell = [
    `$ErrorActionPreference = 'Stop'`,
    ...items.map(
      ({ label, commands }) =>
        `Write-Output ${psQuote(`>>> ${label}`)}\n& {\n${commands.powershell}\n}`,
    ),
    `Write-Output 'ALL UPLOADS SENT'`,
  ].join("\n");
  return { bash, powershell };
}
