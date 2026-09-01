import { UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "./session-auth.guard";

export const NeedLogin = (): MethodDecorator & ClassDecorator =>
  UseGuards(SessionAuthGuard);
