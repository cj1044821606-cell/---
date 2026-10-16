import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { MaterialsService } from "./materials.service";
import {
  canDownloadVersionHistory,
  countVersionArchive,
  versionArchiveTiers,
} from "./version-history.util";

function makeService(roles: string[]) {
  const material = {
    baseRecordId: "recMainV2",
    appInternalMaterialId: "MAT-0016",
    appMaterialId: null,
    versionRecord: { link_record_ids: ["recVer11"] },
    releaseStatus: "已发布",
    applicableRegion: ["GLOBAL"],
  };
  const versions = [
    {
      baseRecordId: "recVer11",
      appInternalMaterialId: "MAT-0016",
      versionNumber: "V1.1",
      isCurrentValid: true,
      compareOldVersion: { link_record_ids: ["recVer10"] },
      currentVersionAttachment: ["tok-m-11"],
      sourceFileL: [],
      previewFileS: [],
    },
    {
      baseRecordId: "recVer10",
      appInternalMaterialId: "MAT-0013",
      versionNumber: "V1.0",
      isCurrentValid: false,
      currentVersionAttachment: ["tok-m-10"],
      sourceFileL: ["tok-l-10"],
      previewFileS: ["tok-s-10", "tok-s-10"],
    },
    {
      baseRecordId: "recOther",
      appInternalMaterialId: "MAT-0099",
      versionNumber: "V3.0",
      isCurrentValid: true,
      currentVersionAttachment: ["tok-other"],
    },
  ];
  const base = {
    rowById: jest.fn().mockResolvedValue(material),
    rows: jest.fn().mockResolvedValue(versions),
  };
  const identity = {
    resolve: jest.fn().mockResolvedValue({
      userId: "ou_user",
      roles,
      area: "HQ",
      isVisitor: false,
    }),
  };
  const files = {
    makeMediaUrl: jest.fn((locator: string) => `/api/files/download?t=${locator}`),
    getAttachmentName: jest.fn((locator: string) => `${locator}.pdf`),
  };
  const service = new MaterialsService(
    base as any,
    identity as any,
    {} as any,
    files as any,
    {} as any,
  );
  jest
    .spyOn(service as any, "isMaterialVisible")
    .mockReturnValue(true);
  return service;
}

describe("version history download", () => {
  it("only designers may download past versions", () => {
    expect(canDownloadVersionHistory(["设计师"])).toBe(true);
    expect(canDownloadVersionHistory(["设计师", "维护者"])).toBe(true);
    expect(canDownloadVersionHistory(["策划", "维护者", "审核人"])).toBe(false);
    expect(canDownloadVersionHistory([])).toBe(false);
  });

  it("counts archived attachments per tier without duplicates", () => {
    const row = {
      currentVersionAttachment: ["a", "a"],
      sourceFileL: ["b"],
      previewFileS: null,
    };
    expect(versionArchiveTiers(row)).toEqual({ M: ["a"], L: ["b"], S: [] });
    expect(countVersionArchive(row)).toBe(2);
    expect(countVersionArchive({})).toBe(0);
  });

  it("returns M/L/S files of a linked past version for a designer", async () => {
    const service = makeService(["设计师"]);
    const resp = await service.getVersionFiles("ou_user", "recMainV2", "recVer10");
    expect(resp.versionNumber).toBe("V1.0");
    expect(resp.files.map((f) => `${f.kind}:${f.fileName}`)).toEqual([
      "M:tok-m-10.pdf",
      "L:tok-l-10.pdf",
      "S:tok-s-10.pdf",
    ]);
    expect(resp.files.every((f) => f.delivery === "direct")).toBe(true);
    expect(resp.missing).toBeUndefined();
  });

  it("rejects non-designers before reading any version data", async () => {
    const service = makeService(["策划", "维护者"]);
    await expect(
      service.getVersionFiles("ou_user", "recMainV2", "recVer10"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuses versions that belong to another material", async () => {
    const service = makeService(["设计师"]);
    await expect(
      service.getVersionFiles("ou_user", "recMainV2", "recOther"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
