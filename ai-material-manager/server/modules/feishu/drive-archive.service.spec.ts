import { DriveArchiveService } from './drive-archive.service';
import { ConfigService } from '@nestjs/config';
import { encodeAttachmentLocator } from '@server/common/utils/attachment-locator.util';
import { parseCloudFiles } from '@server/modules/files/cloud-files.util';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

const locator = encodeAttachmentLocator({
  fileToken: 'original',
  fileName: 'Detail.pdf',
});
function fixture(folder = 'folder') {
  const row = {
    baseRecordId: 'rec1',
    currentValidAttachment: [locator],
    cloudFilesM: [] as ReturnType<typeof parseCloudFiles>,
  };
  const base = {
    rows: jest.fn(async () => [row]),
    rowById: jest.fn(async () => row),
    updateRecord: jest.fn(async (_table, _id, fields) => {
      row.cloudFilesM = parseCloudFiles(fields['云盘链接M']);
    }),
  };
  const service = new DriveArchiveService(
    base as never,
    {} as never,
    new ConfigService({ FEISHU_DRIVE_FOLDER_TOKEN: folder }),
    {
      resolve: async () => ({
        token: folder,
        path: 'Product/Model/Details',
        needsClassification: false,
      }),
    } as never,
  );
  const copy = jest
    .spyOn(service as any, 'copy')
    .mockResolvedValue('https://transsioner.feishu.cn/file/copy');
  jest.spyOn(service as any, 'persist').mockResolvedValue(undefined);
  return { service, base, row, copy };
}
describe('Drive archive reconciliation', () => {
  it('accepts the SDK null part response and removes its temporary file', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'drive-archive-'));
    await fs.mkdir(path.join(dir, 'drive-archive'));
    const file = {
      uploadPrepare: jest.fn(async () => ({
        code: 0,
        data: { upload_id: 'up', block_size: 4 * 1024 * 1024, block_num: 1 },
      })),
      uploadPart: jest.fn(async () => null),
      uploadFinish: jest.fn(async () => ({
        code: 0,
        data: { file_token: 'copy' },
      })),
    };
    const service = new DriveArchiveService(
      {} as never,
      {
        getTenantAccessToken: async () => 'test',
        client: { drive: { file } },
      } as never,
      new ConfigService({
        UPLOAD_DIR: dir,
        FEISHU_DRIVE_FOLDER_TOKEN: 'folder',
      }),
      {} as never,
    );
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    try {
      await expect(
        (service as any).copy('original', 'preview.jpg', 3),
      ).resolves.toBe('https://transsioner.feishu.cn/file/copy');
      expect(file.uploadPart.mock.calls[0]).toBeDefined();
      expect(await fs.readdir(path.join(dir, 'drive-archive'))).toEqual([]);
    } finally {
      fetchMock.mockRestore();
    }
  });
  it('creates a copy and reads back its named link, without reuploading on another scan', async () => {
    const { service, base, copy, row } = fixture();
    await service.reconcile();
    expect(row.cloudFilesM[0].fileName).toBe('Detail.pdf');
    expect(base.rowById).toHaveBeenCalledTimes(2);
    await service.reconcile();
    expect(copy).toHaveBeenCalledTimes(1);
    expect(service.status(locator, row.cloudFilesM[0].link)).toBe('complete');
  });
  it('reuses the uploaded copy after a Base write failure', async () => {
    const { service, base, copy } = fixture();
    base.updateRecord.mockRejectedValueOnce(new Error('Base unavailable'));
    await service.reconcile();
    expect(service.status(locator)).toBe('retrying');
    (service as any).entries.original.retryAt = 0;
    await service.reconcile();
    expect(copy).toHaveBeenCalledTimes(1);
    expect(base.updateRecord).toHaveBeenCalledTimes(2);
  });
  it('does not write an old attachment link into a record changed during upload', async () => {
    const { service, base, copy, row } = fixture();
    copy.mockImplementation(async () => {
      row.currentValidAttachment = [];
      return 'https://transsioner.feishu.cn/file/old';
    });
    await service.reconcile();
    expect(base.updateRecord).not.toHaveBeenCalled();
  });
  it('does not start a copy when the destination is unconfigured', async () => {
    const { service, copy } = fixture('');
    await service.reconcile();
    expect(copy).not.toHaveBeenCalled();
    expect(service.status(locator)).toBe('unconfigured');
  });
});
