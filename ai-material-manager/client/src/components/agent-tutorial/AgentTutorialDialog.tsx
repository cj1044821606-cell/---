import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ClipboardPaste,
  Copy,
  MessageSquarePlus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { createAgentToken, getAgentConnection } from '@client/src/api/agent';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { useI18n } from '@client/src/hooks/use-i18n';
import { buildSetupPrompt, copyText } from '@client/src/lib/agent-config';
import { cn } from '@/lib/utils';
import { SCENES, SCENE_DURATIONS, type SceneProps } from './TutorialScenes';
import { TUTORIAL_I18N } from './tutorial-i18n';
import './tutorial.css';

const TICK_MS = 50;
const STEP_KEYS = ['s1', 's2', 's3'] as const;
const TOKEN_TTL_DAYS = 90;

function serverMessage(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.error?.message;
    if (typeof message === 'string' && message) return message;
  }
  return null;
}

export interface AgentTutorialDialogProps {
  open: boolean;
  /** 关闭时把弹窗当前位置交给调用方，用来播放“收进图标”的动画 */
  onClose: (rect: DOMRect | null) => void;
}

const AgentTutorialDialog: React.FC<AgentTutorialDialogProps> = ({
  open,
  onClose,
}) => {
  const { language, t: translate } = useI18n();
  const pt = (key: string): string =>
    TUTORIAL_I18N[key]?.[language] ?? translate(key);
  const queryClient = useQueryClient();

  const contentRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  // 只保存在内存里：关掉页面就没了，用户弄丢了再生成一个即可
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const connection = useQuery({
    queryKey: ['agent-connection'],
    queryFn: getAgentConnection,
    staleTime: Infinity,
    enabled: open,
  });

  const prompt = useMemo(
    () =>
      token && connection.data
        ? buildSetupPrompt(connection.data, token, language)
        : null,
    [token, connection.data, language],
  );

  const generate = useMutation({
    mutationFn: () =>
      createAgentToken({
        label: `Codex · ${dayjs().format('YYYY-MM-DD HH:mm')}`,
        ttlDays: TOKEN_TTL_DAYS,
      }),
    onSuccess: (result) => {
      setToken(result.token);
      setCopied(false);
      void queryClient.invalidateQueries({ queryKey: ['agent-tokens'] });
    },
    onError: (error: unknown) => {
      toast.error(serverMessage(error) ?? pt('tutorial.s1.error'));
    },
  });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setElapsed(0);
  }, [open]);

  const sceneDuration = SCENE_DURATIONS[step];
  const sceneFinished = elapsed >= sceneDuration;

  // 每一步进入后自动播放一遍动画，播完停在最后一帧
  useEffect(() => {
    if (!open || sceneFinished) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      setElapsed((value) => value + delta);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [open, step, sceneFinished]);

  const goTo = (index: number): void => {
    setStep(index);
    setElapsed(0);
  };

  const rect = (): DOMRect | null =>
    contentRef.current?.getBoundingClientRect() ?? null;

  const copy = async (text: string): Promise<boolean> => {
    const ok = await copyText(text);
    if (!ok) toast.error(pt('tutorial.copyFailed'));
    return ok;
  };

  const copyPrompt = async (): Promise<void> => {
    if (prompt && (await copy(prompt))) {
      setCopied(true);
      toast.success(pt('tutorial.copied'));
    }
  };

  const Scene: React.FC<SceneProps> = SCENES[step];
  const stepKey = STEP_KEYS[step];
  const isLast = step === STEP_KEYS.length - 1;

  const extras: Record<(typeof STEP_KEYS)[number], React.ReactNode> = {
    s1: prompt ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-success-text">
          <Check className="size-4" />
          {pt('tutorial.s1.ready')}
        </div>
        <pre className="max-h-32 overflow-auto rounded-xl border border-primary-line bg-primary-soft/60 p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-foreground">
          {prompt}
        </pre>
        <button
          type="button"
          onClick={() => void copyPrompt()}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-lg transition-[transform,background] duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto',
            copied ? 'bg-success' : 'tut-glow bg-brand',
          )}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? pt('tutorial.copied') : pt('tutorial.s1.copyBig')}
        </button>
        <p className="flex gap-2 rounded-xl bg-amber-soft px-3 py-2 text-xs leading-relaxed text-amber-text">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          {pt('tutorial.s1.warn')}
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        <button
          type="button"
          disabled={generate.isPending || !connection.data}
          onClick={() => generate.mutate()}
          className="tut-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 sm:w-auto"
        >
          <Sparkles className="size-4" />
          {generate.isPending
            ? pt('tutorial.s1.generating')
            : pt('tutorial.s1.generate')}
        </button>
        <p className="text-xs text-muted-foreground">
          {pt('tutorial.s1.generateHint')}
        </p>
      </div>
    ),
    s2: (
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { key: 'tutorial.s2.do1', icon: MessageSquarePlus },
          { key: 'tutorial.s2.do2', icon: ClipboardPaste },
          { key: 'tutorial.s2.do3', icon: ShieldCheck },
          { key: 'tutorial.s2.do4', icon: RotateCcw },
        ].map(({ key, icon: Icon }, index) => (
          <li
            key={key}
            className="relative flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-xs leading-snug text-foreground shadow-xs"
          >
            <span className="flex items-center justify-between">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <Icon className="size-4 text-primary" />
            </span>
            {pt(key)}
          </li>
        ))}
      </ol>
    ),
    s3: (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {pt('tutorial.s3.try')}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            'tutorial.s3.p0',
            'tutorial.s3.p1',
            'tutorial.s3.p2',
            'tutorial.s3.p3',
          ].map((key, index) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                void copy(pt(key)).then(
                  (ok) => ok && toast.success(pt('tutorial.copied')),
                )
              }
              className={cn(
                'rounded-full border px-3 py-1.5 text-left text-xs transition-[transform,border-color] duration-150 hover:-translate-y-0.5',
                [
                  'border-primary-line bg-primary-soft text-primary',
                  'border-coral-line bg-coral-soft text-coral-text',
                  'border-amber/50 bg-amber-soft text-amber-text',
                  'border-success/30 bg-success-soft text-success-text',
                ][index],
              )}
            >
              “{pt(key)}”
            </button>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose(rect()))}
    >
      {/* 顶部对齐：各步内容高度不同，居中会让弹窗上下跳 */}
      <DialogContent
        showCloseButton={false}
        className="top-4 max-h-[calc(100dvh-2rem)] max-w-2xl translate-y-0 gap-0 overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl sm:top-[5vh] sm:max-h-[90vh] sm:max-w-2xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div ref={contentRef} className="min-w-0">
          {/* 头图：品牌渐变 + 缓慢漂移的光斑 */}
          <div className="relative overflow-hidden bg-brand px-5 pt-5 pb-4 text-white sm:px-7 sm:pt-6">
            <span className="tut-blob pointer-events-none absolute -top-16 -left-10 size-48 rounded-full bg-white/20 blur-2xl" />
            <span
              className="tut-blob pointer-events-none absolute -right-12 -bottom-20 size-56 rounded-full bg-amber/40 blur-3xl"
              style={{ animationDelay: '-4s' }}
            />
            <span className="tut-twinkle pointer-events-none absolute top-6 right-24 size-1.5 rounded-full bg-white" />
            <span
              className="tut-twinkle pointer-events-none absolute top-16 right-44 size-1 rounded-full bg-white"
              style={{ animationDelay: '-1.2s' }}
            />
            <DialogClose className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>

            <div className="relative space-y-1.5 pr-10">
              <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                {pt('tutorial.title')}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-white/85">
                {pt('tutorial.subtitle')}
              </DialogDescription>
            </div>

            <div
              className="relative mt-4 grid grid-cols-3 gap-2"
              role="tablist"
            >
              {STEP_KEYS.map((key, index) => {
                const active = index === step;
                const done = index < step;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => goTo(index)}
                    className={cn(
                      'relative flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-xl px-2 py-2 text-center text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none sm:flex-row sm:gap-2 sm:px-2.5 sm:text-left',
                      active
                        ? 'bg-white text-primary shadow-lg'
                        : 'bg-white/15 text-white hover:bg-white/25',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                        active
                          ? 'bg-brand text-white'
                          : done
                            ? 'bg-white text-primary'
                            : 'bg-white/25 text-white',
                      )}
                    >
                      {done ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="truncate">
                      {pt(`tutorial.${key}.tab`)}
                    </span>
                    {active ? (
                      <span
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-brand"
                        style={{
                          transform: `scaleX(${Math.min(1, elapsed / sceneDuration)})`,
                          transformOrigin: 'left',
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-7">
            {/* 舞台：柔和的蓝、珊瑚光斑背景上漂浮着演示窗口 */}
            <div className="relative h-[250px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_15%_20%,hsl(214_100%_92%),transparent_55%),radial-gradient(circle_at_90%_85%,hsl(7_100%_92%),transparent_50%),radial-gradient(circle_at_70%_10%,hsl(42_100%_92%),transparent_40%)] bg-surface-sunken p-4 sm:h-[270px]">
              <span className="tut-twinkle pointer-events-none absolute top-5 left-6 size-1.5 rounded-full bg-primary/50" />
              <span
                className="tut-twinkle pointer-events-none absolute right-8 bottom-6 size-2 rounded-full bg-coral/60"
                style={{ animationDelay: '-0.8s' }}
              />
              <div
                key={step}
                className="animate-in fade-in-0 slide-in-from-right-6 h-full duration-500"
              >
                <Scene t={elapsed} pt={pt} />
              </div>
              {sceneFinished ? (
                <button
                  type="button"
                  onClick={() => setElapsed(0)}
                  className="animate-in fade-in-0 absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-primary shadow-sm transition-colors hover:bg-white"
                >
                  <RotateCcw className="size-3" />
                  {pt('tutorial.replay')}
                </button>
              ) : null}
            </div>

            <div
              key={stepKey}
              className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-3 duration-300"
            >
              <div className="space-y-1">
                <p className="text-brand text-xs font-bold tracking-wide">
                  {pt('tutorial.step').replace('{n}', String(step + 1))}
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  {pt(`tutorial.${stepKey}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {pt(`tutorial.${stepKey}.body`)}
                </p>
              </div>
              {extras[stepKey]}
            </div>

            <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-2 border-t border-border bg-background/90 px-5 py-4 backdrop-blur-md sm:-mx-7 sm:-mb-7 sm:px-7">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => goTo(step - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                {pt('tutorial.prev')}
              </button>
              <button
                type="button"
                onClick={() => (isLast ? onClose(rect()) : goTo(step + 1))}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0',
                  sceneFinished && (step !== 0 || prompt) && 'tut-glow',
                )}
              >
                {isLast ? pt('tutorial.done') : pt('tutorial.next')}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentTutorialDialog;
