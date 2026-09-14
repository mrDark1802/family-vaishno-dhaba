import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { VerificationService } from "./verification.service";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { OtpSendResponse, OtpVerifyResponse } from "@repo/types";

@Controller("verification")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Send 6-digit OTP code to mobile number.
   */
  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async sendOtp(@Body() dto: SendOtpDto): Promise<OtpSendResponse> {
    return this.verificationService.sendOtp(dto.phone);
  }

  /**
   * Verify 6-digit OTP code and issue verification token.
   */
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<OtpVerifyResponse> {
    return this.verificationService.verifyOtp(dto.phone, dto.otp);
  }
}
