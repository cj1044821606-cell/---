import { mergeCloudChannels, parseCloudFiles } from './cloud-files.util';
import type { DeliverableFile } from '@shared/files';

describe('cloud delivery channels', () => {
  const file: DeliverableFile = {
    kind: 'M',
    fileName: 'Logo-RGB.pdf',
    delivery: 'direct',
    url: '/download',
    previewUrl: null,
    mimeType: null,
    sizeBytes: null,
  };
  it('preserves mention names and tokens, rejecting non-Feishu links', () => {
    expect(
      parseCloudFiles([
        {
          type: 'mention',
          text: file.fileName,
          link: 'https://transsioner.feishu.cn/file/box',
          token: 'box',
        },
        { link: 'https://evil.example/' },
      ]),
    ).toEqual([
      {
        fileName: file.fileName,
        link: 'https://transsioner.feishu.cn/file/box',
        fileToken: 'box',
      },
    ]);
  });
  it('groups matching names without conflating RGB and CMYK', () => {
    const refs = parseCloudFiles([
      { text: 'Logo-RGB.pdf', link: 'https://transsioner.feishu.cn/file/rgb' },
      {
        text: 'Logo-CMYK.pdf',
        link: 'https://transsioner.feishu.cn/file/cmyk',
      },
    ]);
    const files = mergeCloudChannels([file], refs);
    expect(files).toHaveLength(2);
    expect(files[0].cloudCopyUrl).toContain('/rgb');
    expect(files[1].fileName).toBe('Logo-CMYK.pdf');
    expect(file.cloudCopyUrl).toBeUndefined();
  });
  it('does not guess matches for ambiguous same-name attachments', () => {
    const refs = parseCloudFiles([
      { text: file.fileName, link: 'https://transsioner.feishu.cn/file/a' },
    ]);
    expect(
      mergeCloudChannels([file, { ...file, url: '/other' }], refs),
    ).toHaveLength(3);
  });
});
