import { Global, Module } from "@nestjs/common";
import { DepartmentService } from "./department.service";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { PeopleController } from "./people.controller";
import { PeopleService } from "./people.service";

// 全局：各模块控制器上的 DivisionAccessGuard 都需要注入 IdentityService
@Global()
@Module({
  controllers: [IdentityController, PeopleController],
  providers: [DepartmentService, IdentityService, PeopleService],
  exports: [DepartmentService, IdentityService, PeopleService],
})
export class IdentityModule {}
