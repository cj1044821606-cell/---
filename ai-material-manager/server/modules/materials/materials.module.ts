import { Module } from "@nestjs/common";
import { ActionsModule } from "@server/modules/actions/actions.module";
import { FilesModule } from "@server/modules/files/files.module";
import { IdentityModule } from "@server/modules/identity/identity.module";
import { MaterialKitsController } from "./material-kits.controller";
import { MaterialsController } from "./materials.controller";
import { MaterialsService } from "./materials.service";

@Module({
  imports: [IdentityModule, ActionsModule, FilesModule],
  controllers: [MaterialsController, MaterialKitsController],
  providers: [MaterialsService],
})
export class MaterialsModule {}
