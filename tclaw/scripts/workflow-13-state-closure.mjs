#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const BASE_TOKEN = "DPCCbp65waiDtys1JfucMKm8nTe";
const WORKFLOW_ID = "wkfT3F7miVt4684k";
/**
 * lark-cli 路径：优先 LARK_CLI 环境变量，其次 TClaw VM 的持久化安装位置
 * （见 tclaw/AGENTS.md 8.3 与 scripts/bootstrap/ensure_lark_cli.sh），最后回退到 PATH 中的 lark-cli。
 */
const PERSISTENT_LARK_CLI = "/home/node/.openclaw/npm-global/bin/lark-cli";
const LARK_CLI =
  process.env.LARK_CLI ??
  (existsSync(PERSISTENT_LARK_CLI) ? PERSISTENT_LARK_CLI : "lark-cli");
const APPLY = process.argv.includes("--apply");
const BACKUP_PATH = "/tmp/ai-material-workflow-13-before-state-closure.json";

function run(args) {
  const output = execFileSync(LARK_CLI, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const envelope = JSON.parse(output);
  if (!envelope.ok) {
    throw new Error(envelope.error?.message ?? "lark-cli request failed");
  }
  return envelope.data;
}

function getWorkflow() {
  return run([
    "base",
    "+workflow-get",
    "--base-token",
    BASE_TOKEN,
    "--workflow-id",
    WORKFLOW_ID,
    "--user-id-type",
    "open_id",
    "--as",
    "bot",
  ]);
}

function updateWorkflow(payload, dryRun = false) {
  const args = [
    "base",
    "+workflow-update",
    "--base-token",
    BASE_TOKEN,
    "--workflow-id",
    WORKFLOW_ID,
    "--json",
    JSON.stringify(payload),
    "--as",
    "bot",
  ];
  if (dryRun) args.push("--dry-run");
  return run(args);
}

function normalizedStep(step) {
  if (step.children?.links?.length > 0) return structuredClone(step);
  const { children: _children, ...rest } = step;
  return structuredClone(rest);
}

function findStep(steps, id, type) {
  const step = steps.find((candidate) => candidate.id === id);
  if (!step || step.type !== type) {
    throw new Error(`Workflow 13 changed unexpectedly: ${id}/${type}`);
  }
  return step;
}

function receiveUpdateStep(id, title, fieldName) {
  return {
    id,
    type: "SetRecordAction",
    title,
    next: null,
    data: {
      table_name: "领取下载记录表",
      max_set_record_num: 100,
      field_values: [
        {
          field_name: fieldName,
          value: [{ value_type: "boolean", value: true }],
        },
      ],
      filter_info: {
        conjunction: "and",
        conditions: [
          {
            field_name: "物料",
            operator: "is",
            value: [
              {
                value_type: "ref",
                value: "$.trig1xw3ZBCS.record",
              },
            ],
          },
        ],
      },
      ref_info: null,
    },
  };
}

/**
 * workflow-update 需要 client_token/title/status/steps 全量 body（tclaw/AGENTS.md 第 4 节）。
 * 沿用当前工作流的元数据，只替换 steps；workflow-get 未返回的字段不凭空构造。
 */
function workflowMeta(current) {
  return {
    ...(current.client_token ? { client_token: current.client_token } : {}),
    title: current.title,
    ...(current.status ? { status: current.status } : {}),
  };
}

function buildPayload(current) {
  if (current.title !== "13 旧版本下架流程") {
    throw new Error(`Unexpected workflow title: ${current.title}`);
  }
  const steps = current.steps.map(normalizedStep);
  const versionUpdate = findStep(steps, "actEWTaONo1", "SetRecordAction");
  const findReplacement = findStep(steps, "actG9PyWV6R", "FindRecordAction");
  findStep(steps, "branchBig13", "IfElseBranch");
  const sendLinks = findStep(steps, "sendLinks13", "LarkMessageAction");
  const sendFiles = findStep(steps, "act9Np5tK01", "LarkMessageAction");

  const addedIds = [
    "markReplaced13",
    "markNotifiedLinks13",
    "markNotifiedFiles13",
  ];
  const withoutPreviousClosure = steps.filter(
    (step) => !addedIds.includes(step.id),
  );

  versionUpdate.next = "markReplaced13";
  sendLinks.next = "markNotifiedLinks13";
  sendFiles.next = "markNotifiedFiles13";

  const markReplaced = receiveUpdateStep(
    "markReplaced13",
    "标记领取记录已被新版替代",
    "是否已被新版替代",
  );
  markReplaced.next = findReplacement.id;

  return {
    ...workflowMeta(current),
    steps: [
      ...withoutPreviousClosure,
      markReplaced,
      receiveUpdateStep(
        "markNotifiedLinks13",
        "云盘链接通知成功后标记已通知",
        "是否已通知",
      ),
      receiveUpdateStep(
        "markNotifiedFiles13",
        "附件通知成功后标记已通知",
        "是否已通知",
      ),
    ],
  };
}

const current = getWorkflow();
const originalPayload = {
  ...workflowMeta(current),
  steps: current.steps.map(normalizedStep),
};
const payload = buildPayload(current);
writeFileSync(BACKUP_PATH, `${JSON.stringify(originalPayload, null, 2)}\n`);

if (!APPLY) {
  const preview = updateWorkflow(payload, true);
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        workflowId: WORKFLOW_ID,
        backupPath: BACKUP_PATH,
        requestCount: preview.api?.length ?? 0,
        stepCount: payload.steps.length,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

try {
  updateWorkflow(payload);
  const verified = getWorkflow();
  const verifiedSteps = verified.steps ?? [];
  for (const [id, type] of [
    ["markReplaced13", "SetRecordAction"],
    ["markNotifiedLinks13", "SetRecordAction"],
    ["markNotifiedFiles13", "SetRecordAction"],
  ]) {
    findStep(verifiedSteps, id, type);
  }
  if (verified.status !== "enabled") {
    throw new Error(`Workflow status changed to ${verified.status}`);
  }
  console.log(
    JSON.stringify(
      {
        mode: "applied",
        workflowId: verified.workflow_id,
        status: verified.status,
        updateTime: verified.update_time,
        stepCount: verifiedSteps.length,
        backupPath: BACKUP_PATH,
      },
      null,
      2,
    ),
  );
} catch (error) {
  try {
    updateWorkflow(originalPayload);
  } catch (rollbackError) {
    console.error(`Rollback failed: ${rollbackError.message}`);
  }
  throw error;
}
