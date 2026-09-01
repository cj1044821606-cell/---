export interface SessionUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface SessionPayload extends SessionUser {
  exp: number;
}
