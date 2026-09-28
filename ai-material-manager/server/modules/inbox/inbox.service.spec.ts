import { NotFoundException } from "@nestjs/common";
import type { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";
import type { IdentityService } from "@server/modules/identity/identity.service";
import { InboxService } from "./inbox.service";

describe("InboxService version replacement acknowledgement", () => {
  const makeService = (row: Record<string, unknown>) => {
    const base = {
      rowById: jest.fn().mockResolvedValue(row),
      updateRecord: jest.fn().mockResolvedValue("rec_receive"),
    } as unknown as FeishuBaseGateway;
    const identity = {} as IdentityService;
    return { service: new InboxService(base, identity), base };
  };

  it("writes only the independent in-app read timestamp", async () => {
    const { service, base } = makeService({
      receiveDownloadPerson: "ou_owner",
      isReplacedNewVersion: true,
      inAppReadAt: null,
    });

    await expect(
      service.acknowledgeVersionReplaced("rec_receive", "ou_owner"),
    ).resolves.toEqual({ success: true });
    expect(base.updateRecord).toHaveBeenCalledWith("receive", "rec_receive", {
      站内已读时间: expect.any(Number),
    });
  });

  it("does not expose or mutate another user's receive record", async () => {
    const { service, base } = makeService({
      receiveDownloadPerson: "ou_other",
      isReplacedNewVersion: true,
      inAppReadAt: null,
    });

    await expect(
      service.acknowledgeVersionReplaced("rec_receive", "ou_owner"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(base.updateRecord).not.toHaveBeenCalled();
  });
});
