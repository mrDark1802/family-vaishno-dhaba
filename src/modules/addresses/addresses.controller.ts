import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AddressesService } from "./addresses.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CustomerProfile, AddressResponse } from "../../types";

@Controller("addresses")
@UseGuards(AuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  /**
   * List all saved addresses for authenticated customer.
   */
  @Get()
  async list(@CurrentUser() user: CustomerProfile): Promise<AddressResponse[]> {
    return this.addressesService.list(user.id);
  }

  /**
   * Save a new delivery address for authenticated customer.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CustomerProfile,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    return this.addressesService.create(user.id, dto);
  }

  /**
   * Update an existing address.
   */
  @Patch(":id")
  async update(
    @CurrentUser() user: CustomerProfile,
    @Param("id") id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    return this.addressesService.update(user.id, id, dto);
  }

  /**
   * Set an address as the default address.
   */
  @Patch(":id/default")
  async setDefault(
    @CurrentUser() user: CustomerProfile,
    @Param("id") id: string,
  ): Promise<AddressResponse> {
    return this.addressesService.setDefault(user.id, id);
  }

  /**
   * Delete an address.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser() user: CustomerProfile,
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    return this.addressesService.delete(user.id, id);
  }
}
