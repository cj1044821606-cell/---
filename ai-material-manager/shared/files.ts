export type DeliveryMode = "direct" | "external";

export interface DeliverableFile {
  kind: "M" | "L" | "S";
  fileName: string;
  sizeBytes: number | null;
  mimeType: string | null;
  delivery: DeliveryMode;
  url: string;
  previewUrl: string | null;
}

export interface MaterialFilesResponse {
  materialId: string;
  versionNumber: string;
  files: DeliverableFile[];
  missing?: Partial<Record<"M" | "L" | "S", string>>;
}

export interface KitFilesResponse {
  productModel: string;
  materials: Array<{
    materialId: string;
    materialName: string;
    materialType: string;
    previewUrl: string | null;
    files: DeliverableFile[];
    missing: Partial<Record<"M" | "L" | "S", string>>;
  }>;
}

export interface CloudFileRef {
  fileName: string;
  link: string;
  fileToken: string;
}

export interface DownloadToken {
  materialId: string;
  kind: string;
  fileIndex: number;
  userId: string;
  exp: number;
}