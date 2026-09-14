import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { BannersService } from "./banners.service";
import { Banner, CreateBannerDto, UpdateBannerDto, UiSettings } from "../../types";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";

@Controller("banners")
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners(
    @Query("includeInactive") includeInactive?: string,
  ): Promise<Banner[]> {
    return this.bannersService.getBanners(includeInactive === "true");
  }

  @Get("ui-settings")
  async getUiSettings(): Promise<UiSettings> {
    return this.bannersService.getUiSettings();
  }

  @Get(":id")
  async getBanner(@Param("id") id: string): Promise<Banner> {
    return this.bannersService.getBannerById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalAuthGuard)
  async createBanner(@Body() dto: CreateBannerDto): Promise<Banner> {
    return this.bannersService.createBanner(dto);
  }

  @Patch(":id")
  @UseGuards(OptionalAuthGuard)
  async updateBanner(
    @Param("id") id: string,
    @Body() dto: UpdateBannerDto,
  ): Promise<Banner> {
    return this.bannersService.updateBanner(id, dto);
  }

  @Patch(":id/toggle")
  @UseGuards(OptionalAuthGuard)
  async toggleBanner(@Param("id") id: string): Promise<Banner> {
    return this.bannersService.toggleBanner(id);
  }

  @Delete(":id")
  @UseGuards(OptionalAuthGuard)
  async deleteBanner(@Param("id") id: string): Promise<{ success: boolean }> {
    return this.bannersService.deleteBanner(id);
  }
}
