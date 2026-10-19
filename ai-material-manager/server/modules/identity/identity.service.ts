import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import type { AppRole, Identity, Lang } from "@shared/identity";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import { DepartmentService, type DepartmentCheck } from "./department.service";

const KNOWN_ROLES: AppRole[] = [
  "策划",
  "设计师",
  "销售",
  "区域营销",
  "审核人",
  "维护者",
];

const INBOX_ROLES: AppRole[] = ["策划", "设计师", "审核人"];

const IDENTITY_CACHE_TTL_MS: number = 10 * 60 * 1000;

interface PersonnelRow extends Record<string, unknown> {
  baseRecordId: string;
  text: string | null;
  appPerson: string[];
  areaIdentifier: string | null;
}

interface RegionRow extends Record<string, unknown> {
  regionCode: string | null;
  defaultLanguage: string[];
}

function normalizeArea(areaIdentifier: string | null): string | null {
  if (!areaIdentifier) return null;
  const code: string = areaIdentifier.split("-")[0] ?? "";
  return code.trim() || null;
}

function mapRoleTitle(title: string | null, isHq: boolean): AppRole | null {
  if (!title) return null;
  if (title.includes("设计师")) return "设计师";
  if (title.includes("审核")) return "审核人";
  if (title.includes("维护")) return "维护者";
  if (title.includes("销售")) return "销售";
  if (title.includes("市场营销") || title.includes("Marketing")) {
    return isHq ? "策划" : "区域营销";
  }
  return null;
}

@Injectable()
export class IdentityService {
  constructor(
    private readonly base: FeishuBaseGateway,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly departments: DepartmentService,
  ) {}

  async resolve(userId: string): Promise<Identity> {
    const cacheKey = `identity:v4:${userId}`;
    const hit: Identity | null = await this.cache.get<Identity>(cacheKey);
    if (hit !== null) return hit;

    const check: DepartmentCheck = await this.departments.check(userId);
    const fresh: Identity = await this.buildIdentity(userId, check);
    // 部门验证失败的结果不缓存，避免一次接口抖动把人挡在门外 10 分钟
    if (check.state !== "failed") {
      await this.cache.set(cacheKey, fresh, IDENTITY_CACHE_TTL_MS);
    }
    return fresh;
  }

  private async buildIdentity(
    userId: string,
    check: DepartmentCheck,
  ): Promise<Identity> {
    const inDivision: boolean = check.state === "ok" && check.inDivision;
    const inMarketing: boolean = check.state === "ok" && check.inMarketing;
    const rows = (await this.base.rows<PersonnelRow>("people")).filter(
      (row) => row.appPerson.includes(userId),
    );

    const roles: AppRole[] = [];
    const rawArea: string | null =
      rows.find((row) => row.areaIdentifier)?.areaIdentifier ?? null;
    const area: string | null = normalizeArea(rawArea);
    const isHq: boolean = area === "HQ";

    for (const row of rows) {
      const role: AppRole | null = mapRoleTitle(row.text, isHq);
      if (role && KNOWN_ROLES.includes(role) && !roles.includes(role)) {
        roles.push(role);
      }
    }

    if (roles.length === 0) {
      // 不在人员表：部门未配置时沿用旧访客口径；配置后只放行储能事业部
      const accessState =
        check.state === "unconfigured" || inDivision
          ? "granted"
          : check.state === "failed"
            ? "unverified"
            : "denied";
      return {
        userId,
        roles: [],
        area: null,
        isVisitor: true,
        multiRole: false,
        defaultLanding: "library",
        defaultLanguage: "zh",
        canEditMaterial: false,
        isMaintainer: false,
        isHqAuditor: false,
        isUploadRole: accessState === "granted" && inMarketing,
        accessState,
        canAccess: accessState === "granted",
        inDivision,
        inMarketing,
        isDivisionMember: inDivision,
      };
    }

    const defaultLanguage: Lang = await this.resolveDefaultLanguage(area);

    const allInboxRoles: boolean = roles.every((role) =>
      INBOX_ROLES.includes(role),
    );

    return {
      userId,
      roles,
      area,
      isVisitor: false,
      multiRole: roles.length > 1,
      defaultLanding: allInboxRoles && roles.length === 1 ? "inbox" : "library",
      defaultLanguage,
      canEditMaterial:
        roles.includes("策划") ||
        roles.includes("审核人") ||
        roles.includes("维护者"),
      isMaintainer: roles.includes("维护者"),
      isHqAuditor: roles.includes("审核人") && area === "HQ",
      isUploadRole:
        inMarketing ||
        roles.includes("策划") ||
        roles.includes("设计师") ||
        roles.includes("区域营销"),
      accessState: "granted",
      canAccess: true,
      inDivision,
      inMarketing,
      isDivisionMember: false,
    };
  }

  private async resolveDefaultLanguage(area: string | null): Promise<Lang> {
    if (!area) return "zh";
    // 规格约定 HQ 用户默认中文，不走区域配置推导
    if (area === "HQ") return "zh";

    const rows = await this.base.rows<RegionRow>("region");
    const langs = rows.find((row) => row.regionCode === area)?.defaultLanguage;
    if (!langs || langs.length === 0) return "zh";

    const first: string = (langs[0] ?? "").toUpperCase();
    if (first.startsWith("CN") || first.includes("中")) return "zh";
    if (first.startsWith("EN")) return "en";
    return "zh";
  }
}
