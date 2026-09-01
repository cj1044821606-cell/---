import { Controller, Get } from "@nestjs/common";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";

interface PersonnelRow extends Record<string, unknown> {
  baseRecordId: string;
  text: string | null;
  appPerson: string[];
  appPersonProfiles: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
  }>;
  areaIdentifier: string | null;
}

export interface PersonOption {
  openId: string;
  label: string;
  roleText: string;
  area: string | null;
  avatarUrl: string | null;
}

@Controller("api/people")
export class PeopleController {
  constructor(private readonly base: FeishuBaseGateway) {}

  @NeedLogin()
  @Get("options")
  async listOptions(): Promise<{ items: PersonOption[] }> {
    const rows = await this.base.rows<PersonnelRow>("people");
    const byId = new Map<string, PersonOption>();
    for (const row of rows) {
      for (const profile of row.appPersonProfiles) {
        const openId = profile.id;
        const current = byId.get(openId);
        const roleText = [current?.roleText, row.text]
          .filter(Boolean)
          .join(" / ");
        byId.set(openId, {
          openId,
          label: profile.name,
          roleText,
          area: current?.area ?? row.areaIdentifier,
          avatarUrl: current?.avatarUrl ?? profile.avatarUrl,
        });
      }
    }
    return { items: [...byId.values()] };
  }
}
