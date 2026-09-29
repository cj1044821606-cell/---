import { crc32, createZip } from "./zip";
import { buildSkillFiles, buildSkillZip, SKILL_NAME } from "./skill-kit";
import { buildUploadCommands } from "./upload-commands";

describe("createZip", () => {
  it("computes standard CRC-32", () => {
    expect(crc32(Buffer.from("hello"))).toBe(0x3610a686);
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });

  it("writes local headers, a central directory and the end record", () => {
    const zip = createZip([
      { path: "a/SKILL.md", content: "中文内容" },
      { path: "a/b.txt", content: Buffer.from("xyz") },
    ]);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 10)).toBe(2);
    const centralOffset = zip.readUInt32LE(eocd + 16);
    expect(zip.readUInt32LE(centralOffset)).toBe(0x02014b50);
    // 第一个条目的文件名与内容按 UTF-8 原样存储
    const nameLength = zip.readUInt16LE(26);
    expect(zip.subarray(30, 30 + nameLength).toString("utf8")).toBe("a/SKILL.md");
    const size = zip.readUInt32LE(18);
    expect(
      zip.subarray(30 + nameLength, 30 + nameLength + size).toString("utf8"),
    ).toBe("中文内容");
  });
});

describe("skill kit", () => {
  it("embeds the server URL and the MCP server name in a valid SKILL.md", () => {
    const files = buildSkillFiles({ baseUrl: "https://materials.example.com" });
    const skill = String(files.find((f) => f.path.endsWith("SKILL.md"))?.content);
    expect(skill.startsWith(`---\nname: ${SKILL_NAME}\ndescription: `)).toBe(true);
    expect(skill).toContain("https://materials.example.com");
    expect(skill).toContain("transsion-ess-materials");
    expect(files.map((f) => f.path)).toContain(`${SKILL_NAME}/reference/naming.md`);
    expect(buildSkillZip({ baseUrl: "https://x" }).readUInt32LE(0)).toBe(0x04034b50);
  });
});

describe("buildUploadCommands", () => {
  it("uses a single PUT for one-chunk files and quotes paths safely", () => {
    const commands = buildUploadCommands({
      uploadUrl: "https://h/api/agent/uploads/t.s",
      localPath: "/Users/al'an/My File.pdf",
      chunkSize: 32,
      chunkCount: 1,
    });
    expect(commands.bash).toBe(
      "curl -fsS -T '/Users/al'\\''an/My File.pdf' 'https://h/api/agent/uploads/t.s'",
    );
    expect(commands.powershell).toBe(
      "curl.exe -fsS -T '/Users/al''an/My File.pdf' 'https://h/api/agent/uploads/t.s'",
    );
  });

  it("loops over chunks with X-Chunk-Index for large files", () => {
    const commands = buildUploadCommands({
      uploadUrl: "https://h/u",
      localPath: "C:\\Work\\video.mp4",
      chunkSize: 1024,
      chunkCount: 3,
    });
    expect(commands.bash).toContain("cs=1024; n=3");
    expect(commands.bash).toContain('X-Chunk-Index: $i');
    expect(commands.powershell).toContain("$cs = 1024; $n = 3");
    expect(commands.powershell).toContain("'X-Chunk-Index' = \"$i\"");
  });
});
