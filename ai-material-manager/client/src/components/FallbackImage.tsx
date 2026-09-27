import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export interface FallbackImageProps {
  /** 按优先级排列的候选地址；空值会被忽略，前一个加载失败自动换下一个 */
  sources: Array<string | null | undefined>;
  alt: string;
  /** 全部候选都失败（或没有候选）时展示的占位 */
  placeholder: React.ReactNode;
  priority?: boolean;
  /** 图片本身的样式 */
  className?: string;
  /** 加载中骨架块的定位/尺寸（默认铺满父容器，父容器需 relative） */
  skeletonClassName?: string;
  style?: React.CSSProperties;
}

/**
 * 带降级链与淡入效果的图片：加载中显示骨架底色，加载完成后 180ms 淡入，
 * 候选全部失败时显示占位，保证页面上绝不出现破图图标。
 */
const FallbackImage: React.FC<FallbackImageProps> = ({
  sources,
  alt,
  placeholder,
  priority = false,
  className,
  skeletonClassName = 'inset-0',
  style,
}) => {
  const candidates: string[] = useMemo(
    (): string[] =>
      sources.filter(
        (value, index): value is string =>
          typeof value === 'string' &&
          value !== '' &&
          sources.indexOf(value) === index,
      ),
    // 以内容而非数组引用判断是否变化，避免父组件每次渲染都重置加载状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sources.join('\n')],
  );
  const [failed, setFailed] = useState<string[]>([]);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const src = candidates.find((candidate) => !failed.includes(candidate));
  const loaded = src === loadedSrc;
  if (src === undefined) return <>{placeholder}</>;

  return (
    <>
      {!loaded ? (
        <div
          aria-hidden="true"
          className={cn(
            'absolute animate-pulse rounded-md bg-accent',
            skeletonClassName,
          )}
        />
      ) : null}
      <img
        key={src}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        draggable={false}
        onLoad={(): void => setLoadedSrc(src)}
        onError={(): void => {
          setFailed((current) => [...current, src]);
        }}
        className={cn(
          'transition-opacity duration-180 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        style={style}
      />
    </>
  );
};

export default FallbackImage;
