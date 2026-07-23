import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { StorageBackend } from "./storage.types";

@Injectable()
export class StorageConfigService {
  readonly backend: StorageBackend;
  readonly bucket: string;
  readonly signedUrlTtlSec: number;
  readonly signedUrlsEnabled: boolean;
  readonly publicCdnEnabled: boolean;

  // S3-specific — derived from STORAGE_S3_URL
  readonly s3Endpoint: string;
  readonly s3Region: string;
  readonly s3AccessKey: string;
  readonly s3SecretKey: string;
  readonly s3ForcePathStyle: boolean;

  readonly s3PublicEndpoint: string | undefined;

  constructor(config: ConfigService) {
    const rawBackend = String(config.get("STORAGE_BACKEND") || "local").toLowerCase();
    this.backend = rawBackend === "s3" ? "s3" : "local";
    this.bucket = String(config.get("STORAGE_BUCKET") || "btn-hrms");
    this.signedUrlTtlSec = Number(config.get("STORAGE_SIGNED_URL_TTL_SEC") || 300);
    this.signedUrlsEnabled = false;
    this.publicCdnEnabled =
      String(config.get("STORAGE_PUBLIC_CDN_ENABLED") || "false").toLowerCase() === "true";
    this.s3PublicEndpoint = config.get<string>("STORAGE_S3_PUBLIC_ENDPOINT");

    // Parse STORAGE_S3_URL as a connection URI
    // Format: http[s]://accessKey:secretKey@endpoint:port?region=xx&forcePathStyle=true
    const s3Url = config.get<string>("STORAGE_S3_URL");
    if (s3Url) {
      const url = new URL(s3Url);
      this.s3AccessKey = decodeURIComponent(url.username);
      this.s3SecretKey = decodeURIComponent(url.password);
      this.s3Endpoint = url.origin; // protocol + host + port
      this.s3Region = url.searchParams.get("region") || "us-east-1";
      this.s3ForcePathStyle = url.searchParams.get("forcePathStyle") !== "false";
    } else {
      this.s3AccessKey = "";
      this.s3SecretKey = "";
      this.s3Endpoint = "http://localhost:9000";
      this.s3Region = "us-east-1";
      this.s3ForcePathStyle = true;
    }
  }
}
