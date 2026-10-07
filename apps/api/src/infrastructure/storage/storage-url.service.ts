import { Injectable } from "@nestjs/common";
import { StorageConfigService } from "./storage-config.service";

@Injectable()
export class StorageUrlService {
  private readonly backend: string;
  private readonly bucket: string;
  private readonly signedUrlsEnabled: boolean;
  private readonly signedUrlTtlSec: number;
  private readonly publicCdnEnabled: boolean;
  private readonly publicEndpoint: string | undefined;

  constructor(config: StorageConfigService) {
    this.backend = config.backend;
    this.bucket = config.bucket;
    this.signedUrlsEnabled = config.signedUrlsEnabled;
    this.signedUrlTtlSec = config.signedUrlTtlSec;
    this.publicCdnEnabled = config.publicCdnEnabled;
    this.publicEndpoint = config.s3PublicEndpoint;
  }

  isS3Url(): boolean {
    return this.backend === "s3";
  }

  isSignedUrlEnabled(): boolean {
    return this.isS3Url() && this.signedUrlsEnabled;
  }

  getSignedUrlTtlSec(): number {
    return this.signedUrlTtlSec;
  }

  getUrl(key: string): string {
    if (this.isS3Url()) return `/files/${key}`;
    return `/public/${key}`;
  }

  getPublicUrl(key: string): string | null {
    if (!this.publicCdnEnabled) return null;
    if (!this.publicEndpoint) return null;
    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }
}
