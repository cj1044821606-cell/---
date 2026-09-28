import React from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  FilePenLine,
  FolderInput,
  KeyRound,
  Link2,
  Loader2,
  MousePointer2,
  PackageOpen,
  PartyPopper,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * 教程里的三段动画。每段只接收“本段已播放的毫秒数” t，
 * 用 t 是否越过某个时间点来决定元素出现、移动、打勾——暂停、重播、跳步都只需要改 t。
 */
export interface SceneProps {
  t: number;
  pt: (key: string) => string;
}

export const SCENE_DURATIONS: number[] = [5200, 9000, 10500];

/** 到点才挂载并弹入，保证新内容总是出现在最下方 */
const POP_IN = 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300';

const Pointer: React.FC<{ show: boolean; arrived: boolean; from: string }> = ({
  show,
  arrived,
  from,
}) => (
  <MousePointer2
    aria-hidden="true"
    className={cn(
      'pointer-events-none absolute right-0 bottom-0 z-10 size-5 fill-foreground text-white drop-shadow-md transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.3,0,0.2,1)]',
      show ? 'opacity-100' : 'opacity-0',
    )}
    style={{ transform: arrived ? 'translate(35%, 40%)' : from }}
  />
);

const TypingDots: React.FC = () => (
  <div
    className={cn(
      'flex w-fit shrink-0 gap-1 rounded-2xl rounded-bl-sm bg-card px-3 py-2.5 shadow-sm',
      POP_IN,
    )}
  >
    {[0, 150, 300].map((delay) => (
      <span
        key={delay}
        className="tut-dot size-1.5 rounded-full bg-primary"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
);

/** 漂浮的应用窗口 */
const AppWindow: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="tut-float relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_18px_40px_-12px_rgba(37,99,235,0.35)] backdrop-blur">
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/70 px-3">
      <span className="size-2.5 rounded-full bg-[#ff5f57]" />
      <span className="size-2.5 rounded-full bg-[#febc2e]" />
      <span className="size-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
        {icon}
        <span className="truncate">{title}</span>
      </span>
    </div>
    <div className="relative min-h-0 flex-1 bg-gradient-to-b from-primary-soft/50 to-transparent">
      {children}
    </div>
  </div>
);

/** 最后一幕的礼花 */
const CONFETTI = Array.from({ length: 22 }, (_, index) => {
  const angle = (index / 22) * Math.PI * 2;
  const distance = 80 + (index % 4) * 28;
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance - 30)}px`,
    rot: `${(index % 2 ? 1 : -1) * (180 + index * 23)}deg`,
    color: ['#2563EB', '#FF6B57', '#FFB020', '#8B5CF6', '#10B981'][index % 5],
    delay: (index % 3) * 60,
    round: index % 3 === 0,
  };
});

const Confetti: React.FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 grid place-items-center"
  >
    {CONFETTI.map((piece, index) => (
      <span
        key={index}
        className={cn(
          'tut-confetti absolute',
          piece.round ? 'size-2 rounded-full' : 'h-2.5 w-1.5 rounded-[1px]',
        )}
        style={
          {
            background: piece.color,
            animationDelay: `${piece.delay}ms`,
            '--dx': piece.dx,
            '--dy': piece.dy,
            '--rot': piece.rot,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

/* ① 生成专属口令 */
const INGREDIENTS: Array<{ at: number; icon: React.ReactNode; key: string }> = [
  { at: 700, icon: <Link2 className="size-3" />, key: 'tutorial.s1.part.url' },
  {
    at: 1200,
    icon: <KeyRound className="size-3" />,
    key: 'tutorial.s1.part.token',
  },
  {
    at: 1700,
    icon: <PackageOpen className="size-3" />,
    key: 'tutorial.s1.part.skill',
  },
];

export const ScenePrompt: React.FC<SceneProps> = ({ t, pt }) => {
  const writing = t >= 2300 && t < 3200;
  const written = t >= 3200;
  const copied = t >= 4300;
  return (
    <div className="flex h-full items-center justify-center gap-6 px-4">
      <div className="hidden shrink-0 flex-col items-center gap-2 sm:flex">
        <div className="tut-pop relative grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-lg">
          <Sparkles className="size-7" />
          <span className="tut-twinkle absolute -top-1.5 -right-1.5 size-3 rounded-full bg-amber" />
        </div>
        <span className="text-xs font-medium text-primary">
          {pt('tutorial.s1.magic')}
        </span>
      </div>

      <div className="tut-float w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_18px_40px_-12px_rgba(37,99,235,0.35)]">
        <div className="flex items-center justify-between bg-brand px-4 py-2.5 text-white">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4" />
            {pt('tutorial.s1.card')}
          </span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
            {pt('tutorial.s1.only')}
          </span>
        </div>
        <div className="space-y-2.5 p-3.5">
          <div className="flex flex-wrap gap-1.5">
            {INGREDIENTS.map((item) =>
              t >= item.at ? (
                <span
                  key={item.key}
                  className="tut-fly-in inline-flex h-5 items-center gap-1 rounded-full border border-primary-line bg-primary-soft px-2 text-[11px] font-medium text-primary"
                >
                  {item.icon}
                  {pt(item.key)}
                </span>
              ) : (
                <span
                  key={item.key}
                  className="h-5 w-16 rounded-full border border-dashed border-border-strong"
                />
              ),
            )}
          </div>
          <div className="space-y-1.5 rounded-lg bg-surface-sunken p-2.5">
            {[92, 78, 86, 54].map((width, index) =>
              written ? (
                <div
                  key={width}
                  className={cn(
                    'truncate text-[11px] leading-3 text-muted-foreground',
                    POP_IN,
                  )}
                >
                  {pt(`tutorial.s1.line${index + 1}`)}
                </div>
              ) : (
                <div
                  key={width}
                  className={cn(
                    'h-3 rounded',
                    writing ? 'tut-shimmer' : 'bg-border/70',
                  )}
                  style={{ width: `${width}%` }}
                />
              ),
            )}
          </div>
          <div className="flex justify-end">
            <span
              className={cn(
                'relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-300',
                copied ? 'bg-success' : 'bg-brand',
                written && !copied && 'tut-glow',
              )}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? pt('tutorial.copied') : pt('tutorial.s1.copy')}
              <Pointer
                show={t >= 3400 && t < 5000}
                arrived={t >= 3600}
                from="translate(-150px, 60px)"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ② 粘贴给 Codex，它自己装好 */
interface SetupTask {
  at: number;
  doneAt: number;
  icon: React.ReactNode;
  key: string;
}

const SETUP_TASKS: SetupTask[] = [
  {
    at: 2000,
    doneAt: 3700,
    icon: <FilePenLine className="size-3.5" />,
    key: 'tutorial.s2.task.config',
  },
  {
    at: 3900,
    doneAt: 4800,
    icon: <Download className="size-3.5" />,
    key: 'tutorial.s2.task.download',
  },
  {
    at: 5000,
    doneAt: 5800,
    icon: <FolderInput className="size-3.5" />,
    key: 'tutorial.s2.task.unzip',
  },
];

const TaskRow: React.FC<{ t: number; task: SetupTask; label: string }> = ({
  t,
  task,
  label,
}) =>
  t >= task.at ? (
    <div
      className={cn(
        'flex w-fit shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px] transition-colors duration-300',
        POP_IN,
        t >= task.doneAt
          ? 'border-success/30 bg-success-soft text-success-text'
          : 'border-primary-line bg-card text-foreground',
      )}
    >
      {t >= task.doneAt ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <Loader2 className="size-3.5 animate-spin text-primary" />
      )}
      <span className="opacity-70">{task.icon}</span>
      <span className="font-mono">{label}</span>
    </div>
  ) : null;

export const SceneSetup: React.FC<SceneProps> = ({ t, pt }) => {
  const allowed = t >= 3300;
  return (
    <AppWindow
      title="Codex"
      icon={<Terminal className="size-3.5 text-primary" />}
    >
      <div className="flex h-full flex-col justify-end gap-2 overflow-hidden p-3 text-xs">
        {t >= 200 ? (
          <div
            className={cn(
              'ml-auto max-w-[88%] shrink-0 space-y-1.5 rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-white shadow-md',
              POP_IN,
            )}
          >
            <p className="line-clamp-2 leading-relaxed">
              {pt('tutorial.s2.pasted')}
            </p>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px]">
              <ClipboardPaste className="size-3" />
              {pt('tutorial.s1.card')}
            </span>
          </div>
        ) : null}
        {t >= 1000 && t < 2000 ? <TypingDots /> : null}
        <TaskRow t={t} task={SETUP_TASKS[0]} label={pt(SETUP_TASKS[0].key)} />
        {t >= 2500 ? (
          <div
            className={cn(
              'w-full max-w-[17rem] shrink-0 rounded-xl border bg-card p-2.5 shadow-md transition-colors duration-300',
              POP_IN,
              allowed ? 'border-success/30' : 'border-amber',
            )}
          >
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck
                className={cn(
                  'size-4',
                  allowed ? 'text-success' : 'text-amber-text',
                )}
              />
              {allowed
                ? pt('tutorial.s2.allowed')
                : pt('tutorial.s2.permission')}
            </div>
            {!allowed ? (
              <div className="mt-2 flex justify-end gap-1.5">
                <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {pt('tutorial.s2.deny')}
                </span>
                <span className="relative rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-white">
                  {pt('tutorial.s2.allow')}
                  <Pointer
                    show={t >= 2700}
                    arrived={t >= 2900}
                    from="translate(-120px, 50px)"
                  />
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
        {SETUP_TASKS.slice(1).map((task) => (
          <TaskRow key={task.key} t={t} task={task} label={pt(task.key)} />
        ))}
        {t >= 6300 ? (
          <div
            className={cn(
              'flex max-w-[88%] shrink-0 items-start gap-1.5 rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-foreground shadow-sm',
              POP_IN,
            )}
          >
            <PartyPopper className="mt-px size-3.5 shrink-0 text-coral" />
            {pt('tutorial.s2.done')}
          </div>
        ) : null}
        {t >= 7300 ? (
          <div className={cn('flex shrink-0 items-center gap-2', POP_IN)}>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">
              <RotateCw className={cn('size-3', t < 8200 && 'animate-spin')} />
              {pt('tutorial.s2.restart')}
            </span>
            {t >= 8200 ? (
              <span className="tut-pop inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-white">
                <CheckCircle2 className="size-3" />
                {pt('tutorial.s2.connected')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppWindow>
  );
};

/* ③ 说一句话就能发布 */
const CHAT_TOOLS: Array<{ name: string; at: number }> = [
  { name: 'whoami', at: 1200 },
  { name: 'search_materials', at: 1700 },
  { name: 'plan_material', at: 2200 },
  { name: 'prepare_upload', at: 2700 },
];

const ToolChip: React.FC<{
  name: string;
  t: number;
  at: number;
  doneAt: number;
}> = ({ name, t, at, doneAt }) =>
  t >= at ? (
    <div
      className={cn(
        'flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-primary-line bg-card px-2.5 py-0.5 font-mono text-[11px] text-primary',
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
  const uploadProgress = Math.max(0, Math.min(1, (t - 3300) / 1700));
  const bubble = (
    at: number,
    className: string,
    content: React.ReactNode,
  ): React.ReactNode =>
    t >= at ? (
      <div
        className={cn(
          'shrink-0 rounded-2xl px-3 py-2 shadow-sm',
          POP_IN,
          className,
        )}
      >
        {content}
      </div>
    ) : null;
  return (
    <AppWindow
      title="Codex"
      icon={<Terminal className="size-3.5 text-primary" />}
    >
      <div className="flex h-full flex-col justify-end gap-2 overflow-hidden p-3 text-xs">
        {bubble(
          200,
          'ml-auto max-w-[85%] rounded-br-sm bg-brand text-white',
          pt('tutorial.s3.ask'),
        )}
        {CHAT_TOOLS.map((tool) => (
          <ToolChip
            key={tool.name}
            name={tool.name}
            t={t}
            at={tool.at}
            doneAt={tool.at + 450}
          />
        ))}
        {t >= 3200 ? (
          <div
            className={cn(
              'w-full max-w-[16rem] shrink-0 space-y-1 rounded-xl bg-card p-2 shadow-sm',
              POP_IN,
            )}
          >
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{pt('tutorial.s3.upload')}</span>
              <span className="font-mono text-primary">
                {Math.round(uploadProgress * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-primary-soft">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-150"
                style={{ width: `${uploadProgress * 100}%` }}
              />
            </div>
          </div>
        ) : null}
        {bubble(
          5600,
          'max-w-[85%] rounded-bl-sm bg-card text-foreground',
          pt('tutorial.s3.confirm'),
        )}
        {bubble(
          6900,
          'ml-auto rounded-br-sm bg-brand text-white',
          pt('tutorial.s3.yes'),
        )}
        <ToolChip name="publish_material" t={t} at={7400} doneAt={8000} />
        {bubble(
          8300,
          'flex max-w-[85%] items-start gap-1.5 rounded-bl-sm border border-coral-line bg-coral-soft text-coral-text',
          <>
            <PartyPopper className="mt-px size-3.5 shrink-0" />
            {pt('tutorial.s3.result')}
          </>,
        )}
      </div>
      {t >= 8300 && t < 10000 ? <Confetti /> : null}
    </AppWindow>
  );
};

export const SCENES: React.FC<SceneProps>[] = [
  ScenePrompt,
  SceneSetup,
  SceneUse,
];
