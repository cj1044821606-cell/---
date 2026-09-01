import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type { MaterialFilesResponse } from "@shared/files";
import type {
  MaterialDetailResponse,
  MaterialEditFields,
  MaterialEditRequest,
  MaterialEditResponse,
  MaterialListResponse,
} from "@shared/material";
import { MaterialsService } from "./materials.service";

const MATERIALS_PAGE_MAX: number = 50;
const MATERIALS_PAGE_DEFAULT: number = 20;

@Controller("api/materials")
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // 静态路由必须在动态 ":baseRecordId" 路由之前声明
  @NeedLogin()
  @Get()
  async listMaterials(
    @Req() req: Request,
    @Query("keyword") keyword?: string,
    @Query("materialType") materialType?: string,
    @Query("region") region?: string,
    @Query("productModel") productModel?: string,
    @Query("externalOnly") externalOnly?: string,
    @Query("viewGlobal") viewGlobal?: string,
    @Query("offset") offsetRaw?: string,
    @Query("limit") limitRaw?: string,
  ): Promise<MaterialListResponse> {
    const userId: string = req.userContext.userId;
    const offsetParsed: number = Number.parseInt(offsetRaw ?? "", 10);
    const limitParsed: number = Number.parseInt(limitRaw ?? "", 10);
    return this.materialsService.listMaterials(userId, {
      keyword,
      materialType,
      region,
      productModel,
      externalOnly: externalOnly === "true",
      viewGlobal: viewGlobal === "true",
      offset:
        Number.isFinite(offsetParsed) && offsetParsed > 0 ? offsetParsed : 0,
      // @Max(50) 语义：controller 层 parseInt 后封顶 50
      limit:
        Number.isFinite(limitParsed) && limitParsed > 0
          ? Math.min(limitParsed, MATERIALS_PAGE_MAX)
          : MATERIALS_PAGE_DEFAULT,
    });
  }

  @NeedLogin()
  @Get(":baseRecordId")
  async getMaterialDetail(
    @Param("baseRecordId") baseRecordId: string,
    @Req() req: Request,
  ): Promise<MaterialDetailResponse> {
    const userId: string = req.userContext.userId;
    return this.materialsService.getMaterialDetail(userId, baseRecordId);
  }

  @NeedLogin()
  @Patch(":baseRecordId")
  async updateMaterial(
    @Param("baseRecordId") baseRecordId: string,
    @Body() body: MaterialEditRequest,
    @Req() req: Request,
  ): Promise<MaterialEditResponse> {
    const userId: string = req.userContext.userId;
    const fields: MaterialEditFields = body?.fields ?? {};
    return this.materialsService.updateMaterial(
      userId,
      baseRecordId,
      fields,
    );
  }

  @NeedLogin()
  @Get(":baseRecordId/files")
  async getMaterialFiles(
    @Req() req: Request,
    @Param("baseRecordId") baseRecordId: string,
  ): Promise<MaterialFilesResponse> {
    const userId: string = req.userContext.userId;
    return this.materialsService.getMaterialFiles(userId, baseRecordId);
  }

  @NeedLogin()
  @Get(":baseRecordId/thumbnail")
  async getMaterialThumbnail(
    @Param("baseRecordId") baseRecordId: string,
    @Req() req: Request,
    @Res() res: any,
  ): Promise<void> {
    await this.materialsService.getMaterialThumbnail(
      req.userContext.userId,
      baseRecordId,
      res,
    );
  }
}
