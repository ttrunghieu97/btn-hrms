import { promises as fs } from "fs";
import { type S3ClientService } from "./s3-client.service";
import { type StorageConfigService } from "./storage-config.service";
import { StorageObjectService } from "./storage-object.service";

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024, mtimeMs: 123456789, mtime: new Date("2026-01-01") }),
    copyFile: jest.fn().mockResolvedValue(undefined),
  },
  createReadStream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
}));

describe("StorageObjectService", () => {
  const mockSend = jest.fn();
  const mockS3CtorFns = {
    PutObjectCommand: jest.fn(),
    CopyObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    HeadObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
    CreateMultipartUploadCommand: jest.fn(),
    CompleteMultipartUploadCommand: jest.fn(),
    UploadPartCommand: jest.fn(),
  };
  const mockS3Client = {
    isS3: jest.fn(),
    ensureS3: jest.fn().mockResolvedValue(undefined),
    getS3: jest.fn().mockReturnValue({ send: mockSend }),
    getSdk: jest.fn().mockReturnValue(mockS3CtorFns),
    getBucket: jest.fn().mockReturnValue("test-bucket"),
    getPresignerMod: jest.fn().mockResolvedValue({
      getSignedUrl: jest.fn().mockResolvedValue("https://signed.url/file"),
    }),
    isSignedUrlEnabled: jest.fn().mockReturnValue(true),
    getSignedUrlTtlSec: jest.fn().mockReturnValue(300),
  } as unknown as jest.Mocked<S3ClientService>;

  const s3Config = { signedUrlsEnabled: true, signedUrlTtlSec: 300 } as StorageConfigService;
  const localConfig = { signedUrlsEnabled: false, signedUrlTtlSec: 300 } as StorageConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("local mode", () => {
    let service: StorageObjectService;
    beforeEach(() => {
      mockS3Client.isS3.mockReturnValue(false);
      service = new StorageObjectService(mockS3Client, localConfig);
    });

    it("putObject writes to local filesystem", async () => {
      await service.putObject("test/file.txt", Buffer.from("data"), "text/plain");
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("copyObject copies local file", async () => {
      await service.copyObject("source/file.txt", "dest/file.txt");
      expect(fs.copyFile).toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("copyObject throws NoSuchKey when source missing", async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));
      await expect(service.copyObject("missing/file.txt", "dest/file.txt")).rejects.toThrow("NoSuchKey");
    });

    it("deleteObject deletes local file", async () => {
      await service.deleteObject("test/file.txt");
      expect(fs.unlink).toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("deleteObject ignores ENOENT errors", async () => {
      (fs.unlink as jest.Mock).mockRejectedValue({ code: "ENOENT" });
      await expect(service.deleteObject("missing/file.txt")).resolves.toBeUndefined();
    });

    it("getObjectMeta returns file stats", async () => {
      const meta = await service.getObjectMeta("test/file.txt");
      expect(meta).toEqual({
        etag: '"1024-123456789"',
        lastModified: new Date("2026-01-01"),
        size: 1024,
      });
    });

    it("getObjectMeta returns null for missing file", async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error("ENOENT"));
      expect(await service.getObjectMeta("missing/file.txt")).toBeNull();
    });

    it("throws for presigned URL in local mode", async () => {
      await expect(service.getPresignedPutUrl("file-id", "key", "image/png")).rejects.toThrow(
        "Presigned URLs require S3 backend",
      );
    });

    it("getSignedFileUrl returns null in local mode", async () => {
      expect(await service.getSignedFileUrl("key")).toBeNull();
    });

    it("listObjects yields nothing in local mode", async () => {
      const results: string[] = [];
      for await (const key of service.listObjects("prefix")) results.push(key);
      expect(results).toEqual([]);
    });

    it("throws for multipart upload in local mode", async () => {
      await expect(service.createMultipartUpload("key", "image/png")).rejects.toThrow(
        "Multipart upload requires S3 backend",
      );
    });
  });

  describe("S3 mode", () => {
    let service: StorageObjectService;
    beforeEach(() => {
      mockS3Client.isS3.mockReturnValue(true);
      service = new StorageObjectService(mockS3Client, s3Config);
    });

    it("putObject calls S3 PutObjectCommand", async () => {
      mockSend.mockResolvedValue(undefined);
      await service.putObject("test/file.txt", Buffer.from("data"), "text/plain");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("copyObject calls S3 CopyObjectCommand", async () => {
      mockSend.mockResolvedValue(undefined);
      await service.copyObject("source/key", "dest/key");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("deleteObject calls S3 DeleteObjectCommand", async () => {
      mockSend.mockResolvedValue(undefined);
      await service.deleteObject("test/key");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("getObjectMeta maps S3 HeadObjectCommand response", async () => {
      mockSend.mockResolvedValue({ ETag: '"abc123"', LastModified: new Date("2026-01-01"), ContentLength: 2048, ContentType: "text/plain" });
      expect(await service.getObjectMeta("test/key")).toEqual({ etag: "abc123", lastModified: expect.any(Date), size: 2048, contentType: "text/plain" });
    });

    it("getObjectMeta returns null when S3 head fails", async () => {
      mockSend.mockRejectedValue(new Error("NoSuchKey"));
      expect(await service.getObjectMeta("missing/key")).toBeNull();
    });

    it("getObjectStream returns stream from S3", async () => {
      mockSend.mockResolvedValue({ Body: { pipe: jest.fn() }, ContentType: "application/pdf" });
      const result = await service.getObjectStream("test/key");
      expect(result.contentType).toBe("application/pdf");
    });

    it("getPresignedPutUrl returns signed URL", async () => {
      expect(await service.getPresignedPutUrl("file-id", "key", "image/png")).toBe("https://signed.url/file");
    });

    it("getSignedFileUrl returns signed URL", async () => {
      expect(await service.getSignedFileUrl("test/key")).toBe("https://signed.url/file");
    });

    it("getSignedFileUrl returns null when disabled", async () => {
      const srv = new StorageObjectService(mockS3Client, { signedUrlsEnabled: false, signedUrlTtlSec: 300 } as StorageConfigService);
      expect(await srv.getSignedFileUrl("test/key")).toBeNull();
    });

    it("listObjects yields keys", async () => {
      mockSend.mockResolvedValue({ Contents: [{ Key: "prefix/f1.txt" }], NextContinuationToken: undefined });
      const results: string[] = [];
      for await (const key of service.listObjects("prefix")) results.push(key);
      expect(results).toEqual(["prefix/f1.txt"]);
    });

    it("listObjects paginates", async () => {
      mockSend.mockResolvedValueOnce({ Contents: [{ Key: "prefix/f1.txt" }], NextContinuationToken: "t1" })
        .mockResolvedValueOnce({ Contents: [{ Key: "prefix/f2.txt" }], NextContinuationToken: undefined });
      const results: string[] = [];
      for await (const key of service.listObjects("prefix")) results.push(key);
      expect(results).toEqual(["prefix/f1.txt", "prefix/f2.txt"]);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("createMultipartUpload returns UploadId", async () => {
      mockSend.mockResolvedValue({ UploadId: "upload-123" });
      expect(await service.createMultipartUpload("key", "video/mp4")).toBe("upload-123");
    });
  });
});
