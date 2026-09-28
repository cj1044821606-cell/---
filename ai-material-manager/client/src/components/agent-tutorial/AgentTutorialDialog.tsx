import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  KeyRound,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import { getAgentConnection } from '@client/src/api/agent';
import CopyBlock, {
  type CopyBlockLabels,
} from '@client/src/components/CopyBlock';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { useI18n } from '@client/src/hooks/use-i18n';
import {
  AGENT_TOKEN_PLACEHOLDER,
  buildCodexConfig,
  copyText,
} from '@client/src/lib/agent-config';
import { cn } from '@/lib/utils';
import { SCENES, SCENE_DURATIONS, type SceneProps } from './TutorialScenes';
import { TUTORIAL_I18N } from './tutorial-i18n';
import { prefersReducedMotion } from './tutorial-state';

type Os = 'mac' | 'win';

/** 每段动画播完后停留一会儿再自动翻页，给用户读说明的时间 */
const HOLD_AFTER_SCENE_MS = 2500;
const TICK_MS = 60;
const FINAL_FRAME = Number.MAX_SAFE_INTEGER;

const STEP_KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;

function detectOs(): Os {
  return /Win/i.test(navigator.userAgent) ? 'win' : 'mac';
}

export interface AgentTutorialDialogProps {
  open: boolean;
  /** 关闭时把弹窗当前位置交给调用方，用来播放“收进图标”的动画 */
  onClose: (rect: DOMRect | null) => void;
  onGoCreate: (rect: DOMRect | null) => void;
}

