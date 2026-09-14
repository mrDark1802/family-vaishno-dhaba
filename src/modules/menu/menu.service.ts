import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { GetMenuQueryDto } from "./dto/get-menu-query.dto";
import {
  CategorySummary,
  ProductSummary,
  CustomizationOption,
  CreateProductDto,
  UpdateProductDto,
  RegionalCuisine,
} from "../../types";
import { Prisma } from "@prisma/client";

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch all categories with optional inactive and product counts
   */
  async getCategories(includeInactive = false): Promise<CategorySummary[]> {
    const where: Prisma.CategoryWhereInput = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: {
        displayOrder: "asc",
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      imageUrl: (cat as any).imageUrl || null,
      featured: cat.featured,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      productCount: cat._count?.products ?? 0,
    }));
  }

  /**
   * Admin: Create category
   */
  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    imageUrl?: string;
    featured?: boolean;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<CategorySummary> {
    const slug =
      data.slug?.trim() ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    const created = await this.prisma.category.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || "🍲",
        imageUrl: data.imageUrl?.trim() || null,
        featured: data.featured ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      description: created.description,
      icon: created.icon,
      imageUrl: (created as any).imageUrl || null,
      featured: created.featured,
      displayOrder: created.displayOrder,
      isActive: created.isActive,
      productCount: 0,
    };
  }

  /**
   * Admin: Delete Category (safely checks if products are linked)
   */
  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found.`);
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it still contains ${category._count.products} dish(es). Please reassign or delete the dishes first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    this.logger.log(`Deleted category: ${category.name} (${id})`);
    return { success: true, message: `Category "${category.name}" deleted successfully.` };
  }


  /**
   * Admin: Update category
   */
  async updateCategory(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      icon?: string;
      imageUrl?: string;
      featured?: boolean;
      displayOrder?: number;
      isActive?: boolean;
    },
  ): Promise<CategorySummary> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found.`);
    }

    const updateData: Prisma.CategoryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.slug !== undefined) updateData.slug = data.slug.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.icon !== undefined) updateData.icon = data.icon?.trim() || null;
    if (data.imageUrl !== undefined) (updateData as any).imageUrl = data.imageUrl?.trim() || null;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { products: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      icon: updated.icon,
      imageUrl: (updated as any).imageUrl || null,
      featured: updated.featured,
      displayOrder: updated.displayOrder,
      isActive: updated.isActive,
      productCount: updated._count?.products ?? 0,
    };
  }

  /**
   * Fetch menu items with optional category, cuisine, and search filters
   */
  async getMenuItems(query: GetMenuQueryDto): Promise<ProductSummary[]> {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (query.isAvailable !== undefined) {
      where.isAvailable = query.isAvailable;
    }

    if (query.isChefSpecial !== undefined) {
      where.isChefSpecial = query.isChefSpecial;
    }

    if (query.isRecommended !== undefined) {
      where.isRecommended = query.isRecommended;
    }

    // Category filter: match either slug or id
    const targetCat = query.categoryId || query.category;
    if (targetCat) {
      where.category = {
        isActive: true,
        OR: [{ slug: targetCat }, { id: targetCat }],
      };
    }

    // Cuisine filter
    if (query.cuisine) {
      where.cuisine = query.cuisine as any;
    }

    // Full-text / substring search across name, description, and longDescription
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { longDescription: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const page = query.page && query.page > 0 ? query.page : undefined;
    const limit = query.limit && query.limit > 0 ? query.limit : undefined;
    const skip = page && limit ? (page - 1) * limit : page ? (page - 1) * 10 : undefined;
    const take = limit;

    const items = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        { category: { displayOrder: "asc" } },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });

    return items.map((item) => this.mapProductToSummary(item));
  }

  /**
   * Fetch a single menu item by ID or slug
   */
  async getMenuItemById(idOrSlug: string): Promise<ProductSummary> {
    const item = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Menu item '${idOrSlug}' not found or currently unavailable.`,
      );
    }

    return this.mapProductToSummary(item);
  }

  /**
   * Admin: Create a new dish
   */
  async createProduct(dto: CreateProductDto): Promise<ProductSummary> {
    const slug =
      dto.slug?.trim() ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException(`Category with ID '${dto.categoryId}' not found.`);
    }

    const created = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        slug,
        categoryId: dto.categoryId,
        description: dto.description?.trim() || null,
        longDescription: dto.longDescription?.trim() || null,
        price: new Prisma.Decimal(dto.price),
        hasHalfOption: dto.hasHalfOption ?? false,
        halfPrice:
          dto.hasHalfOption && dto.halfPrice !== undefined && dto.halfPrice !== null
            ? new Prisma.Decimal(dto.halfPrice)
            : null,
        isAvailable: dto.isAvailable ?? true,
        isActive: dto.isActive ?? true,
        isChefSpecial: dto.isChefSpecial ?? false,
        isRecommended: dto.isRecommended ?? false,
        cuisine: (dto.cuisine as any) || "COMMON",
        isSpicy: dto.isSpicy ?? false,
        preparationTime: dto.preparationTime || "15 mins",
        serves: dto.serves || "1-2 people",
        customizationOptions: dto.customizationOptions
          ? (dto.customizationOptions as any)
          : undefined,
        imageUrl: dto.imageUrl || null,
        displayOrder: dto.displayOrder || 0,
      },
      include: {
        category: true,
      },
    });

    return this.mapProductToSummary(created);
  }

  /**
   * Admin: Update an existing dish
   */
  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductSummary> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found.`);
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.slug !== undefined) updateData.slug = dto.slug.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.longDescription !== undefined)
      updateData.longDescription = dto.longDescription?.trim() || null;
    if (dto.price !== undefined) updateData.price = new Prisma.Decimal(dto.price);
    if (dto.hasHalfOption !== undefined) updateData.hasHalfOption = dto.hasHalfOption;
    if (dto.halfPrice !== undefined) {
      updateData.halfPrice =
        dto.halfPrice !== null ? new Prisma.Decimal(dto.halfPrice) : null;
    }
    if (dto.isAvailable !== undefined) updateData.isAvailable = dto.isAvailable;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isChefSpecial !== undefined) updateData.isChefSpecial = dto.isChefSpecial;
    if (dto.isRecommended !== undefined) updateData.isRecommended = dto.isRecommended;
    if (dto.cuisine !== undefined) updateData.cuisine = dto.cuisine as any;
    if (dto.isSpicy !== undefined) updateData.isSpicy = dto.isSpicy;
    if (dto.preparationTime !== undefined) updateData.preparationTime = dto.preparationTime;
    if (dto.serves !== undefined) updateData.serves = dto.serves;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl || null;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
    if (dto.categoryId !== undefined) {
      updateData.category = { connect: { id: dto.categoryId } };
    }
    if (dto.customizationOptions !== undefined) {
      updateData.customizationOptions = dto.customizationOptions as any;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    return this.mapProductToSummary(updated);
  }

  /**
   * Admin: Toggle dish availability (in stock / sold out)
   */
  async toggleAvailability(id: string): Promise<ProductSummary> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found.`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isAvailable: !existing.isAvailable },
      include: { category: true },
    });

    return this.mapProductToSummary(updated);
  }

  /**
   * Admin: Delete dish / product
   */
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found.`);
    }

    await this.prisma.product.delete({ where: { id } });
    this.logger.log(`Deleted product: ${existing.name} (${id})`);

    return {
      success: true,
      message: `Dish "${existing.name}" deleted successfully.`,
    };
  }


  /**
   * Helper to map Prisma Product to ProductSummary with converted Decimals and typed Customizations
   */
  private mapProductToSummary(
    item: Prisma.ProductGetPayload<{ include: { category: true } }>,
  ): ProductSummary {
    let customizationOptions: CustomizationOption[] | null = null;
    if (item.customizationOptions) {
      customizationOptions =
        item.customizationOptions as unknown as CustomizationOption[];
    }

    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      slug: item.slug,
      description: item.description,
      longDescription: item.longDescription,
      price: Number(item.price),
      hasHalfOption: Boolean(item.hasHalfOption),
      halfPrice: item.halfPrice ? Number(item.halfPrice) : null,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      isChefSpecial: item.isChefSpecial,
      isRecommended: (item as any).isRecommended ?? false,
      cuisine: item.cuisine as RegionalCuisine,
      isSpicy: item.isSpicy,
      preparationTime: item.preparationTime,
      serves: item.serves,
      customizationOptions,
      imageUrl: item.imageUrl,
      displayOrder: item.displayOrder,
      category: item.category
        ? {
            id: item.category.id,
            name: item.category.name,
            slug: item.category.slug,
            description: item.category.description,
            icon: item.category.icon,
            featured: item.category.featured,
            displayOrder: item.category.displayOrder,
            isActive: item.category.isActive,
          }
        : undefined,
    };
  }
}
