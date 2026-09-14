import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import configuration from "./config/configuration";
import { validate } from "./config/env.validation";
import { PrismaModule } from "./database/prisma.module";
import { AppController } from "./app.controller";
import { HealthModule } from "./modules/health/health.module";
import { MenuModule } from "./modules/menu/menu.module";
import { AuthModule } from "./modules/auth/auth.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { VerificationModule } from "./modules/verification/verification.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { BannersModule } from "./modules/banners/banners.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [".env.local", ".env"],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("throttler.ttl", 60) * 1000,
          limit: config.get<number>("throttler.limit", 100),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    MenuModule,
    AuthModule,
    OrdersModule,
    AddressesModule,
    PaymentsModule,
    VerificationModule,
    CouponsModule,
    BannersModule,
  ],

  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
