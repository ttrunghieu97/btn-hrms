import { createReadStream, promises as fs } from "fs";
import { dirname } from "path";
import { Injectable } from "@nestjs/common";
import { S3ClientService } from "./s3-client.service";
import { StorageConfigService } from "./storage-config.service";
import type { StorageObjectMeta } from "./storage.types";
import {
  localPath,
  localPathForWrite,
} from "./storage-path.util";

@Injectable()
export class StorageObjectService {
  constructor(
    private readonly s3Client: S3ClientService,
    private readonly config: StorageConfigService,
  ) {}

  async putObject(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    if (this.isS3Backend) {
      await this.s3Client.ensureS3();
      await this.s3Client.getS3().send(
        new (this.s3Client.getSdk() as any).PutObjectCommand({
          Bucket: this.s3Client.getBucket(),
          Key: key,
          Body: new Uint8Array(buffer),
          ContentType: mimeType,
          ContentLength: buffer.length,
        }),
      );
      return;
    }

    const filePath = localPathForWrite(key);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async copyObject(sourceKey: string, targetKey: string): Promise<void> {
    if (this.isS3Backend) {
      await this.s3Client.ensureS3();
      const bucket = this.s3Client.getBucket();
      await this.s3Client.getS3().send(
        new (this.s3Client.getSdk() as any).CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${sourceKey}`,
          Key: targetKey,
        }),
      );
      return;
    }

    const src = localPath(sourceKey);
    const dest = localPathForWrite(targetKey);
    if (!src) throw Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" });

    try {
      await fs.access(src);
    } catch {
      throw Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" });
    }

    await fs.mkdir(dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }

  async deleteObject(key: string): Promise<void> {
    if (this.isS3Backend) {
      await this.s3Client.ensureS3();
      await this.s3Client.getS3().send(
        new (this.s3Client.getSdk() as any).DeleteObjectCommand({
          Bucket: this.s3Client.getBucket(),
          Key: key,
        }),
      );
      return;
    }

    const filePath = localPath(key);
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        if ((err as any).code !== "ENOENT") throw err;
      }
    }
  }

  async getObjectMeta(key: string): Promise<StorageObjectMeta | null> {
    if (this.isS3Backend) {
      await this.s3Client.ensureS3();
      try {
        const res: any = await this.s3Client.getS3().send(
          new (this.s3Client.getSdk() as any).HeadObjectCommand({
            Bucket: this.s3Client.getBucket(),
            Key: key,
          }),
        );
        return {
          etag: res.ETag?.replace(/"/g, ""),
          lastModified: res.LastModified,
          size:
            typeof res.ContentLength === "number"
              ? res.ContentLength
              : undefined,
          contentType: res.ContentType,
        };
      } catch {
        return null;
      }
    }

    try {
      const filePath = localPath(key);
      if (!filePath) return null;
      const stat = await fs.stat(filePath);
      return {
        etag: `"${stat.size}-${stat.mtimeMs}"`,
        lastModified: stat.mtime,
        size: stat.size,
      };
    } catch {
      return null;
    }
  }

  async getObjectStream(
    key: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string | undefined }> {
    if (this.isS3Backend) {
      await this.s3Client.ensureS3();
      const res: any = await this.s3Client.getS3().send(
        new (this.s3Client.getSdk() as any).GetObjectCommand({
          Bucket: this.s3Client.getBucket(),
          Key: key,
        }),
      );
      return {
        stream: res.Body as NodeJS.ReadableStream,
        contentType: res.ContentType,
      };
    }

    const filePath = localPath(key);
    if (!filePath) {
      throw new Error("invalid_path");
    }
    try {
      await fs.access(filePath);
    } catch {
      throw new Error("file_not_found");
    }
    return { stream: createReadStream(filePath), contentType: undefined };
  }

  async *listObjects(prefix: string): AsyncGenerator<string> {
    if (!this.isS3Backend) return;
    await this.s3Client.ensureS3();
    const sdk = this.s3Client.getSdk();
    const s3 = this.s3Client.getS3();
    const bucket = this.s3Client.getBucket();

    let continuationToken: string | undefined;
    do {
      const res: any = await s3.send(
        new (sdk as any).ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) yield obj.Key;
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);
  }

  async getPresignedPutUrl(
    fileId: string,
    key: string,
    mimeType: string,
    expiresInSec = 300,
  ): Promise<string> {
    if (!this.isS3Backend) {
      throw new Error("Presigned URLs require S3 backend");
    }
    await this.s3Client.ensureS3();
    const presignerMod = await this.s3Client.getPresignerMod();
    return presignerMod.getSignedUrl(
      this.s3Client.getS3(),
      new (this.s3Client.getSdk() as any).PutObjectCommand({
        Bucket: this.s3Client.getBucket(),
        Key: key,
        ContentType: mimeType,
      }),
      { expiresIn: expiresInSec },
    );
  }

  async getSignedFileUrl(key: string): Promise<string | null> {
    if (!this.isS3Backend) return null;
    if (!this.isSignedUrlEnabled()) return null;
    await this.s3Client.ensureS3();
    const presignerMod = await this.s3Client.getPresignerMod();
    const ttl =
      Number.isFinite(this.signedUrlTtlSec) && this.signedUrlTtlSec > 0
        ? this.signedUrlTtlSec
        : 300;
    const client = this.s3Client.getS3();
    return presignerMod.getSignedUrl(
      client,
      new (this.s3Client.getSdk() as any).GetObjectCommand({
        Bucket: this.s3Client.getBucket(),
        Key: key,
      }),
      { expiresIn: ttl },
    );
  }

  private isSignedUrlEnabled(): boolean {
    return this.isS3Backend && this.config.signedUrlsEnabled;
  }

  private get signedUrlTtlSec(): number {
    return this.config.signedUrlTtlSec;
  }

  private get isS3Backend(): boolean {
    return this.s3Client.isS3();
  }

  async createMultipartUpload(key: string, mimeType: string): Promise<string> {
    if (!this.isS3Backend)
      throw new Error("Multipart upload requires S3 backend");
    await this.s3Client.ensureS3();
    const res: any = await this.s3Client.getS3().send(
      new (this.s3Client.getSdk() as any).CreateMultipartUploadCommand({
        Bucket: this.s3Client.getBucket(),
        Key: key,
        ContentType: mimeType,
      }),
    );
    if (!res.UploadId) throw new Error("Failed to initiate multipart upload");
    return res.UploadId;
  }

  async getPresignedPartUrls(
    uploadId: string,
    key: string,
    partCount: number,
    expiresInSec = 3600,
  ): Promise<string[]> {
    if (!this.isS3Backend)
      throw new Error("Multipart upload requires S3 backend");
    await this.s3Client.ensureS3();
    const presignerMod = await this.s3Client.getPresignerMod();
    const sdk = this.s3Client.getSdk();
    const s3 = this.s3Client.getS3();
    const bucket = this.s3Client.getBucket();
    const urls: string[] = [];
    for (let i = 1; i <= partCount; i++) {
      const url = await presignerMod.getSignedUrl(
        s3,
        new (sdk as any).UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: i,
        }),
        { expiresIn: expiresInSec },
      );
      urls.push(url);
    }
    return urls;
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<void> {
    if (!this.isS3Backend)
      throw new Error("Multipart upload requires S3 backend");
    await this.s3Client.ensureS3();
    await this.s3Client.getS3().send(
      new (this.s3Client.getSdk() as any).CompleteMultipartUploadCommand({
        Bucket: this.s3Client.getBucket(),
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((p) => ({
            PartNumber: p.partNumber,
            ETag: p.etag,
          })),
        },
      }),
    );
  }
}


