import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@server/common/auth/need-login.decorator';
import { FeishuBaseGateway } from '@server/modules/feishu/feishu-base.gateway';
import { FeishuService } from '@server/modules/feishu/feishu.service';
import { IdentityService } from './identity.service';

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
  departmentName?: string;
}

@Controller('api/people')
export class PeopleController {
  constructor(
    private readonly base: FeishuBaseGateway,
    private readonly feishu: FeishuService,
    private readonly identity: IdentityService,
  ) {}

  @NeedLogin()
  @Get('options')
  async listOptions(
    @Req() req: Request,
    @Query('q') query?: string,
    @Query('pageToken') pageToken?: string,
  ): Promise<{ items: PersonOption[]; hasMore?: boolean; pageToken?: string }> {
    if (query?.trim()) {
      if ((await this.identity.resolve(req.userContext.userId)).isVisitor)
        throw new ForbiddenException('仅组织内用户可搜索成员');
      if (query.length > 100 || (pageToken?.length ?? 0) > 2000)
        throw new BadRequestException('搜索参数过长');
      const response = await this.feishu.client.directory.v1.employee.search({
        params: {
          employee_id_type: 'open_id',
          department_id_type: 'open_department_id',
        },
        data: {
          query: query.trim(),
          page_request: {
            page_size: 20,
            ...(pageToken ? { page_token: pageToken } : {}),
          },
          required_fields: [
            'base_info.employee_id',
            'base_info.name.name',
            'base_info.departments',
            'base_info.avatar',
          ],
        },
      });
      if (response.code !== 0) {
        if (response.code === 99991672 || response.code === 99991679)
          throw new ForbiddenException(
            '组织成员搜索权限尚未开通，请联系管理员配置 directory:employee:search 并发布应用',
          );
        throw new ServiceUnavailableException('组织成员搜索暂不可用，请重试');
      }
      if (response.data?.employees?.some(({ base_info: info }) => info?.employee_id && !info.name?.name?.default_value)) {
        throw new ForbiddenException('搜索结果缺少姓名，请开通 directory:employee.base.name.name:read 权限');
      }
      return {
        items: (response.data?.employees ?? []).flatMap(
          ({ base_info: info }) =>
            info?.employee_id
              ? [
                  {
                    openId: info.employee_id,
                    label:
                      info.name?.name?.default_value ??
                      info.name?.another_name ??
                      info.employee_id,
                    roleText: '',
                    area: null,
                    avatarUrl: info.avatar?.avatar_72 ?? null,
                    departmentName: (info.departments ?? [])
                      .map((department) => department.name?.default_value)
                      .filter(Boolean)
                      .join(' / '),
                  },
                ]
              : [],
        ),
        hasMore: response.data?.page_response?.has_more ?? false,
        pageToken: response.data?.page_response?.page_token,
      };
    }
    const rows = await this.base.rows<PersonnelRow>('people');
    const byId = new Map<string, PersonOption>();
    for (const row of rows) {
      for (const profile of row.appPersonProfiles) {
        const openId = profile.id;
        const current = byId.get(openId);
        const roleText = [current?.roleText, row.text]
          .filter(Boolean)
          .join(' / ');
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

  @NeedLogin()
  @Get('resolve')
  async resolve(@Query('ids') ids = ''): Promise<{ items: PersonOption[] }> {
    const userIds = [...new Set(ids.split(',').filter(Boolean))];
    if (
      !userIds.length ||
      userIds.length > 20 ||
      userIds.some((id) => !/^ou_[a-zA-Z0-9]+$/.test(id))
    )
      throw new BadRequestException('无效的人员 ID');
    const response = await this.feishu.client.contact.user.batch({
      params: { user_ids: userIds, user_id_type: 'open_id' },
    });
    if (response.code !== 0)
      throw new ServiceUnavailableException('人员资料暂不可用');
    return {
      items: (response.data?.items ?? []).flatMap((user) =>
        user.open_id
          ? [
              {
                openId: user.open_id,
                label: user.name,
                roleText: '',
                area: null,
                avatarUrl: user.avatar?.avatar_72 ?? null,
              },
            ]
          : [],
      ),
    };
  }
}
