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
import { MenuService } from "./menu.service";
import { GetMenuQueryDto } from "./dto/get-menu-query.dto";
import {
  CategorySummary,
  ProductSummary,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
} from "../../types";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";

@Controller("menu")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get("categories")
  async getCategories(
    @Query("includeInactive") includeInactive?: string,
  ): Promise<CategorySummary[]> {
    return this.menuService.getCategories(includeInactive === "true");
  }

  @Post("categories")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalAuthGuard)
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategorySummary> {
    return this.menuService.createCategory(dto);
  }

  @Delete("categories/:id")
  @UseGuards(OptionalAuthGuard)
  async deleteCategory(@Param("id") id: string): Promise<{ success: boolean; message: string }> {
    return this.menuService.deleteCategory(id);
  }

  @Get()
  async getMenuItems(
    @Query() query: GetMenuQueryDto,
  ): Promise<ProductSummary[]> {
    return this.menuService.getMenuItems(query);
  }

  @Get(":id")
  async getMenuItem(@Param("id") id: string): Promise<ProductSummary> {
    return this.menuService.getMenuItemById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalAuthGuard)
  async createDish(@Body() dto: CreateProductDto): Promise<ProductSummary> {
    return this.menuService.createProduct(dto);
  }

  @Patch(":id")
  @UseGuards(OptionalAuthGuard)
  async updateDish(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductSummary> {
    return this.menuService.updateProduct(id, dto);
  }

  @Patch(":id/toggle-availability")
  @UseGuards(OptionalAuthGuard)
  async toggleAvailability(@Param("id") id: string): Promise<ProductSummary> {
    return this.menuService.toggleAvailability(id);
  }

  @Delete(":id")
  @UseGuards(OptionalAuthGuard)
  async deleteDish(@Param("id") id: string): Promise<{ success: boolean; message: string }> {
    return this.menuService.deleteProduct(id);
  }
}

