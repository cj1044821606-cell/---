/**
 * 生成 AI 助手可直接执行的上传命令。
 * - 小文件：一条 curl -T（PUT 原始字节，避免 --data-binary 默认的表单类型）；
 * - 大文件：按固定分片大小循环 PUT，每片带 X-Chunk-Index，服务端收齐后自动组装。
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

function bashQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function psQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildUploadCommands(input: UploadCommandInput): UploadCommands {
  const { uploadUrl, localPath, chunkSize, chunkCount } = input;
  if (chunkCount <= 1) {
    return {
      bash: `curl -fsS -T ${bashQuote(localPath)} ${bashQuote(uploadUrl)}`,
      powershell: `curl.exe -fsS -T ${psQuote(localPath)} ${psQuote(uploadUrl)}`,
    };
  }
  const bash = [
    `f=${bashQuote(localPath)}; u=${bashQuote(uploadUrl)}; cs=${chunkSize}; n=${chunkCount}`,
    `for i in $(seq 0 $((n-1))); do`,
    `  dd if="$f" bs=$cs skip=$i count=1 2>/dev/null | curl -fsS -X PUT -H 'Content-Type: application/octet-stream' -H "X-Chunk-Index: $i" --data-binary @- "$u" || exit 1`,
    `  echo`,
    `done`,
  ].join("\n");
  const powershell = [
    `$f = ${psQuote(localPath)}; $u = ${psQuote(uploadUrl)}; $cs = ${chunkSize}; $n = ${chunkCount}`,
    `$fs = [IO.File]::OpenRead($f); $buf = New-Object byte[] $cs`,
    `try { for ($i = 0; $i -lt $n; $i++) {`,
    `  $len = 0; while ($len -lt $cs) { $r = $fs.Read($buf, $len, $cs - $len); if ($r -le 0) { break }; $len += $r }`,
    `  $body = New-Object byte[] $len; [Array]::Copy($buf, $body, $len)`,
    `  (Invoke-WebRequest -UseBasicParsing -Method Put -Uri $u -ContentType 'application/octet-stream' -Headers @{ 'X-Chunk-Index' = "$i" } -Body $body).Content`,
    `} } finally { $fs.Close() }`,
  ].join("\n");
  return { bash, powershell };
}
