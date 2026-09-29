import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import { Bot, Download, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createAgentToken,
  getAgentConnection,
  listAgentTokens,
  revokeAgentToken,
} from "@client/src/api/agent";
import SharedCopyBlock from "@client/src/components/CopyBlock";
import { Button } from "@client/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/src/components/ui/card";
import { Input } from "@client/src/components/ui/input";
import { NativeSelect } from "@client/src/components/ui/native-select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/src/components/ui/tabs";
import { useI18n } from "@client/src/hooks/use-i18n";
import {
  AGENT_TOKEN_PLACEHOLDER,
  buildAgentConfigs,
  buildSetupPrompt,
} from "@client/src/lib/agent-config";
import {
  AGENT_TOKEN_TTL_OPTIONS,
  type AgentTokenItem,
  type AgentTokenTtlDays,
} from "@shared/agent";
import { AGENT_I18N } from "./agent-i18n";

const TOKENS_QUERY_KEY = ["agent-tokens"] as const;
const CONNECTION_QUERY_KEY = ["agent-connection"] as const;

function serverMessage(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.error?.message;
    if (typeof message === "string" && message) return message;
  }
  return null;
}

const CopyBlock: React.FC<{
  text: string;
  hint?: string;
  pt: (key: string) => string;
}> = ({ text, hint, pt }) => (
  <SharedCopyBlock
    text={text}
    hint={hint}
    labels={{
      copy: pt("agent.copy"),
      copied: pt("agent.copied"),
      failed: pt("agent.copyFailed"),
    }}
  />
);

