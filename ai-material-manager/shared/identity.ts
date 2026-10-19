export type Lang = "zh" | "en";

export type AppRole =
  | "策划"
  | "设计师"
  | "销售"
  | "区域营销"
  | "审核人"
  | "维护者";

export interface Identity {
  userId: string;
  roles: AppRole[];
  area: string | null;
  isVisitor: boolean;
  multiRole: boolean;
  defaultLanding: "inbox" | "library";
  defaultLanguage: "zh" | "en";
  canEditMaterial: boolean;
  isMaintainer: boolean;
  isHqAuditor: boolean;
  /** 市场部（含下级部门）或人员表角色含 策划 / 设计师 / 区域营销 */
  isUploadRole: boolean;
  /** granted 可用；denied 不在储能事业部也不在人员表；unverified 部门暂时无法验证 */
  accessState: AccessState;
  canAccess: boolean;
  /** 本人或上级部门命中配置的储能事业部 */
  inDivision: boolean;
  /** 本人或上级部门命中配置的市场部 */
  inMarketing: boolean;
  /** 事业部成员但不在人员表：可见范围与总部相同 */
  isDivisionMember: boolean;
}

export type AccessState = "granted" | "denied" | "unverified";
