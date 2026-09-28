import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import { Bot, Check, Copy, Download, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createAgentToken,
  getAgentConnection,
  listAgentTokens,
  revokeAgentToken,
} from "@client/src/api/agent";
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
  AGENT_TOKEN_TTL_OPTIONS,
  type AgentConnectionInfo,
  type AgentTokenItem,
  type AgentTokenTtlDays,
} from "@shared/agent";
import { AGENT_I18N } from "./agent-i18n";

const TOKENS_QUERY_KEY = ["agent-tokens"] as const;
const CONNECTION_QUERY_KEY = ["agent-connection"] as const;
const TOKEN_PLACEHOLDER = "<你的令牌>";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 非 HTTPS 或权限受限时退回到选区复制
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function serverMessage(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.error?.message;
    if (typeof message === "string" && message) return message;
  }
  return null;
}

function buildConfigs(
  info: AgentConnectionInfo,
  token: string,
): { claudeCode: string; claudeDesktop: string; generic: string } {
  const name = info.serverName;
  return {
    claudeCode: `claude mcp add --transport http ${name} ${info.mcpUrl} --header "Authorization: Bearer ${token}"`,
    claudeDesktop: JSON.stringify(
      {
        mcpServers: {
          [name]: {
            command: "npx",
            args: [
              "-y",
              "mcp-remote",
              info.mcpUrl,
              "--header",
              "Authorization:${AUTH_HEADER}",
            ],
            env: { AUTH_HEADER: `Bearer ${token}` },
          },
        },
      },
      null,
      2,
    ),
    generic: JSON.stringify(
      {
        mcpServers: {
          [name]: {
            url: info.mcpUrl,
            headers: { Authorization: `Bearer ${token}` },
          },
        },
      },
      null,
      2,
    ),
  };
}

const CopyBlock: React.FC<{
  text: string;
  hint?: string;
  pt: (key: string) => string;
}> = ({ text, hint, pt }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const onCopy = async (): Promise<void> => {
    if (await copyText(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error(pt("agent.copyFailed"));
    }
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 text-xs text-muted-foreground">{hint ?? ""}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => void onCopy()}
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? pt("agent.copied") : pt("agent.copy")}
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto rounded-md border border-border bg-accent/40 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-foreground">
        {text}
      </pre>
    </div>
  );
};

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
        ? buildConfigs(connection.data, freshToken ?? TOKEN_PLACEHOLDER)
        : null,
    [connection.data, freshToken],
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
    <Card>
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
            <Tabs defaultValue="claudeCode">
              <TabsList className="flex-wrap">
                <TabsTrigger value="claudeCode">Claude Code</TabsTrigger>
                <TabsTrigger value="claudeDesktop">Claude Desktop</TabsTrigger>
                <TabsTrigger value="generic">Cursor / JSON</TabsTrigger>
              </TabsList>
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
