import { PoolService } from "./pool.service";
import type { FeishuBaseGateway } from "@server/modules/feishu/feishu-base.gateway";

describe("PoolService upload contract", () => {
  it("writes plannerAuditorId as one Base user", async () => {
    const createRecord = jest.fn().mockResolvedValue("rec_new");
    const userField = jest.fn((openIds: string[]) =>
      openIds.map((id) => ({ id })),
    );
    const base = {
      createRecord,
      userField,
    } as unknown as FeishuBaseGateway;
    const service = new PoolService(base);

    await expect(
      service.upload(
        {
          originalFileName: "material.png",
          uploadFileM: ["file_m"],
          plannerAuditorId: "ou_planner",
        },
        "ou_uploader",
      ),
    ).resolves.toEqual({ recordId: "rec_new" });

    expect(userField).toHaveBeenCalledWith(["ou_uploader"]);
    expect(userField).toHaveBeenCalledWith(["ou_planner"]);
    expect(createRecord).toHaveBeenCalledWith(
      "pool",
      expect.objectContaining({
        策划人及审核人: [{ id: "ou_planner" }],
      }),
    );
  });

  it("writes guided naming fields and a server-built preview", async () => {
    const createRecord = jest.fn().mockResolvedValue("rec_guided");
    const base = {
      createRecord,
      userField: jest.fn((openIds: string[]) => openIds.map((id) => ({ id }))),
    } as unknown as FeishuBaseGateway;
    const service = new PoolService(base);

    await service.upload(
      {
        originalFileName: "datasheet.png",
        uploadFileM: ["file_m"],
        namingMode: "guided",
        namingInput: {
          category: "product",
          productModel: "IPV-1K612U",
          materialType: "Datasheet 数据表",
          language: "EN",
          region: "PK",
          version: "1.0",
        },
      },
      "ou_uploader",
    );

    expect(createRecord).toHaveBeenCalledWith(
      "pool",
      expect.objectContaining({
        命名模式: "我提供命名信息",
        "用户提供·物料大类": "产品物料",
        "用户提供·产品型号": "IPV-1K612U",
        "用户提供·物料类型": "Datasheet 数据表",
        "用户提供·语言": "EN",
        "用户提供·主区域": "PK",
        "用户提供·版本号": "1.0",
        "用户提供·命名预览": "IPV-1K612U-Datasheet-En-(PK)-V1.0",
      }),
    );
  });
});