const AgentTutorialDialog: React.FC<AgentTutorialDialogProps> = ({
  open,
  onClose,
  onGoCreate,
}) => {
  const { language, t: translate } = useI18n();
  const pt = (key: string): string =>
    TUTORIAL_I18N[key]?.[language] ?? translate(key);
  const labels: CopyBlockLabels = {
    copy: pt('tutorial.copy'),
    copied: pt('tutorial.copied'),
    failed: pt('tutorial.copyFailed'),
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  // 用户动手翻页/复制后就不再自动翻页，但当前这段动画照常播完
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [os, setOs] = useState<Os>(detectOs);
  const reduced = prefersReducedMotion();

  const connection = useQuery({
    queryKey: ['agent-connection'],
    queryFn: getAgentConnection,
    staleTime: Infinity,
    enabled: open,
  });
  const serverName = connection.data?.serverName ?? 'transsion-ess-materials';
  const mcpUrl = connection.data?.mcpUrl ?? `${window.location.origin}/mcp`;

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setElapsed(0);
    setPlaying(!reduced);
    setAutoAdvance(true);
  }, [open, reduced]);

  useEffect(() => {
    if (!open || !playing || reduced) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      setElapsed((value) => value + delta);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [open, playing, reduced, step]);

  const sceneDuration = SCENE_DURATIONS[step];
  const isLast = step === STEP_KEYS.length - 1;

  useEffect(() => {
    if (!playing || reduced) return;
    if (elapsed < sceneDuration) return;
    if (
      autoAdvance &&
      !isLast &&
      elapsed >= sceneDuration + HOLD_AFTER_SCENE_MS
    ) {
      setStep((value) => value + 1);
      setElapsed(0);
    } else if (!autoAdvance || isLast) {
      setPlaying(false);
    }
  }, [elapsed, sceneDuration, playing, autoAdvance, isLast, reduced]);

  const goTo = (index: number): void => {
    setAutoAdvance(false);
    setStep(index);
    setElapsed(0);
    setPlaying(!reduced);
  };

  const sceneFinished = reduced || elapsed >= sceneDuration;
  const togglePlay = (): void => {
    if (sceneFinished) {
      setElapsed(0);
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  };

  const rect = (): DOMRect | null =>
    contentRef.current?.getBoundingClientRect() ?? null;

  const Scene: React.FC<SceneProps> = SCENES[step];
  const stepKey = STEP_KEYS[step];
  const macOnly = os === 'mac';

  const codexSnippet = buildCodexConfig(
    { mcpUrl, serverName },
    AGENT_TOKEN_PLACEHOLDER,
  );
  const openConfigCommand = macOnly
    ? 'mkdir -p ~/.codex && touch ~/.codex/config.toml && open -e ~/.codex/config.toml'
    : 'New-Item -ItemType Directory -Force "$HOME\\.codex" | Out-Null; if (!(Test-Path "$HOME\\.codex\\config.toml")) { New-Item "$HOME\\.codex\\config.toml" | Out-Null }; notepad "$HOME\\.codex\\config.toml"';
  const unzipCommand = macOnly
    ? 'mkdir -p ~/.codex/skills && unzip -o ~/Downloads/material-assistant-skill.zip -d ~/.codex/skills/'
    : 'New-Item -ItemType Directory -Force "$HOME\\.codex\\skills" | Out-Null; Expand-Archive -Force "$HOME\\Downloads\\material-assistant-skill.zip" "$HOME\\.codex\\skills"';

  const osToggle = (
    <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
      {(['mac', 'win'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            setAutoAdvance(false);
            setOs(value);
          }}
          className={cn(
            'rounded px-2.5 py-1 transition-colors',
            os === value
              ? 'bg-primary-soft font-medium text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {pt(`tutorial.os.${value}`)}
        </button>
      ))}
    </div>
  );

  const copyPrompt = async (text: string): Promise<void> => {
    setAutoAdvance(false);
    if (await copyText(text)) toast.success(pt('tutorial.copied'));
    else toast.error(pt('tutorial.copyFailed'));
  };

  const extras: Record<(typeof STEP_KEYS)[number], React.ReactNode> = {
    s1: null,
    s2: (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {pt(`tutorial.s2.path.${os}`)}
          </span>
          {osToggle}
        </div>
        <CopyBlock text={codexSnippet} labels={labels} />
        <CopyBlock
          text={openConfigCommand}
          hint={pt(`tutorial.s2.open.${os}`)}
          labels={labels}
        />
      </div>
    ),
    s3: null,
    s4: (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href="/api/agent/skill.zip"
              download
              onClick={() => setAutoAdvance(false)}
            >
              <Download className="size-4" />
              material-assistant-skill.zip
            </a>
          </Button>
          {osToggle}
        </div>
        <CopyBlock
          text={unzipCommand}
          hint={pt(`tutorial.s4.unzip.${os}`)}
          labels={labels}
        />
      </div>
    ),
    s5: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{pt('tutorial.s5.try')}</p>
        <div className="flex flex-wrap gap-2">
          {['tutorial.s5.p1', 'tutorial.s5.p2', 'tutorial.s5.p3'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => void copyPrompt(pt(key))}
              className="rounded-full border border-primary-line bg-primary-soft px-3 py-1.5 text-left text-xs text-primary transition-colors hover:border-primary/50"
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
        className="top-4 max-h-[calc(100dvh-2rem)] max-w-2xl translate-y-0 overflow-y-auto p-0 sm:top-[6vh] sm:max-h-[88vh] sm:max-w-2xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div ref={contentRef} className="min-w-0 space-y-4 p-4 sm:p-6">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>{pt('tutorial.title')}</DialogTitle>
            <DialogDescription>{pt('tutorial.subtitle')}</DialogDescription>
          </DialogHeader>

          {/* 分段进度条：已完成的段填满，当前段随动画推进，可点击跳转 */}
          <div className="flex gap-1.5" role="tablist">
            {STEP_KEYS.map((key, index) => {
              const fill =
                index < step
                  ? 1
                  : index === step
                    ? Math.min(1, reduced ? 1 : elapsed / sceneDuration)
                    : 0;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={index === step}
                  aria-label={pt(`tutorial.${key}.title`)}
                  onClick={() => goTo(index)}
                  className="group h-4 flex-1 rounded-sm py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <span className="block h-1 overflow-hidden rounded-full bg-accent group-hover:bg-primary-line">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${fill * 100}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-[230px] sm:h-[250px]">
            <Scene
              key={step}
              t={reduced ? FINAL_FRAME : elapsed}
              pt={pt}
              mcpUrl={mcpUrl}
              serverName={serverName}
              os={os}
            />
          </div>

          <div
            key={stepKey}
            className="animate-in fade-in-0 slide-in-from-bottom-1 space-y-3 duration-300"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {pt(`tutorial.${stepKey}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {pt(`tutorial.${stepKey}.body`)}
              </p>
            </div>
            {extras[stepKey]}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={step === 0}
                onClick={() => goTo(step - 1)}
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">{pt('tutorial.prev')}</span>
              </Button>
              {!reduced ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={
                    sceneFinished
                      ? pt('tutorial.replay')
                      : playing
                        ? pt('tutorial.pause')
                        : pt('tutorial.play')
                  }
                  onClick={togglePlay}
                >
                  {sceneFinished ? (
                    <RotateCcw className="size-4" />
                  ) : playing ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>
              ) : null}
              <span className="px-1 text-xs text-muted-foreground">
                {pt('tutorial.stepOf')
                  .replace('{n}', String(step + 1))
                  .replace('{total}', String(STEP_KEYS.length))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {step === 0 || isLast ? (
                <Button
                  type="button"
                  variant={isLast ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => onGoCreate(rect())}
                >
                  <KeyRound className="size-4" />
                  {pt('tutorial.goCreate')}
                </Button>
              ) : null}
              {isLast ? (
                <Button type="button" size="sm" onClick={() => onClose(rect())}>
                  {pt('tutorial.done')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant={step === 0 ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => goTo(step + 1)}
                >
                  {pt('tutorial.next')}
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentTutorialDialog;
