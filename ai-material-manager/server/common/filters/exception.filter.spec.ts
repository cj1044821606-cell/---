import { ArgumentsHost, ForbiddenException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { GlobalExceptionFilter } from "./exception.filter";

function capture(exception: unknown): { status: number; body: any } {
  const out: { status: number; body: any } = { status: 0, body: null };
  const response = {
    headersSent: false,
    status(code: number) {
      out.status = code;
      return this;
    },
    json(body: unknown) {
      out.body = body;
      return this;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return out;
}

describe("GlobalExceptionFilter 业务错误码透传", () => {
  it("403 NOT_IN_DIVISION 原样出现在 error.code", () => {
    const { status, body } = capture(
      new ForbiddenException({ code: "NOT_IN_DIVISION", message: "本系统仅对储能事业部开放" }),
    );
    expect(status).toBe(403);
    expect(body.error.code).toBe("NOT_IN_DIVISION");
    expect(body.error.message).toBe("本系统仅对储能事业部开放");
  });

  it("503 DEPARTMENT_UNAVAILABLE 原样出现在 error.code", () => {
    const { status, body } = capture(
      new ServiceUnavailableException({ code: "DEPARTMENT_UNAVAILABLE", message: "暂时无法验证部门，请稍后重试" }),
    );
    expect(status).toBe(503);
    expect(body.error.code).toBe("DEPARTMENT_UNAVAILABLE");
  });

  it("没有业务码的 HttpException 保持原有映射", () => {
    const { body } = capture(new NotFoundException("物料不存在"));
    expect(body.error.code).not.toBe(undefined);
    expect(body.error.code).not.toBe("NOT_IN_DIVISION");
    expect(body.error.message).toBe("物料不存在");
  });
});
