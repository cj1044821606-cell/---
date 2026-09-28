import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { ThumbnailService } from "./thumbnail.service";
import { PdfPreviewService } from "./pdf-preview.service";

@Module({
  imports: [],
  controllers: [FilesController],
  providers: [FilesService, ThumbnailService, PdfPreviewService],
  exports: [FilesService, ThumbnailService],
})
export class FilesModule {}
