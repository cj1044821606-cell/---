import { Injectable } from '@nestjs/common';
import { FeishuService } from './feishu.service';

interface Folder {
  name: string;
  token: string;
}
export interface ArchiveDestination {
  token: string;
  path: string;
  needsClassification: boolean;
}
const norm = (value: string) =>
  value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[～〜]/g, '~')
    .replace(/[,，、&]/g, '&')
    .replace(/\s/g, '');
const MODEL_ALIASES: Record<string, string> = {
  'IPV-4~11K': 'IPV-4K24T & IPV-6K648T & IPV-8K48T & IPV-10K48T & IPV-11K48T',
  'IHY-6K6L1C&IHY-12KL1C': 'IHY-6K6L1C & 12KL1C',
};
export function matchesModel(folder: string, model: string): boolean {
  const key = norm(model);
  const expanded = MODEL_ALIASES[key] ?? model;
  return norm(folder.split(/[（(]/)[0]) === norm(expanded);
}
export function typePattern(type: string): RegExp | null {
  if (/detail|详情/i.test(type)) return /detail|详情/i;
  if (/datasheet|规格|数据表/i.test(type)) return /datasheet|单页/i;
  if (/^kv\b|主视觉/i.test(type)) return /^kv\b|主视觉/i;
  if (/social|社媒/i.test(type)) return /social|社媒/i;
  if (/logo/i.test(type)) return /brand logo|品牌logo/i;
  if (/\bvi\b|品牌视觉/i.test(type)) return /\bvi\b|vi手册/i;
  if (/catalog|画册/i.test(type)) return /catalog|画册/i;
  if (/brochure|折页/i.test(type)) return /brochure|折页/i;
  if (/render|白底/i.test(type)) return /white background|白底/i;
  if (/video|视频/i.test(type)) return /video|视频/i;
  return null;
}

/** Match the real library layout, never infer the Drive category from the model prefix. */
@Injectable()
export class DriveArchiveRouter {
  private cache = new Map<string, { expires: number; folders: Folder[] }>();
  constructor(private readonly feishu: FeishuService) {}

  async resolve(
    root: string,
    row: Record<string, unknown>,
    fileName: string,
  ): Promise<ArchiveDestination> {
    const top = await this.folders(root);
    const language = String(row.appLanguage ?? '').toUpperCase();
    const languageFolder = /^(FR\b|FRENCH\b|法语)/.test(language)
      ? top.find((f) => /^French materials/i.test(f.name))
      : /^(AR\b|ARABIC\b|阿语)/.test(language)
        ? top.find((f) => /^Arabic materials/i.test(f.name))
        : undefined;
    const model = String(row.productModel ?? '').trim();
    const type = String(row.materialType ?? '未分类物料');
    const pattern = typePattern(type);
    if (model && row.productOrBrandMaterial === '产品物料') {
      const product =
        languageFolder ?? top.find((f) => /^Product\s*\(/i.test(f.name));
      if (product) {
        const categories = await this.folders(product.token);
        const matches: Array<{ folder: Folder; path: string }> = [];
        for (const category of categories) {
          if (matchesModel(category.name, model))
            matches.push({
              folder: category,
              path: product.name + '/' + category.name,
            });
          for (const folder of await this.folders(category.token)) {
            if (matchesModel(folder.name, model))
              matches.push({
                folder,
                path: product.name + '/' + category.name + '/' + folder.name,
              });
          }
        }
        if (matches.length === 1 && pattern) {
          const found = matches[0];
          const types = (await this.folders(found.folder.token)).filter((f) =>
            pattern.test(f.name),
          );
          if (types.length === 1)
            return {
              token: types[0].token,
              path: found.path + '/' + types[0].name,
              needsClassification: false,
            };
        }
      }
    } else if (
      row.productOrBrandMaterial === '品牌物料' &&
      pattern &&
      !languageFolder
    ) {
      const brand = top.find((f) => /^Brand\s*\(/i.test(f.name));
      if (brand) {
        const types = (await this.folders(brand.token)).filter((f) =>
          pattern.test(f.name),
        );
        if (types.length === 1) {
          let leaf = types[0];
          let route = brand.name + '/' + leaf.name;
          if (/logo/i.test(type)) {
            const variant = /(?:^|[-_\s])CMYK(?:[-_\s.]|$)/i.test(fileName)
              ? /^CMYK/i
              : /(?:^|[-_\s])RGB(?:[-_\s.]|$)/i.test(fileName)
                ? /^RGB/i
                : null;
            const variants = variant
              ? (await this.folders(leaf.token)).filter((f) =>
                  variant.test(f.name),
                )
              : [];
            if (variants.length !== 1)
              return this.unclassified(root, model, type);
            leaf = variants[0];
            route += '/' + leaf.name;
            if (/\.png$/i.test(fileName)) {
              const png = (await this.folders(leaf.token)).filter((f) =>
                /^PNG$/i.test(f.name),
              );
              if (png.length === 1) {
                leaf = png[0];
                route += '/' + leaf.name;
              }
            }
          }
          return { token: leaf.token, path: route, needsClassification: false };
        }
      }
    }
    return this.unclassified(root, model, type);
  }

  private async unclassified(
    root: string,
    model: string,
    type: string,
  ): Promise<ArchiveDestination> {
    let token = root;
    const parts = ['_待分类', model || '品牌与活动', type].map((s) =>
      s.replace(/[\r\n/\\]/g, '_').slice(0, 100),
    );
    for (const name of parts) token = await this.ensureFolder(token, name);
    return { token, path: parts.join('/'), needsClassification: true };
  }
  private async ensureFolder(parent: string, name: string): Promise<string> {
    const folders = await this.folders(parent);
    const matches = folders.filter((f) => f.name === name);
    if (matches.length > 1)
      throw new Error('Ambiguous archive folder: ' + name);
    if (matches[0]) return matches[0].token;
    const created = await this.feishu.client.drive.file.createFolder({
      data: { folder_token: parent, name },
    });
    if (created.code !== 0 || !created.data?.token)
      throw new Error('Create archive folder: ' + created.msg);
    folders.push({ name, token: created.data.token });
    return created.data.token;
  }
  private async folders(token: string): Promise<Folder[]> {
    const cached = this.cache.get(token);
    if (cached && cached.expires > Date.now()) return cached.folders;
    const folders: Folder[] = [];
    let page: string | undefined;
    do {
      const response = await this.feishu.client.drive.file.list({
        params: { folder_token: token, page_size: 200, page_token: page },
      });
      if (response.code !== 0)
        throw new Error('Read archive folder: ' + response.msg);
      folders.push(
        ...(response.data?.files ?? []).filter((f) => f.type === 'folder'),
      );
      page = response.data?.has_more
        ? response.data.next_page_token
        : undefined;
      if (response.data?.has_more && !page)
        throw new Error('Drive pagination token missing');
    } while (page);
    this.cache.set(token, { folders, expires: Date.now() + 600_000 });
    return folders;
  }
}
