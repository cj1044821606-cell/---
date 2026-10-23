import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';

// Scoped acceptance: never scans or changes unrelated material records.
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
const require = createRequire(import.meta.url);
const { ConfigService } = require('@nestjs/config');
const {
  FeishuService,
} = require('../dist/server/modules/feishu/feishu.service');
const {
  FeishuBaseGateway,
} = require('../dist/server/modules/feishu/feishu-base.gateway');
const {
  DriveArchiveRouter,
} = require('../dist/server/modules/feishu/drive-archive-router');
const {
  DriveArchiveService,
} = require('../dist/server/modules/feishu/drive-archive.service');
const {
  decodeAttachmentLocator,
} = require('../dist/server/common/utils/attachment-locator.util');
const args = process.argv.slice(2);
const {
  serializeCloudFiles,
} = require('../dist/server/modules/files/cloud-files.util');
const arg = (key) => args[args.indexOf(key) + 1];
const id = args.includes('--material') ? arg('--material') : '';
const tier = args.includes('--kind') ? arg('--kind') : '';
const root = args.includes('--root') ? arg('--root') : '';
if (
  !/^rec\w+$/.test(id) ||
  !['M', 'L', 'S'].includes(tier) ||
  !/^[a-zA-Z0-9]+$/.test(root)
)
  throw new Error(
    'Required: --material recID --kind M|L|S --root folderToken [--apply]',
  );
const config = new ConfigService({
  ...process.env,
  FEISHU_DRIVE_FOLDER_TOKEN: root,
  DRIVE_ARCHIVE_AUTOSTART: 'false',
});
const feishu = new FeishuService(config);
const base = new FeishuBaseGateway(feishu, config);
const original = await base.rowById('main', id, { force: true });
const keys = {
  M: 'currentValidAttachment',
  L: 'sourceFileL',
  S: 'previewFileS',
};
const scoped = {
  ...original,
  currentValidAttachment: [],
  sourceFileL: [],
  previewFileS: [],
  [keys[tier]]: original[keys[tier]],
};
const router = new DriveArchiveRouter(feishu);
if (!(scoped[keys[tier]] ?? []).length)
  throw new Error('No attachments in the requested tier');
// Dry-run routing cannot create a pending-classification folder.
if (!args.includes('--apply'))
  feishu.client.drive.file.createFolder = async () => {
    throw new Error(
      'Unclassified destination: dry run does not create folders',
    );
  };
for (const value of scoped[keys[tier]] ?? []) {
  const file = decodeAttachmentLocator(value);
  console.log(
    JSON.stringify({
      material: id,
      kind: tier,
      file: file?.fileName,
      destination: await router.resolve(root, original, file.fileName),
    }),
  );
}
if (args.includes('--apply')) {
  const dir = path.join(
    config.get('UPLOAD_DIR') ?? 'var/uploads',
    'drive-archive',
  );
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, `before-${id}-${tier}-${Date.now()}.json`),
    JSON.stringify(original),
    { mode: 0o600 },
  );
  const archive = new DriveArchiveService(
    {
      rows: async () => [scoped],
      rowById: (...params) => base.rowById(...params),
      updateRecord: (...params) => base.updateRecord(...params),
    },
    feishu,
    config,
    router,
  );
  await archive.onModuleInit();
  await archive.reconcile();
  archive.onModuleDestroy();
  let after = await base.rowById('main', id, { force: true });
  if (
    args.includes('--normalize-links') &&
    after['cloudFiles' + tier]?.length
  ) {
    await base.updateRecord('main', id, {
      ['云盘链接' + tier]: serializeCloudFiles(after['cloudFiles' + tier]),
    });
    after = await base.rowById('main', id, { force: true });
  }
  console.log(
    JSON.stringify({
      material: id,
      kind: tier,
      links: after['cloudFiles' + tier],
    }),
  );
  const refs = after['cloudFiles' + tier] ?? [];
  for (const value of scoped[keys[tier]] ?? []) {
    const originalFile = decodeAttachmentLocator(value);
    const matches = refs.filter(
      (ref) => ref.fileName === originalFile.fileName,
    );
    if (matches.length !== 1)
      throw new Error(
        'Archive incomplete or ambiguous: ' + originalFile.fileName,
      );
    if (args.includes('--verify')) {
      const digest = async (stream) => {
        const hash = createHash('sha256');
        let bytes = 0;
        for await (const chunk of stream) {
          bytes += chunk.length;
          hash.update(chunk);
        }
        return { bytes, sha256: hash.digest('hex') };
      };
      const tenant = await feishu.getTenantAccessToken();
      const source = await fetch(
        'https://open.feishu.cn/open-apis/drive/v1/medias/' +
          encodeURIComponent(originalFile.fileToken) +
          '/download',
        {
          headers: { Authorization: 'Bearer ' + tenant },
          signal: AbortSignal.timeout(900_000),
        },
      );
      if (!source.ok || !source.body)
        throw new Error('Original readback failed');
      const originalHash = await digest(source.body);
      const copyToken = new URL(matches[0].link).pathname.split('/').pop();
      const cloud = await feishu.client.drive.file.download({
        path: { file_token: copyToken },
      });
      const copyHash = await digest(cloud.getReadableStream());
      if (JSON.stringify(originalHash) !== JSON.stringify(copyHash))
        throw new Error('Cloud copy hash mismatch');
      console.log(
        JSON.stringify({
          fileName: originalFile.fileName,
          verified: true,
          ...copyHash,
        }),
      );
    }
  }
}
