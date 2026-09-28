import React from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  Copy,
  FileArchive,
  FileText,
  FolderOpen,
  KeyRound,
  Loader2,
  MousePointer2,
  Plug,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * 教程里的五段动画。每段只接收“本段已播放的毫秒数” t，
 * 用 t 是否越过某个时间点来决定元素出现、移动、打字到第几个字——
 * 这样暂停、重播、跳步都只需要改 t，减少动态效果时直接传一个很大的 t 显示最终画面。
 */
export interface SceneProps {
  t: number;
  pt: (key: string) => string;
  mcpUrl: string;
  serverName: string;
  os: 'mac' | 'win';
}

export const SCENE_DURATIONS: number[] = [6500, 8000, 6500, 6000, 11000];

function typed(text: string, t: number, start: number, msPerChar = 45): string {
  if (t <= start) return '';
  return text.slice(0, Math.floor((t - start) / msPerChar));
}

/** 出现：从下方淡入 */
function reveal(visible: boolean): string {
  return cn(
    'transition-[opacity,transform] duration-500 ease-out',
    visible
      ? 'translate-y-0 opacity-100'
      : 'pointer-events-none translate-y-2 opacity-0',
  );
}

const Caret: React.FC<{ show: boolean; dark?: boolean }> = ({ show, dark }) =>
  show ? (
    <span
      aria-hidden="true"
      className={cn(
        'ml-px inline-block h-[1.1em] w-[2px] translate-y-[2px] animate-pulse',
        dark ? 'bg-emerald-300' : 'bg-primary',
      )}
    />
  ) : null;

/** 从 from 偏移处滑到目标元素上的鼠标指针；挂在目标元素内部，不用算页面坐标 */
const PointerTo: React.FC<{
  show: boolean;
  arrived: boolean;
  from: string;
}> = ({ show, arrived, from }) => (
  <MousePointer2
    aria-hidden="true"
    className={cn(
      'pointer-events-none absolute right-1 bottom-0 z-10 size-5 fill-foreground text-card drop-shadow transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.3,0,0.2,1)]',
      show ? 'opacity-100' : 'opacity-0',
    )}
    style={{ transform: arrived ? 'translate(40%, 45%)' : from }}
  />
);

const MockWindow: React.FC<{
  title: string;
  dark?: boolean;
  demoLabel: string;
  children: React.ReactNode;
}> = ({ title, dark, demoLabel, children }) => (
  <div
    className={cn(
      'flex h-full flex-col overflow-hidden rounded-lg border shadow-sm',
      dark
        ? 'border-zinc-700 bg-zinc-900 text-zinc-100'
        : 'border-border bg-card',
    )}
  >
    <div
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 border-b px-3',
        dark ? 'border-zinc-700 bg-zinc-800' : 'border-border bg-accent/60',
      )}
    >
      <span className="size-2.5 rounded-full bg-[#ff5f57]" />
      <span className="size-2.5 rounded-full bg-[#febc2e]" />
      <span className="size-2.5 rounded-full bg-[#28c840]" />
      <span
        className={cn(
          'ml-2 min-w-0 flex-1 truncate font-mono text-[11px]',
          dark ? 'text-zinc-400' : 'text-muted-foreground',
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[10px]',
          dark ? 'bg-zinc-700 text-zinc-300' : 'bg-card text-muted-foreground',
        )}
      >
        {demoLabel}
      </span>
    </div>
    <div className="relative min-h-0 flex-1">{children}</div>
  </div>
);

/* ① 在网页创建令牌 */
export const SceneCreateToken: React.FC<SceneProps> = ({ t, pt }) => {
  const label = pt('tutorial.s1.label');
  const shownLabel = typed(label, t, 400, 90);
  const pressed = t >= 2500 && t < 2800;
  const tokenShown = t >= 2800;
  const copied = t >= 4600;
  return (
    <MockWindow
      title={`${window.location.host}/more`}
      demoLabel={pt('tutorial.demo')}
    >
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bot className="size-4 text-primary" />
          {pt('tutorial.s1.card')}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 min-w-0 flex-1 items-center rounded-md border border-input bg-background px-3 text-sm">
            <span className="truncate">{shownLabel}</span>
            <Caret show={t < 2000} />
          </div>
          <div className="relative shrink-0">
            <div
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-transform duration-150',
                pressed && 'scale-95 ring-4 ring-primary/25',
              )}
            >
              <KeyRound className="size-4" />
              <span className="hidden sm:inline">
                {pt('tutorial.s1.create')}
              </span>
            </div>
            <PointerTo
              show={t >= 1500 && t < 3600}
              arrived={t >= 1700}
              from="translate(-160px, 90px)"
            />
          </div>
        </div>
        <div
          className={cn(
            'space-y-2 rounded-md border border-warning/40 bg-warning-soft p-3',
            reveal(tokenShown),
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-warning-text">
              {pt('tutorial.s1.once')}
            </span>
            <span className="relative">
              <span
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                  copied
                    ? 'bg-success-soft text-success-text'
                    : 'bg-card text-foreground',
                )}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? pt('tutorial.copied') : pt('tutorial.copy')}
              </span>
              <PointerTo
                show={t >= 3700}
                arrived={t >= 3900}
                from="translate(-40px, -70px)"
              />
            </span>
          </div>
          <code className="block truncate rounded bg-card px-2 py-1.5 font-mono text-xs">
            amm_eyJpZCI6Ijd…Kq2Xp9
          </code>
        </div>
      </div>
    </MockWindow>
  );
};

