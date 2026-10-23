import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  FolderOpen,
  Image,
  FileText,
  Video,
  Box,
  Palette,
  BookOpen,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import type { MaterialKit, MaterialOtherItem } from '@shared/material';
import { Button } from '@client/src/components/ui/button';
import FallbackImage from '@client/src/components/FallbackImage';
import type { Language } from '@client/src/i18n/dictionary';
import KitExtractDrawer from './KitExtractDrawer';
import MaterialCard from './MaterialCard';

export interface KitsViewProps {
  kits: MaterialKit[];
  otherMaterials: MaterialOtherItem[];
  language: Language;
  pt: (key: string) => string;
}
function typeIcon(type: string): LucideIcon {
  if (/video|视频/i.test(type)) return Video;
  if (/detail|详情/i.test(type)) return ScrollText;
  if (/datasheet|规格|数据表/i.test(type)) return FileText;
  if (/brochure|手册|折页/i.test(type)) return BookOpen;
  if (/logo|vi|标志/i.test(type)) return Palette;
  if (/render|渲染|3d/i.test(type)) return Box;
  return Image;
}
export default function KitsView({
  kits,
  otherMaterials,
  language,
  pt,
}: KitsViewProps) {
  const [params, setParams] = useSearchParams();
  const [extract, setExtract] = useState(false);
  const selectedModel = params.get('kit');
  const selected = kits.find((kit) => kit.productModel === selectedModel);
  const en = language === 'en';
  const openFolder = (model: string | null) => {
    const next = new URLSearchParams(params);
    if (model) next.set('kit', model);
    else next.delete('kit');
    setParams(next);
    setExtract(false);
  };
  if (selectedModel)
    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
          <Button
            variant="ghost"
            size="icon"
            title={en ? 'All product folders' : '全部产品文件夹'}
            onClick={() => openFolder(null)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-semibold">
              {selectedModel}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selected?.count ?? 0} {en ? 'materials' : '项物料'}
            </p>
          </div>
          {selected ? (
            <Button variant="outline" onClick={() => setExtract(true)}>
              <Download className="size-4" />
              {en ? 'Select files' : '选择文件下载'}
            </Button>
          ) : null}
        </div>
        {!selected ? (
          <p className="py-8 text-sm text-muted-foreground">
            {en
              ? 'This folder is unavailable or empty.'
              : '该文件夹当前不可用或暂无物料。'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {selected.items.map((item) => (
              <MaterialCard
                key={item.baseRecordId}
                {...item}
                previewUrl={item.previewUrl ?? null}
                language={language}
              />
            ))}
          </div>
        )}
        {extract && selected ? (
          <KitExtractDrawer
            open
            onClose={() => setExtract(false)}
            productModel={selectedModel}
            materialIds={selected.items.map((item) => item.baseRecordId)}
          />
        ) : null}
      </section>
    );
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kits.map((kit) => {
          const cover =
            kit.items.find((item) => /^kv\b|主视觉/i.test(item.materialType)) ??
            kit.items.find((item) => item.thumbUrl || item.previewUrl);
          return (
            <button
              key={kit.productModel}
              type="button"
              onClick={() => openFolder(kit.productModel)}
              className="group min-w-0 overflow-hidden rounded-md border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={
                (en ? 'Open folder ' : '打开资料包 ') + kit.productModel
              }
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-sky-100 via-white to-emerald-100">
                <FallbackImage
                  sources={[cover?.thumbUrl, cover?.previewUrl]}
                  alt={kit.productModel}
                  className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-[1.02]"
                  placeholder={
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FolderOpen className="size-10 text-primary/50" />
                    </div>
                  }
                />
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded bg-white/95 px-2 py-1 text-xs font-medium text-foreground">
                  <FolderOpen className="size-4" />
                  {kit.count} {en ? 'materials' : '项物料'}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 break-words font-mono text-base font-semibold">
                    {kit.productModel}
                  </h3>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </div>
                <ul className="mt-3 space-y-2">
                  {kit.typeList.map((type) => {
                    const Icon = typeIcon(type);
                    return (
                      <li
                        key={type}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 break-words">
                          {type}
                        </span>
                        <span className="tabular-nums">
                          {
                            kit.items.filter(
                              (item) => item.materialType === type,
                            ).length
                          }
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </button>
          );
        })}
      </section>
      {otherMaterials.length ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">
            {pt('library.others.title')}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {otherMaterials.map((item) => (
              <MaterialCard
                key={item.baseRecordId}
                {...item}
                language={language}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
