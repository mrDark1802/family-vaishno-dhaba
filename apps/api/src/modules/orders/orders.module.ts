import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PrismaModule } from "../../database/prisma.module";
import { VerificationModule } from "../verification/verification.module";

@Module({
  imports: [PrismaModule, VerificationModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
