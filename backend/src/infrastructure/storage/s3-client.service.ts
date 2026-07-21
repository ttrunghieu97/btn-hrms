import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import type { S3Client as S3ClientType } from "@aws-sdk/client-s3";
import type * as S3Sdk from "@aws-sdk/client-s3";
import type * as S3Presigner from "@aws-sdk/s3-request-presigner";
import { StorageConfigService } from "./storage-config.service";

@Injectable()
export class S3ClientService {
  readonly bucket: string;
  readonly signedUrlTtlSec: number;

  private readonly signedUrlsEnabled: boolean;
  private readonly s3Endpoint: string;
  private readonly s3PublicEndpoint: string | undefined;
  private readonly s3Region: string;
  private readonly s3AccessKey: string;
  private readonly s3SecretKey: string;
  private readonly isS3Backend: boolean;

  private sdk: typeof S3Sdk | null = null;
  private presignerMod: typeof S3Presigner | null = null;
  private s3: S3ClientType | null = null;
  private s3Public: S3ClientType | null = null;
  private s3InitPromise: Promise<void> | null = null;
  private s3InitFailCount = 0;
  private s3InitLastFailAt = 0;

  constructor(config: StorageConfigService) {
    this.isS3Backend = config.backend === "s3";
    this.bucket = config.bucket;
    this.signedUrlTtlSec = config.signedUrlTtlSec;
    this.signedUrlsEnabled = config.signedUrlsEnabled;
    this.s3Endpoint = config.s3Endpoint;
    this.s3PublicEndpoint = config.s3PublicEndpoint;
    this.s3Region = config.s3Region;
    this.s3AccessKey = config.s3AccessKey ?? "";
    this.s3SecretKey = config.s3SecretKey ?? "";

    if (this.isS3Backend) {
      setImmediate(() => {
        this.ensureS3().catch(() => {});
      });
    }
  }

  isS3(): boolean {
    return this.isS3Backend;
  }

  isSignedUrlEnabled(): boolean {
    return this.isS3Backend && this.signedUrlsEnabled;
  }

  getS3(): S3ClientType {
    return this.s3!;
  }

  getSdk(): typeof S3Sdk {
    return this.sdk!;
  }

  getBucket(): string {
    return this.bucket;
  }

  getSignedUrlTtlSec(): number {
    return this.signedUrlTtlSec;
  }

  async getPresignerMod(): Promise<typeof S3Presigner> {
    if (!this.presignerMod) {
      this.presignerMod = await import("@aws-sdk/s3-request-presigner");
    }
    return this.presignerMod;
  }

  async ensureS3(): Promise<void> {
    const CIRCUIT_BREAKER_LIMIT = 3;
    const CIRCUIT_BREAKER_TTL_MS = 60_000;

    if (this.s3InitFailCount >= CIRCUIT_BREAKER_LIMIT) {
      const now = Date.now();
      if (now - this.s3InitLastFailAt < CIRCUIT_BREAKER_TTL_MS) {
        return Promise.reject(
          new ServiceUnavailableException("S3 initialization circuit breaker open"),
        );
      }
      this.s3InitFailCount = 0;
    }

    if (!this.s3InitPromise) {
      this.s3InitPromise = this.initS3()
        .then(() => {
          this.s3InitFailCount = 0;
          this.s3InitLastFailAt = 0;
        })
        .catch((err) => {
          this.s3InitFailCount++;
          this.s3InitLastFailAt = Date.now();
          this.s3InitPromise = null;
          throw err;
        });
    }
    return this.s3InitPromise;
  }

  private async initS3(): Promise<void> {
    const sdk = await import("@aws-sdk/client-s3");

    if (!this.s3AccessKey || !this.s3SecretKey) {
      throw new Error(
        "STORAGE_S3_URL must include credentials (accessKey:secretKey@) when STORAGE_BACKEND=s3",
      );
    }

    const requestHandler = new NodeHttpHandler({
      connectionTimeout: 10_000,
      requestTimeout: 10_000,
    });
    const resolvedMaxAttempts = 3;

    this.sdk = sdk;
    this.s3 = new sdk.S3Client({
      region: this.s3Region,
      endpoint: this.s3Endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: this.s3AccessKey, secretAccessKey: this.s3SecretKey },
      requestHandler,
      maxAttempts: resolvedMaxAttempts,
    });

    if (this.s3PublicEndpoint && this.s3PublicEndpoint !== this.s3Endpoint) {
      this.s3Public = new sdk.S3Client({
        region: this.s3Region,
        endpoint: this.s3PublicEndpoint,
        forcePathStyle: true,
        credentials: { accessKeyId: this.s3AccessKey, secretAccessKey: this.s3SecretKey },
        requestHandler,
        maxAttempts: resolvedMaxAttempts,
      });
    }
  }

  async healthCheckS3(): Promise<{ ok: boolean; detail?: string }> {
    if (!this.isS3Backend) return { ok: false, detail: "not_s3_backend" };
    await this.ensureS3();
    try {
      await this.s3!.send(
        new this.sdk!.ListObjectsV2Command({ Bucket: this.bucket, MaxKeys: 1 }),
      );
      return { ok: true };
    } catch (err: unknown) {
      return {
        ok: false,
        detail: (err as Error).message || "s3_unreachable",
      };
    }
  }
}
