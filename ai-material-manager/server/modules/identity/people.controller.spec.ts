import { PeopleController } from './people.controller';
import type { FeishuBaseGateway } from '@server/modules/feishu/feishu-base.gateway';
import type { FeishuService } from '@server/modules/feishu/feishu.service';
import type { IdentityService } from './identity.service';
import type { Request } from 'express';

describe('organization people search', () => {
  const req = { userContext: { userId: 'ou_uploader' } } as Request;
  const search = jest.fn();
  const resolve = jest.fn();
  const controller = new PeopleController(
    { rows: jest.fn(async () => []) } as unknown as FeishuBaseGateway,
    {
      client: { directory: { v1: { employee: { search } } } },
    } as unknown as FeishuService,
    { resolve } as unknown as IdentityService,
  );
  beforeEach(() => {
    search.mockReset();
    resolve.mockResolvedValue({ isVisitor: false });
  });
  it('finds people absent from the role table and keeps open_id plus pagination', async () => {
    search.mockResolvedValue({
      code: 0,
      data: {
        employees: [
          {
            base_info: {
              employee_id: 'ou_new',
              name: { name: { default_value: 'New colleague' } },
              departments: [{ name: { default_value: 'Marketing' } }],
            },
          },
        ],
        page_response: { has_more: true, page_token: 'next' },
      },
    });
    expect(await controller.listOptions(req, 'New', 'page2')).toEqual({
      items: [
        {
          openId: 'ou_new',
          label: 'New colleague',
          roleText: '',
          area: null,
          avatarUrl: null,
          departmentName: 'Marketing',
        },
      ],
      hasMore: true,
      pageToken: 'next',
    });
    expect(search.mock.calls[0][0].params.employee_id_type).toBe('open_id');
    expect(search.mock.calls[0][0].data.page_request.page_token).toBe('page2');
  });
  it('reports missing directory permission instead of claiming zero matches', async () => {
    search.mockResolvedValue({ code: 99991672 });
    await expect(controller.listOptions(req, 'New')).rejects.toThrow(
      'directory:employee:search',
    );
  });
  it('does not let visitors enumerate the directory', async () => {
    resolve.mockResolvedValue({ isVisitor: true });
    await expect(controller.listOptions(req, 'New')).rejects.toThrow();
    expect(search).not.toHaveBeenCalled();
  });
});
