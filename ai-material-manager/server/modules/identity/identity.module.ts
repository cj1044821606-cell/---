import { Module } from "@nestjs/common";
import { DepartmentService } from "./department.service";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { PeopleController } from "./people.controller";
import { PeopleService } from "./people.service";

@Module({
  controllers: [IdentityController, PeopleController],
  providers: [DepartmentService, IdentityService, PeopleService],
  exports: [DepartmentService, IdentityService, PeopleService],
})
export class IdentityModule {}
