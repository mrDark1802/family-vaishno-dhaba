import { Module } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import { DeliveryController } from "./delivery.controller";
import { DeliveryGateway } from "./delivery.gateway";
import { RoutingService } from "./routing.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    DeliveryGateway,
    RoutingService,
    PrismaService,
  ],
  exports: [DeliveryService, RoutingService, DeliveryGateway],
})
export class DeliveryModule {}