/* ② 把配置写进 Codex */
export const SceneConfig: React.FC<SceneProps> = ({
  t,
  pt,
  mcpUrl,
  serverName,
  os,
}) => {
  const lines = [
    `[mcp_servers.${serverName}]`,
    `url = "${mcpUrl}"`,
    `http_headers = { Authorization = "Bearer amm_…" }`,
  ];
  const msPerChar = 28;
  let cursor = 500;
  const rendered = lines.map((line) => {
    const text = typed(line, t, cursor, msPerChar);
    const typing = t > cursor && text.length < line.length;
    cursor += line.length * msPerChar + 250;
    return { text, typing };
  });
  const doneAt = cursor;
  const highlight = t >= doneAt + 200;
  const saved = t >= doneAt + 1600;
  const title =
    os === 'mac'
      ? '~/.codex/config.toml'
      : '%USERPROFILE%\\.codex\\config.toml';
  return (
    <MockWindow title={title} demoLabel={pt('tutorial.demo')}>
      <div className="space-y-1 overflow-hidden p-4 font-mono text-[11px] leading-5 sm:text-xs">
        <div className="text-muted-foreground/60"># …</div>
        {rendered.map(({ text, typing }, index) => {
          const isToken = index === 2 && highlight;
          return (
            <div key={index} className="break-all whitespace-pre-wrap">
              {index === 0 ? (
                <span className="text-primary">{text}</span>
              ) : isToken ? (
                <>
                  {text.replace('amm_…" }', '')}
                  <span className="rounded bg-warning-soft px-0.5 text-warning-text ring-2 ring-warning/50">
                    amm_…
                  </span>
                  {'" }'}
                </>
              ) : (
                text
              )}
              <Caret show={typing} />
            </div>
          );
        })}
        <div
          className={cn(
            'pt-2 font-sans text-xs text-warning-text',
            reveal(highlight),
          )}
        >
          ↑ {pt('tutorial.s2.replace')}
        </div>
      </div>
      <div
        className={cn(
          'absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success-text',
          reveal(saved),
        )}
      >
        <CheckCircle2 className="size-3.5" />
        {os === 'mac' ? '⌘S' : 'Ctrl+S'}
      </div>
    </MockWindow>
  );
};

/* ③ 确认已经连上 */
const TOOL_NAMES = [
  'whoami',
  'search_materials',
  'plan_material',
  'prepare_upload',
  'publish_material',
  'list_my_tasks',
];

