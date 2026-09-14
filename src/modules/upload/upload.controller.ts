import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadService, UploadResult } from "./upload.service";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";

@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body("folder") folder?: string,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException("No file provided in form field 'file'.");
    }
    return this.uploadService.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder || "uploads",
    );
  }

  @Post("base64")
  @UseGuards(OptionalAuthGuard)
  async uploadBase64(
    @Body() body: { data: string; filename?: string; folder?: string },
  ): Promise<UploadResult> {
    if (!body || !body.data) {
      throw new BadRequestException("Field 'data' (Base64 string) is required.");
    }
    return this.uploadService.uploadBase64(
      body.data,
      body.filename || "upload.jpg",
      body.folder || "uploads",
    );
  }
}
