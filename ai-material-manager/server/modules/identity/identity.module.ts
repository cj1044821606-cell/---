import { Module } from "@nestjs/common";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { PeopleController } from "./people.controller";

@Module({
  controllers: [IdentityController, PeopleController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
