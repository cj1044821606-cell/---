import { Controller, Get, Param, Req } from "@nestjs/common";
import type { Request } from "express";
import { NeedLogin } from "@server/common/auth/need-login.decorator";
import type { KitFilesResponse } from "@shared/files";
import type { MaterialKitsResponse } from "@shared/material";
import { MaterialsService } from "./materials.service";

@Controller("api/material-kits")
export class MaterialKitsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @NeedLogin()
  @Get()
  async getMaterialKits(@Req() req: Request): Promise<MaterialKitsResponse> {
    const userId: string = req.userContext.userId;
    return this.materialsService.getMaterialKits(userId);
  }

  @NeedLogin()
  @Get(":productModel/files")
  async getKitFiles(
    @Req() req: Request,
    @Param("productModel") productModel: string,
  ): Promise<KitFilesResponse> {
    const userId: string = req.userContext.userId;
    return this.materialsService.getKitFiles(userId, productModel);
  }
}
