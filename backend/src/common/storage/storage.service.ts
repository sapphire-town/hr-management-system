import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly bucket: string;
  private enabled: boolean;
  private readonly s3Client: S3Client | null;

  constructor(private readonly configService: ConfigService) {
    const provider = (this.configService.get<string>('STORAGE_PROVIDER') || 'local').toLowerCase();
    this.enabled = provider === 'minio' || provider === 's3';
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'hr-management-files';

    if (!this.enabled) {
      this.s3Client = null;
      return;
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn('S3/MinIO variables missing. Falling back to local storage.');
      this.enabled = false;
      this.s3Client = null;
      return;
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  isRemoteStorageEnabled(): boolean {
    return this.enabled && !!this.s3Client;
  }

  async ensureBucket(): Promise<void> {
    if (!this.isRemoteStorageEnabled()) return;
    try {
      await this.s3Client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3Client!.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  buildObjectKey(folder: string, originalFileName: string): string {
    const safeName = originalFileName.replace(/[^\w.\-]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return `${folder}/${unique}-${safeName}`;
  }

  async uploadBuffer(
    objectKey: string,
    buffer: Buffer,
    contentType?: string,
  ): Promise<string> {
    if (!this.isRemoteStorageEnabled()) {
      const localPath = path.join(process.cwd(), 'uploads', objectKey);
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      fs.writeFileSync(localPath, buffer);
      return objectKey;
    }

    await this.ensureBucket();
    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      }),
    );
    return objectKey;
  }

  async getBuffer(fileRef: string): Promise<Buffer | null> {
    const candidates = this.getKeyCandidates(fileRef);

    if (this.isRemoteStorageEnabled()) {
      for (const key of candidates) {
        try {
          const result = await this.s3Client!.send(
            new GetObjectCommand({
              Bucket: this.bucket,
              Key: key,
            }),
          );
          if (!result.Body) continue;
          const chunks: Buffer[] = [];
          for await (const chunk of result.Body as any) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          return Buffer.concat(chunks);
        } catch {
          // Try next candidate key
        }
      }
    }

    for (const key of candidates) {
      const localPath = path.isAbsolute(key)
        ? key
        : path.join(process.cwd(), key.startsWith('uploads') ? key : path.join('uploads', key));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }
    return null;
  }

  private getKeyCandidates(fileRef: string): string[] {
    const normalized = fileRef.replace(/\\/g, '/');
    const trimmedUploads = normalized.replace(/^\/?uploads\//, '');
    const fileName = path.basename(normalized);
    return Array.from(
      new Set([
        normalized,
        trimmedUploads,
        `documents/${fileName}`,
        `receipts/${fileName}`,
      ]),
    );
  }
}
