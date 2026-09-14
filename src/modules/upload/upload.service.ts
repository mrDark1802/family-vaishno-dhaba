import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrlBase: string;

  constructor() {
    const endpoint =
      process.env.R2_ENDPOINT ||
      "https://0bfb1e2b55a21851024948866d0d0563.r2.cloudflarestorage.com";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || "fvd-dhaba";
    const apiUrl = (process.env.API_URL || "https://family-vaishno-dhaba.vercel.app").replace(/\/+$/, "");
    this.publicUrlBase = (
      process.env.R2_PUBLIC_URL ||
      `${apiUrl}/api/upload/view`
    ).replace(/\/+$/, "");

    if (accessKeyId && secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          region: "auto",
          endpoint,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.logger.log(`Cloudflare R2 Client initialized for bucket: ${this.bucketName}`);
      } catch (err) {
        this.logger.error("Failed to initialize Cloudflare R2 client:", err);
      }
    } else {
      this.logger.warn(
        "R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY not provided. Uploads will generate formatted storage URLs.",
      );
    }
  }

  /**
   * Upload a raw buffer to Cloudflare R2
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = "uploads",
  ): Promise<UploadResult> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException("File buffer is empty.");
    }

    const cleanName = originalName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const ext = cleanName.includes(".") ? "" : this.getExtensionFromMime(mimeType);
    const key = `${folder}/${Date.now()}-${cleanName}${ext}`;

    if (this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        });
        await this.s3Client.send(command);
        this.logger.log(`Uploaded file to Cloudflare R2: ${key}`);
      } catch (err: any) {
        this.logger.error(`Error uploading to Cloudflare R2 (${key}):`, err);
        throw new BadRequestException(
          `Cloudflare R2 storage error: ${err.message || "Failed to upload file"}`,
        );
      }
    }

    const publicUrl = `${this.publicUrlBase}/${key}`;

    return {
      url: publicUrl,
      key,
      filename: originalName,
      mimetype: mimeType,
      size: buffer.length,
    };
  }

  /**
   * Upload a Base64 data URI or string to Cloudflare R2
   */
  async uploadBase64(
    base64Data: string,
    filename: string = "image.jpg",
    folder: string = "uploads",
  ): Promise<UploadResult> {
    let mimeType = "image/jpeg";
    let pureBase64 = base64Data;

    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1] || mimeType;
        pureBase64 = match[2] || pureBase64;
      }
    }

    const buffer = Buffer.from(pureBase64, "base64");
    return this.uploadBuffer(buffer, filename, mimeType, folder);
  }

  /**
   * Fetch object from Cloudflare R2 as a readable stream
   */
  async getObjectStream(
    key: string,
  ): Promise<{ stream: any; contentType: string; contentLength?: number }> {
    if (!this.s3Client) {
      throw new NotFoundException("Storage client not initialized.");
    }
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      return {
        stream: response.Body,
        contentType: response.ContentType || "image/jpeg",
        contentLength: response.ContentLength,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch object ${key} from R2:`, err);
      throw new NotFoundException(`Asset '${key}' not found in storage.`);
    }
  }

  private getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/gif":
        return ".gif";
      case "image/svg+xml":
        return ".svg";
      default:
        return "";
    }
  }
}
