import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { ThumbnailService } from "./thumbnail.service";

@Module({
  imports: [],
  controllers: [FilesController],
  providers: [FilesService, ThumbnailService],
  exports: [FilesService, ThumbnailService],
})
export class FilesModule {}