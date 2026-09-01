import type { SessionUser } from "@server/common/auth/session.types";

declare global {
  namespace Express {
    interface Request {
      userContext: SessionUser;
      uploadFilePath?: string;
      uploadFileName?: string;
      uploadFileSize?: number;
      uploadTaskId?: string;
      uploadIsChunked?: boolean;
      uploadChunkTotal?: number;
    }
  }
}

export {};
