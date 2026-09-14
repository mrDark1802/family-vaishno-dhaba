import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PrismaModule } from "../../database/prisma.module";
import { PAYMENT_PROVIDER } from "./providers/payment-provider.interface";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { RazorpayPaymentProvider } from "./providers/razorpay-payment.provider";

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MockPaymentProvider,
    RazorpayPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, MockPaymentProvider, RazorpayPaymentProvider],
      useFactory: (
        configService: ConfigService,
        mockProvider: MockPaymentProvider,
        razorpayProvider: RazorpayPaymentProvider,
      ) => {
        const providerName = configService
          .get<string>("payments.provider", "razorpay")
          .toLowerCase();

        switch (providerName) {
          case "razorpay":
            return razorpayProvider;
          case "mock":
          default:
            return mockProvider;
        }
      },
    },
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
