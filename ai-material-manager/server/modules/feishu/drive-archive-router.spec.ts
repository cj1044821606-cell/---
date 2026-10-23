import { DriveArchiveRouter, matchesModel } from './drive-archive-router';

function fixture() {
  const folders: Record<
    string,
    Array<{ name: string; token: string; type: string }>
  > = {
    root: [
      { name: 'Product (产品)', token: 'products', type: 'folder' },
      { name: 'Brand (品牌)', token: 'brand', type: 'folder' },
    ],
    products: [{ name: 'Hybrid Inverter', token: 'hybrid', type: 'folder' }],
    hybrid: [
      {
        name: 'IPV-4K24T & IPV-6K648T & IPV-8K48T & IPV-10K48T & IPV-11K48T',
        token: 'series',
        type: 'folder',
      },
    ],
    series: [
      {
        name: 'Product Detail Page (产品详情页/产品介绍长图)',
        token: 'details',
        type: 'folder',
      },
    ],
    brand: [
      { name: 'Brand Logo (品牌logo文件)', token: 'logos', type: 'folder' },
    ],
    logos: [
      { name: 'CMYK_itel energy logo', token: 'cmyk', type: 'folder' },
      { name: 'RGB_itel energy logo', token: 'rgb', type: 'folder' },
    ],
  };
  const create = jest.fn(async ({ data }) => ({
    code: 0,
    data: { token: data.folder_token + '-' + data.name },
  }));
  const list = jest.fn(async ({ params }) => ({
    code: 0,
    data: { files: folders[params.folder_token] ?? [], has_more: false },
  }));
  return {
    router: new DriveArchiveRouter({
      client: { drive: { file: { list, createFolder: create } } },
    } as never),
    create,
    folders,
  };
}
describe('Drive library folder rules', () => {
  it('normalizes full-width ranges and preserves exact model boundaries', () => {
    expect(matchesModel('IGT-40～350KT-G1', 'IGT-40~350KT-G1')).toBe(true);
    expect(matchesModel('IPV-8K48T(IP54 8kW 自研)', 'IPV-8K48T')).toBe(true);
    expect(matchesModel('IPV-8K48T Pro', 'IPV-8K48T')).toBe(false);
  });
  it('uses the actual Hybrid folder for the confirmed IPV range alias', async () => {
    const { router, create } = fixture();
    const result = await router.resolve(
      'root',
      {
        productModel: 'IPV-4~11K',
        productOrBrandMaterial: '产品物料',
        materialType: 'DetailPage 详情页/长图',
      },
      'M.png',
    );
    expect(result.token).toBe('details');
    expect(result.path).toContain('Hybrid Inverter/');
    expect(result.needsClassification).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
  it('separates RGB and CMYK Logo destinations', async () => {
    const { router } = fixture();
    const row = { productOrBrandMaterial: '品牌物料', materialType: 'Logo' };
    expect(
      (await router.resolve('root', row, 'itel-Logo-CMYK-V2.0-L.ai')).token,
    ).toBe('cmyk');
    expect(
      (await router.resolve('root', row, 'itel-Logo-RGB-V2.0-M.pdf')).token,
    ).toBe('rgb');
  });
  it('does not guess the destination of an unknown model or ambiguous folder', async () => {
    const { router, create } = fixture();
    const row = {
      productModel: 'Unknown',
      productOrBrandMaterial: '产品物料',
      materialType: 'KV 主视觉',
    };
    const result = await router.resolve('root', row, 'M.png');
    expect(result.needsClassification).toBe(true);
    expect(result.path).toBe('_待分类/Unknown/KV 主视觉');
    expect(create).toHaveBeenCalledTimes(3);
    await router.resolve('root', row, 'S.jpg');
    expect(create).toHaveBeenCalledTimes(3);
  });
});
