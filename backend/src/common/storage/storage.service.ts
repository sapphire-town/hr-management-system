import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly provider: 'local' | 'minio' | 's3';
  private readonly bucket: string;
  private enabled: boolean;
  private readonly s3Client: S3Client | null;
  private bucketReadyPromise: Promise<void> | null = null;
  private readonly autoCreateBucket: boolean;

  constructor(private readonly configService: ConfigService) {
    const provider = (this.configService.get<string>('STORAGE_PROVIDER') || 'local').toLowerCase();
    this.provider = provider === 'minio' || provider === 's3' ? provider : 'local';
    this.enabled = provider === 'minio' || provider === 's3';
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'hr-management-files';
    this.autoCreateBucket =
      (this.configService.get<string>('S3_AUTO_CREATE_BUCKET') || '').toLowerCase() === 'true' ||
      this.provider === 'minio';
    this.logger.log(`Storage provider set to: ${this.enabled ? 'MinIO/S3' : 'Local'}`);

    if (!this.enabled) {
      this.s3Client = null;
      return;
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY');

    if (!region || (provider === 'minio' && (!endpoint || !accessKeyId || !secretAccessKey))) {
      this.logger.warn('S3/MinIO variables missing. Falling back to local storage.');
      this.enabled = false;
      this.s3Client = null;
      return;
    }

    if (provider === 'minio') {this.s3Client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });} else if (provider === 's3') {
      this.s3Client = new S3Client({
      region,
    });
    }
    
  }

  isRemoteStorageEnabled(): boolean {
    return this.enabled && !!this.s3Client;
  }

  getStorageProvider(): string {
    return this.isRemoteStorageEnabled() ? this.provider : 'local';
  }

  getBucketName(): string {
    return this.bucket;
  }

  async ensureBucket(): Promise<void> {
    if (!this.isRemoteStorageEnabled()) return;
    if (!this.autoCreateBucket) {
      return;
    }
    if (this.bucketReadyPromise) {
      return this.bucketReadyPromise;
    }

    this.bucketReadyPromise = this.ensureBucketInternal();
    try {
      await this.bucketReadyPromise;
    } catch (error) {
      this.bucketReadyPromise = null;
      throw error;
    }
  }

  private async ensureBucketInternal(): Promise<void> {
    if (!this.autoCreateBucket) {
      return;
    }

    try {
      await this.s3Client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (error: any) {
      const errorName = error?.name || '';
      const statusCode = error?.$metadata?.httpStatusCode;
      const isMissingBucket =
        errorName === 'NotFound' ||
        errorName === 'NoSuchBucket' ||
        statusCode === 404;

      if (!isMissingBucket) {
        this.logger.error(
          `Bucket access check failed for "${this.bucket}" (${this.provider}): ${errorName || 'UnknownError'} ${error?.message || ''}`.trim(),
        );
        throw error;
      }
    }

    if (!this.autoCreateBucket) {
      throw new Error(
        `Bucket "${this.bucket}" was not found and auto-creation is disabled for provider "${this.provider}". Create the bucket manually or enable S3_AUTO_CREATE_BUCKET=true.`,
      );
    }

    try {
      await this.s3Client!.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error: any) {
      const errorName = error?.name || '';
      if (errorName === 'BucketAlreadyOwnedByYou' || errorName === 'BucketAlreadyExists') {
        return;
      }
      this.logger.error(
        `Bucket creation failed for "${this.bucket}" (${this.provider}): ${errorName || 'UnknownError'} ${error?.message || ''}`.trim(),
      );
      throw error;
    }
  }

  async checkBucketAccess(): Promise<{ ok: boolean; message: string }> {
    if (!this.isRemoteStorageEnabled()) {
      return { ok: true, message: 'Local storage mode enabled' };
    }

    try {
      if (this.autoCreateBucket) {
        await this.ensureBucket();
        await this.s3Client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
        return { ok: true, message: 'MinIO/S3 bucket is reachable' };
      }

      // In AWS S3 deployments the app often has object-level access only.
      // Skip HeadBucket in that case and report configuration status instead.
      return {
        ok: true,
        message: 'S3 bucket checks skipped because auto-create is disabled; verify with a real upload if needed',
      };
    } catch (error: any) {
      return {
        ok: false,
        message: error?.message || 'Failed to access MinIO/S3 bucket',
      };
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
