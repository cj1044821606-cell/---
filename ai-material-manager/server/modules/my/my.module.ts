import { Module } from "@nestjs/common";
import { MyController } from "./my.controller";
import { MyService } from "./my.service";
import { FilesModule } from "@server/modules/files/files.module";

@Module({
  imports: [FilesModule],
  controllers: [MyController],
  providers: [MyService],
})
export class MyModule {}
