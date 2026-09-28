import { Module } from "@nestjs/common";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { PeopleController } from "./people.controller";
import { PeopleService } from "./people.service";

@Module({
  controllers: [IdentityController, PeopleController],
  providers: [IdentityService, PeopleService],
  exports: [IdentityService, PeopleService],
})
export class IdentityModule {}