export const SceneVerify: React.FC<SceneProps> = ({ t, pt, serverName }) => {
  const command = typed('/mcp', t, 500, 160);
  return (
    <MockWindow title="Codex" dark demoLabel={pt('tutorial.demo')}>
      <div className="space-y-2 p-4 font-mono text-[11px] leading-5 sm:text-xs">
        <div>
          <span className="text-emerald-400">› </span>
          {command}
          <Caret show={t < 1300} dark />
        </div>
        <div className={cn('space-y-1.5', reveal(t >= 1600))}>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Plug className="size-3.5" /> MCP
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-zinc-100">• {serverName}</span>
            <span className="rounded bg-emerald-500/15 px-1.5 text-emerald-300">
              ✓ {pt('tutorial.s3.connected')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-3">
          {TOOL_NAMES.map((name, index) => (
            <span
              key={name}
              className={cn(
                'flex items-center gap-1 rounded bg-zinc-800 px-1.5 text-zinc-300',
                reveal(t >= 2400 + index * 280),
              )}
            >
              <Wrench className="size-3 text-zinc-500" />
              {name}
            </span>
          ))}
          <span
            className={cn(
              'px-1 text-zinc-400',
              reveal(t >= 2400 + TOOL_NAMES.length * 280),
            )}
          >
            … {pt('tutorial.s3.tools')}
          </span>
        </div>
      </div>
    </MockWindow>
  );
};

/* ④ 装上 Skill */
export const SceneSkill: React.FC<SceneProps> = ({ t, pt, os }) => {
  const moving = t >= 900;
  const landed = t >= 2000;
  const skillsDir =
    os === 'mac' ? '~/.codex/skills/' : '%USERPROFILE%\\.codex\\skills\\';
  const tree = [
    { at: 2300, depth: 0, name: 'material-assistant/', folder: true },
    { at: 2700, depth: 1, name: 'SKILL.md', folder: false },
    { at: 3100, depth: 1, name: 'reference/naming.md', folder: false },
  ];
  const zipCard = (className: string): React.ReactNode => (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 shadow-sm transition-opacity duration-500',
        className,
      )}
    >
      <FileArchive className="size-8 text-primary" />
      <span className="max-w-[7.5rem] truncate font-mono text-[10px] text-muted-foreground">
        material-assistant-skill.zip
      </span>
    </div>
  );
  return (
    <MockWindow title={skillsDir} demoLabel={pt('tutorial.demo')}>
      <div className="flex h-full items-center gap-4 p-4">
        <div className="relative flex w-[38%] min-w-0 shrink-0 justify-center">
          {zipCard(landed ? 'opacity-40' : '')}
          {/* 飞进目录的是一个副本，原文件留在「下载」里 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex justify-center transition-[transform,opacity] duration-1000 ease-[cubic-bezier(0.5,0,0.2,1)]"
            style={{
              transform: moving ? 'translateX(130%) scale(0.4)' : 'none',
              opacity: moving && !landed ? 1 : 0,
            }}
          >
            {zipCard('')}
          </div>
        </div>
        <div
          className={cn(
            'min-w-0 flex-1 space-y-1.5 rounded-lg border border-dashed p-3 transition-colors duration-500',
            landed ? 'border-primary/50 bg-primary-soft' : 'border-border',
          )}
        >
          <div className="flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground">
            <FolderOpen className="size-4 shrink-0 text-primary" />
            skills
          </div>
          {tree.map((row) => (
            <div
              key={row.name}
              className={cn(
                'flex items-center gap-1.5 truncate font-mono text-[11px]',
                reveal(t >= row.at),
              )}
              style={{ paddingLeft: `${(row.depth + 1) * 12}px` }}
            >
              {row.folder ? (
                <FolderOpen className="size-3.5 shrink-0 text-primary" />
              ) : (
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{row.name}</span>
            </div>
          ))}
          <div
            className={cn(
              'flex items-center gap-1 pt-1 text-xs text-success-text',
              reveal(t >= 3900),
            )}
          >
            <CheckCircle2 className="size-3.5" /> Skill ✓
          </div>
        </div>
      </div>
    </MockWindow>
  );
};

/* ⑤ 开始使用 */
const CHAT_TOOLS: Array<{ name: string; at: number }> = [
  { name: 'whoami', at: 1200 },
  { name: 'search_materials', at: 1800 },
  { name: 'plan_material', at: 2400 },
  { name: 'prepare_upload', at: 3000 },
];

/** 聊天里的消息到点才挂载，这样新消息总是出现在底部，把旧消息往上顶 */
const POP_IN = 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300';

const ToolChip: React.FC<{
  name: string;
  t: number;
  at: number;
  doneAt: number;
}> = ({ name, t, at, doneAt }) =>
  t >= at ? (
    <div
      className={cn(
        'flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-border bg-accent/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground',
        POP_IN,
      )}
    >
      {t >= doneAt ? (
        <Check className="size-3 text-success" />
      ) : (
        <Loader2 className="size-3 animate-spin" />
      )}
      {name}
    </div>
  ) : null;

export const SceneUse: React.FC<SceneProps> = ({ t, pt }) => {
  const uploadProgress = Math.max(0, Math.min(1, (t - 3600) / 1800));
  const bubble = (
    at: number,
    className: string,
    content: React.ReactNode,
  ): React.ReactNode =>
    t >= at ? (
      <div className={cn('shrink-0 rounded-lg px-3 py-2', POP_IN, className)}>
        {content}
      </div>
    ) : null;
  return (
    <MockWindow title="Codex" demoLabel={pt('tutorial.demo')}>
      <div className="flex h-full flex-col justify-end gap-2 overflow-hidden p-3 text-xs">
        {bubble(
          200,
          'ml-auto max-w-[85%] rounded-br-sm bg-primary text-primary-foreground',
          pt('tutorial.s5.ask'),
        )}
        {CHAT_TOOLS.map((tool) => (
          <ToolChip
            key={tool.name}
            name={tool.name}
            t={t}
            at={tool.at}
            doneAt={tool.at + 500}
          />
        ))}
        {t >= 3500 ? (
          <div
            className={cn('w-full max-w-[16rem] shrink-0 space-y-1', POP_IN)}
          >
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>curl · {pt('tutorial.s5.upload')}</span>
              <span className="font-mono">
                {Math.round(uploadProgress * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150"
                style={{ width: `${uploadProgress * 100}%` }}
              />
            </div>
          </div>
        ) : null}
        {bubble(
          6000,
          'max-w-[85%] rounded-bl-sm border border-border bg-card',
          pt('tutorial.s5.confirm'),
        )}
        {bubble(
          7400,
          'ml-auto rounded-br-sm bg-primary text-primary-foreground',
          pt('tutorial.s5.yes'),
        )}
        <ToolChip name="publish_material" t={t} at={8000} doneAt={8700} />
        {bubble(
          9000,
          'flex max-w-[85%] items-start gap-1.5 rounded-bl-sm border border-success/40 bg-success-soft text-success-text',
          <>
            <CheckCircle2 className="mt-px size-3.5 shrink-0" />
            {pt('tutorial.s5.result')}
          </>,
        )}
      </div>
    </MockWindow>
  );
};

export const SCENES: React.FC<SceneProps>[] = [
  SceneCreateToken,
  SceneConfig,
  SceneVerify,
  SceneSkill,
  SceneUse,
];
