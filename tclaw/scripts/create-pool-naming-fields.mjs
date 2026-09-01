#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const BASE_TOKEN = "DPCCbp65waiDtys1JfucMKm8nTe";
const TABLE_ID = "tblcAERSb9EKbx5W";
const LARK_CLI = process.env.LARK_CLI ?? "/Users/jun.cao/.local/bin/lark-cli";
const APPLY = process.argv.includes("--apply");

const definitions = [
  {
    type: "select",
    name: "命名模式",
    multiple: false,
    description: "AI 自动识别，或由用户提供结构化命名信息后交给 AI 校验。",
    options: [
      { name: "AI 自动识别", hue: "Blue", lightness: "Lighter" },
      { name: "我提供命名信息", hue: "Green", lightness: "Lighter" },
    ],
  },
  {
    type: "select",
    name: "用户提供·物料大类",
    multiple: false,
    options: [
      { name: "产品物料", hue: "Blue", lightness: "Lighter" },
      { name: "品牌物料", hue: "Purple", lightness: "Lighter" },
      { name: "展会物料", hue: "Orange", lightness: "Lighter" },
    ],
  },
  { type: "text", name: "用户提供·产品型号" },
  {
    type: "select",
    name: "用户提供·物料类型",
    multiple: false,
    options: [
      "Folder 折页",
      "Flyer 单页",
      "Datasheet 数据表",
      "DetailPage 详情页/长图",
      "KV 主视觉",
      "Manual 说明书",
      "USP 卖点文档",
      "ProductVideo 产品视频",
      "InstallVideo 安装视频",
      "Photo 产品图/场景图",
      "IDImage ID白底图",
      "Packaging 包装设计",
      "Social 社媒/一图读懂",
      "Brochure 画册",
      "Logo 品牌Logo",
      "VI 品牌视觉",
      "Poster 海报",
      "PPT 演示",
      "Training 培训",
    ].map((name) => ({ name, hue: "Wathet", lightness: "Lighter" })),
  },
  {
    type: "select",
    name: "用户提供·语言",
    multiple: false,
    options: ["EN", "CN", "FR", "AR", "ES", "全语言通用"].map(
      (name) => ({ name, hue: "Turquoise", lightness: "Lighter" }),
    ),
  },
  {
    type: "text",
    name: "用户提供·主区域",
    description: "填写市场码，如 PK、NG；Global 或总部物料留空。",
  },
  {
    type: "text",
    name: "用户提供·版本号",
    description: "格式 V主.次，例如 V1.0。",
  },
  {
    type: "text",
    name: "用户提供·品牌或展会名",
    description: "品牌 Logo 填品牌名；展会物料填展会简称。",
  },
  {
    type: "number",
    name: "用户提供·展会年份",
    style: {
      type: "plain",
      precision: 0,
      percentage: false,
      thousands_separator: false,
    },
  },
  {
    type: "text",
    name: "用户提供·命名预览",
    description: "前端和后端按规则生成的预览，最终结果仍须经 TClaw 校验与查重。",
  },
];

function run(args) {
  const envelope = JSON.parse(
    execFileSync(LARK_CLI, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  if (!envelope.ok) {
    throw new Error(envelope.error?.message ?? "lark-cli request failed");
  }
  return envelope.data;
}

function listFields() {
  return run([
    "base",
    "+field-list",
    "--base-token",
    BASE_TOKEN,
    "--table-id",
    TABLE_ID,
    "--offset",
    "0",
    "--limit",
    "100",
    "--as",
    "bot",
  ]).fields;
}

const existing = new Set(listFields().map((field) => field.name));
const missing = definitions.filter((field) => !existing.has(field.name));

if (!APPLY) {
  console.log(
    JSON.stringify(
      { mode: "dry-run", missing: missing.map((field) => field.name) },
      null,
      2,
    ),
  );
  process.exit(0);
}

const created = [];
for (const definition of missing) {
  const result = run([
    "base",
    "+field-create",
    "--base-token",
    BASE_TOKEN,
    "--table-id",
    TABLE_ID,
    "--json",
    JSON.stringify(definition),
    "--as",
    "bot",
  ]);
  created.push({ id: result.field.id, name: result.field.name });
}

const verified = listFields()
  .filter((field) => definitions.some((definition) => definition.name === field.name))
  .map((field) => ({ id: field.id, name: field.name, type: field.type }));

if (verified.length !== definitions.length) {
  throw new Error(
    `Naming field verification failed: expected ${definitions.length}, got ${verified.length}`,
  );
}

console.log(JSON.stringify({ mode: "applied", created, verified }, null, 2));
