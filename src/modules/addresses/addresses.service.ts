import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { AddressResponse } from "../../types";

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all saved addresses belonging to the authenticated customer.
   */
  async list(userId: string): Promise<AddressResponse[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return addresses.map(this.mapAddressToResponse);
  }

  /**
   * Save a new address with atomic default selection handling.
   */
  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    const existingCount = await this.prisma.address.count({
      where: { userId },
    });

    // If customer has no saved addresses, make this the default
    const shouldBeDefault = existingCount === 0 || !!dto.isDefault;

    const address = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        // Unset previous defaults for this user
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName?.trim() || null,
          phone: dto.phone?.trim() || null,
          street: dto.street.trim(),
          house: dto.house?.trim() || null,
          landmark: dto.landmark?.trim() || null,
          city: dto.city?.trim() || "Kangra",
          state: dto.state?.trim() || "Himachal Pradesh",
          postalCode: dto.postalCode.trim(),
          isDefault: shouldBeDefault,
        },
      });
    });

    this.logger.log(`Address ${address.id} saved for user ${userId}`);
    return this.mapAddressToResponse(address);
  }

  /**
   * Update an address with strict ownership verification.
   */
  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException("Address not found or unauthorized access.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          label:
            dto.label !== undefined ? dto.label?.trim() || null : undefined,
          recipientName:
            dto.recipientName !== undefined
              ? dto.recipientName?.trim() || null
              : undefined,
          phone:
            dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
          street: dto.street !== undefined ? dto.street.trim() : undefined,
          house:
            dto.house !== undefined ? dto.house?.trim() || null : undefined,
          landmark:
            dto.landmark !== undefined
              ? dto.landmark?.trim() || null
              : undefined,
          city: dto.city !== undefined ? dto.city.trim() : undefined,
          state: dto.state !== undefined ? dto.state.trim() : undefined,
          postalCode:
            dto.postalCode !== undefined ? dto.postalCode.trim() : undefined,
          isDefault: dto.isDefault !== undefined ? dto.isDefault : undefined,
        },
      });
    });

    return this.mapAddressToResponse(updated);
  }

  /**
   * Delete an address with strict ownership verification.
   */
  async delete(
    userId: string,
    addressId: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException("Address not found or unauthorized access.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      // If the deleted address was default, promote the newest remaining address as default
      if (existing.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });

        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    this.logger.log(`Address ${addressId} deleted for user ${userId}`);
    return { success: true };
  }

  /**
   * Atomically mark an address as the default address for the user.
   */
  async setDefault(
    userId: string,
    addressId: string,
  ): Promise<AddressResponse> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException("Address not found or unauthorized access.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    return this.mapAddressToResponse(updated);
  }

  private mapAddressToResponse(addr: any): AddressResponse {
    return {
      id: addr.id,
      userId: addr.userId,
      label: addr.label || null,
      recipientName: addr.recipientName || null,
      phone: addr.phone || null,
      street: addr.street,
      house: addr.house || null,
      landmark: addr.landmark || null,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
      createdAt:
        addr.createdAt instanceof Date
          ? addr.createdAt.toISOString()
          : addr.createdAt,
      updatedAt:
        addr.updatedAt instanceof Date
          ? addr.updatedAt.toISOString()
          : addr.updatedAt,
    };
  }
}
