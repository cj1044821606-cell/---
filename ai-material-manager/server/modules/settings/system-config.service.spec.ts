import { SystemConfigService, type SystemConfigRecord } from "./system-config.service";
import {
  getGroupQrStatus,
  GROUP_QR_EXPIRING_WINDOW_MS,
} from "@shared/settings";

describe("SystemConfigService group QR availability", () => {
  const now = new Date("2026-09-28T00:00:00+08:00").getTime();

  function createService(rows: SystemConfigRecord[]) {
    const base = { rows: jest.fn(async () => rows) };
    const files = { makeMediaUrl: jest.fn((token: string) => `/media/${token}`) };
    const cache = {
      wrap: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
    };
    const service = new SystemConfigService(
      base as never,
      files as never,
      cache as never,
    );
    return { service, files };
  }

  const qrConfig = (patch: Partial<SystemConfigRecord> = {}): SystemConfigRecord => ({
    key: "group_qr",
    name: "协作群二维码",
    textValue: null,
    imageUrls: ["qr-file-token"],
    expiryMs: new Date("2026-10-05T00:00:00+08:00").getTime(),
    enabled: true,
    ...patch,
  });

  it("returns the authenticated media URL while the QR is valid", async () => {
    const { service, files } = createService([qrConfig()]);
    const settings = await service.getSettings("user-1");

    expect(settings.groupQrStatus).toBe("available");
    expect(settings.groupQrUrl).toBe("/media/qr-file-token");
    expect(files.makeMediaUrl).toHaveBeenCalledWith("qr-file-token", "user-1");
  });

  it("marks a QR expiring within three days but keeps it available", async () => {
    const { service } = createService([
      qrConfig({ expiryMs: now + 2 * 24 * 60 * 60 * 1000 }),
    ]);
    const settings = await service.getSettings("user-1");

    expect(settings.groupQrStatus).toBe("expiring");
    expect(settings.groupQrUrl).toBe("/media/qr-file-token");
  });

  it("hides an expired QR from clients", async () => {
    const { service, files } = createService([
      qrConfig({ expiryMs: now }),
    ]);
    const settings = await service.getSettings("user-1");

    expect(settings.groupQrStatus).toBe("expired");
    expect(settings.groupQrUrl).toBeNull();
    expect(files.makeMediaUrl).not.toHaveBeenCalled();
  });

  it("treats disabled and image-less configuration as unavailable", async () => {
    const disabled = createService([qrConfig({ enabled: false })]);
    const missingImage = createService([qrConfig({ imageUrls: [] })]);

    await expect(disabled.service.getSettings("user-1")).resolves.toMatchObject({
      groupQrStatus: "unavailable",
      groupQrUrl: null,
    });
    await expect(missingImage.service.getSettings("user-1")).resolves.toMatchObject({
      groupQrStatus: "unavailable",
      groupQrUrl: null,
    });
  });

  it("does not return disabled system configurations", async () => {
    const disabled = qrConfig({ enabled: false });
    const { service } = createService([disabled]);
    const configs = await service.fetchAllConfigs();

    expect(configs).toEqual([]);
  });
});

describe("getGroupQrStatus boundaries", () => {
  const now = 1_800_000_000_000;

  it("treats the expiry instant as expired", () => {
    expect(getGroupQrStatus(true, true, now, now)).toBe("expired");
  });

  it("marks the exact three-day boundary as expiring", () => {
    expect(
      getGroupQrStatus(
        true,
        true,
        now + GROUP_QR_EXPIRING_WINDOW_MS,
        now,
      ),
    ).toBe("expiring");
  });

  it("treats malformed expiry configuration as unavailable", () => {
    expect(getGroupQrStatus(true, true, Number.NaN, now)).toBe("unavailable");
  });
});