export const AgentAccessCard: React.FC = () => {
  const { language, t } = useI18n();
  const pt = (key: string): string => AGENT_I18N[key]?.[language] ?? t(key);
  const queryClient = useQueryClient();

  const [label, setLabel] = useState<string>("");
  const [ttlDays, setTtlDays] = useState<AgentTokenTtlDays>(90);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const connection = useQuery({
    queryKey: CONNECTION_QUERY_KEY,
    queryFn: getAgentConnection,
    staleTime: Infinity,
  });
  const tokens = useQuery({
    queryKey: TOKENS_QUERY_KEY,
    queryFn: listAgentTokens,
  });

  const create = useMutation({
    mutationFn: createAgentToken,
    onSuccess: (result) => {
      setFreshToken(result.token);
      setLabel("");
      void queryClient.invalidateQueries({ queryKey: TOKENS_QUERY_KEY });
    },
    onError: (error: unknown) => {
      toast.error(serverMessage(error) ?? pt("agent.error"));
    },
  });

  const revoke = useMutation({
    mutationFn: revokeAgentToken,
    onSuccess: () => {
      toast.success(pt("agent.revoked"));
      void queryClient.invalidateQueries({ queryKey: TOKENS_QUERY_KEY });
    },
    onError: (error: unknown) => {
      toast.error(serverMessage(error) ?? pt("agent.error"));
    },
  });

  const configs = useMemo(
    () =>
      connection.data
        ? {
            ...buildAgentConfigs(
              connection.data,
              freshToken ?? AGENT_TOKEN_PLACEHOLDER,
            ),
            prompt: buildSetupPrompt(
              connection.data,
              freshToken ?? AGENT_TOKEN_PLACEHOLDER,
              language,
            ),
          }
        : null,
    [connection.data, freshToken, language],
  );

  const items: AgentTokenItem[] = tokens.data?.items ?? [];
  const atLimit: boolean =
    tokens.data !== undefined && items.length >= tokens.data.limit;
  const formatDate = (iso: string): string => dayjs(iso).format("YYYY-MM-DD");

  const onCreate = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!label.trim() || create.isPending) return;
    create.mutate({ label: label.trim(), ttlDays });
  };

  const onRevoke = (item: AgentTokenItem): void => {
    if (!window.confirm(pt("agent.revoke.confirm").replace("{label}", item.label))) {
      return;
    }
    revoke.mutate(item.id);
  };

  return (
    <Card id="agent-access" className="scroll-mt-20">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="size-4 text-primary" />
          {pt("agent.title")}
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {pt("agent.intro")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-4 pt-0">
        {connection.data ? (
          <CopyBlock
            text={connection.data.mcpUrl}
            hint={pt("agent.mcpUrl")}
            pt={pt}
          />
        ) : null}

        {/* ① 创建令牌 */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            {pt("agent.step1")}
          </h3>
          <form
            onSubmit={onCreate}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <label className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">
                {pt("agent.label")}
              </span>
              <Input
                value={label}
                maxLength={40}
                placeholder={pt("agent.label.placeholder")}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {pt("agent.ttl")}
              </span>
              <NativeSelect
                value={String(ttlDays)}
                onChange={(e) =>
                  setTtlDays(Number(e.target.value) as AgentTokenTtlDays)
                }
                className="sm:w-28"
              >
                {AGENT_TOKEN_TTL_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {pt("agent.ttl.days").replace("{n}", String(days))}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <Button
              type="submit"
              disabled={!label.trim() || create.isPending || atLimit}
              className="min-h-[38px]"
            >
              <KeyRound className="size-4" />
              {create.isPending ? pt("agent.creating") : pt("agent.create")}
            </Button>
          </form>

          {freshToken ? (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-medium text-foreground">
                {pt("agent.created.title")}
              </p>
              <CopyBlock text={freshToken} pt={pt} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFreshToken(null)}
              >
                {pt("agent.created.done")}
              </Button>
            </div>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {pt("agent.safety")}
          </p>
        </section>

        {/* ② 配置 */}
        {configs ? (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              {pt("agent.step2")}
            </h3>
            {!freshToken ? (
              <p className="text-xs text-muted-foreground">
                {pt("agent.config.placeholder")}
              </p>
            ) : null}
            <Tabs defaultValue="prompt">
              <TabsList className="h-auto flex-wrap gap-y-0">
                <TabsTrigger value="prompt">{pt("agent.config.promptTab")}</TabsTrigger>
                <TabsTrigger value="codex">Codex</TabsTrigger>
                <TabsTrigger value="claudeCode">Claude Code</TabsTrigger>
                <TabsTrigger value="claudeDesktop">Claude Desktop</TabsTrigger>
                <TabsTrigger value="generic">Cursor / JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="prompt">
                <CopyBlock
                  text={configs.prompt}
                  hint={pt("agent.config.prompt")}
                  pt={pt}
                />
              </TabsContent>
              <TabsContent value="codex">
                <CopyBlock
                  text={configs.codex}
                  hint={pt("agent.config.codex")}
                  pt={pt}
                />
              </TabsContent>
              <TabsContent value="claudeCode">
                <CopyBlock
                  text={configs.claudeCode}
                  hint={pt("agent.config.claudeCode")}
                  pt={pt}
                />
              </TabsContent>
              <TabsContent value="claudeDesktop">
                <CopyBlock
                  text={configs.claudeDesktop}
                  hint={pt("agent.config.claudeDesktop")}
                  pt={pt}
                />
              </TabsContent>
              <TabsContent value="generic">
                <CopyBlock
                  text={configs.generic}
                  hint={pt("agent.config.generic")}
                  pt={pt}
                />
              </TabsContent>
            </Tabs>
          </section>
        ) : null}

        {/* ③ Skill */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            {pt("agent.step3")}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {pt("agent.skill.desc")}
          </p>
          <Button asChild variant="outline" size="sm">
            <a href="/api/agent/skill.zip" download>
              <Download className="size-4" />
              {pt("agent.skill.download")}
            </a>
          </Button>
        </section>

        {/* 令牌列表 */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            {pt("agent.tokens")}
          </h3>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {pt("agent.tokens.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="truncate text-sm text-foreground">
                      {item.label}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {pt("agent.tokens.expires").replace(
                        "{date}",
                        formatDate(item.expiresAt),
                      )}
                      {" · "}
                      {item.lastUsedAt
                        ? pt("agent.tokens.lastUsed").replace(
                            "{date}",
                            formatDate(item.lastUsedAt),
                          )
                        : pt("agent.tokens.never")}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => onRevoke(item)}
                  >
                    <Trash2 className="size-4" />
                    {pt("agent.revoke")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
};
