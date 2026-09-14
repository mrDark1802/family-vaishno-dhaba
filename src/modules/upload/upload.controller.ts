import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Readable } from "stream";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadService, UploadResult } from "./upload.service";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";

@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get("view/*")
  async viewFile(@Req() req: Request, @Res() res: Response) {
    // Extract everything after /api/upload/view/
    const prefix = "/api/upload/view/";
    const rawPath = req.originalUrl.split("?")[0];
    const keyIndex = rawPath.indexOf(prefix);
    const key = keyIndex !== -1 ? rawPath.slice(keyIndex + prefix.length) : req.params[0];

    if (!key) {
      return res.status(400).send("Asset key required");
    }

    const { stream, contentType, contentLength } =
      await this.uploadService.getObjectStream(decodeURIComponent(key));

    res.setHeader("Content-Type", contentType);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (stream instanceof Readable) {
      stream.pipe(res);
    } else if (stream && typeof stream.pipe === "function") {
      stream.pipe(res);
    } else if (stream && typeof (stream as any).transformToByteArray === "function") {
      const byteArray = await (stream as any).transformToByteArray();
      res.end(Buffer.from(byteArray));
    } else {
      res.end(stream);
    }
  }

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
