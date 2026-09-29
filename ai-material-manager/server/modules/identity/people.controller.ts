import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@server/common/auth/need-login.decorator';
import { FeishuService } from '@server/modules/feishu/feishu.service';
import { PeopleService, type PersonOption } from './people.service';

@Controller('api/people')
export class PeopleController {
  constructor(
    private readonly feishu: FeishuService,
    private readonly people: PeopleService,
  ) {}

  @NeedLogin()
  @Get('options')
  async listOptions(
    @Req() req: Request,
    @Query('q') query?: string,
    @Query('pageToken') pageToken?: string,
  ): Promise<{ items: PersonOption[]; hasMore?: boolean; pageToken?: string }> {
    return this.people.listOptions(req.userContext.userId, query, pageToken);
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
