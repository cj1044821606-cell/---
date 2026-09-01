import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("healthz")
  getHealth(): { ok: true; service: string; timestamp: string } {
    return {
      ok: true,
      service: "ai-material-manager",
      timestamp: new Date().toISOString(),
    };
  }
}
