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
  isUploadRole: boolean;
}
