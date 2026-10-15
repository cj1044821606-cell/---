// Run with --apply only after reviewing the generated before/after snapshots.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';

const base = process.env.FEISHU_BASE_APP_TOKEN || 'DPCCbp65waiDtys1JfucMKm8nTe';
const cli = process.env.LARK_CLI || 'lark-cli';
const dir = path.resolve('backups', `pool-sync-${Date.now()}`);
mkdirSync(dir, { recursive: true });
function call(command, args) {
  const result = JSON.parse(execFileSync(cli, ['base', command, '--base-token', base, '--as', 'user', ...args], { encoding: 'utf8' }));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.data;
}
function normalizedSteps(steps) {
  const normalized = JSON.parse(JSON.stringify(steps, (key, value) =>
    key === 'right_value' && Array.isArray(value) && value.length === 0 ? undefined : value));
  return normalized.sort((a, b) => a.id.localeCompare(b.id));
}
for (const id of ['wkfrmtwY3FqF7PDn', 'wkfNjlSlepedWFFm']) {
  const before = call('+workflow-get', ['--workflow-id', id]);
  const after = { title: before.title, steps: structuredClone(before.steps) };
  const trigger = after.steps[0];
  if (trigger.data.table_name !== '物料资产主表' || after.steps.length > 3) throw new Error('Unexpected workflow shape');
  if (trigger.type === 'ChangeRecordTrigger') {
    for (const group of trigger.data.condition_list) {
      if (group.conjunction !== 'and') throw new Error('Expected AND condition group');
      if (!group.conditions.some(c => c.field_name === '关联处理池' && c.operator === 'isNotEmpty')) {
        group.conditions.push({ field_name: '关联处理池', operator: 'isNotEmpty', value: [] });
      }
    }
  } else if (trigger.type === 'ButtonTrigger') {
    if (!after.steps.some(s => s.id === 'guardPoolAssociation')) {
      after.steps.push({
        id: 'guardPoolAssociation', type: 'IfElseBranch', title: '仅同步有关联处理池的物料',
        children: { links: [{ kind: 'if_true', to: trigger.next }, { kind: 'if_false', to: '' }] },
        data: { condition: { conjunction: 'or', conditions: [{ conjunction: 'and', conditions: [{
          left_value: { value_type: 'ref', value: `$.${trigger.id}.fldHcBBjcX`, extra_info: { table_name: '物料资产主表' } },
          operator: 'isNotEmpty', right_value: [],
        }] }] } },
      });
      trigger.next = 'guardPoolAssociation';
    }
  } else throw new Error('Unexpected trigger');
  writeFileSync(path.join(dir, `${id}-before.json`), JSON.stringify(before, null, 2));
  const file = path.join(dir, `${id}-after.json`);
  writeFileSync(file, JSON.stringify(after, null, 2));
  if (process.argv.includes('--apply')) {
    if (isDeepStrictEqual(normalizedSteps(before.steps), normalizedSteps(after.steps))) {
      console.log(`${id}: guard already present; no write`);
      continue;
    }
    const fresh = call('+workflow-get', ['--workflow-id', id]);
    if (!isDeepStrictEqual(fresh, before)) throw new Error('Workflow changed during review');
    call('+workflow-update', ['--workflow-id', id, '--json', `@${path.relative(process.cwd(), file)}`]);
    const saved = call('+workflow-get', ['--workflow-id', id]);
    writeFileSync(path.join(dir, `${id}-readback.json`), JSON.stringify(saved, null, 2));
    if (!isDeepStrictEqual(normalizedSteps(saved.steps), normalizedSteps(after.steps)) || saved.status !== before.status) throw new Error('Readback differs; inspect snapshots');
    console.log(`${id}: updated and read back; ${saved.status}`);
  } else console.log(`${id}: preview saved to ${file}`);
}
