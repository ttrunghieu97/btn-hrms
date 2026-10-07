#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const sourceAlias = process.env.MINIO_SOURCE_ALIAS || "btn-hrms-source";
const targetAlias = process.env.MINIO_BACKUP_ALIAS || "btn-hrms-backup";
const bucket = process.env.MINIO_BUCKET || process.env.STORAGE_S3_BUCKET || "btn-hrms";
const targetBucket = process.env.MINIO_BACKUP_BUCKET || bucket;

const required = [
  "MINIO_SOURCE_ENDPOINT",
  "MINIO_SOURCE_ACCESS_KEY",
  "MINIO_SOURCE_SECRET_KEY",
  "MINIO_BACKUP_ENDPOINT",
  "MINIO_BACKUP_ACCESS_KEY",
  "MINIO_BACKUP_SECRET_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing MinIO backup env vars: ${missing.join(", ")}`);
  process.exit(1);
}

function formatHost(endpoint, accessKey, secretKey) {
  const ep = endpoint.startsWith("http://") || endpoint.startsWith("https://") ? endpoint : `http://${endpoint}`;
  const url = new URL(ep);
  url.username = encodeURIComponent(accessKey);
  url.password = encodeURIComponent(secretKey);
  return url.toString();
}

const customEnv = {
  ...process.env,
  [`MC_HOST_${sourceAlias}`]: formatHost(process.env.MINIO_SOURCE_ENDPOINT, process.env.MINIO_SOURCE_ACCESS_KEY, process.env.MINIO_SOURCE_SECRET_KEY),
  [`MC_HOST_${targetAlias}`]: formatHost(process.env.MINIO_BACKUP_ENDPOINT, process.env.MINIO_BACKUP_ACCESS_KEY, process.env.MINIO_BACKUP_SECRET_KEY),
};

function run(args) {
  const result = spawnSync("mc", args, { stdio: "inherit", env: customEnv, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(["mb", "--ignore-existing", `${targetAlias}/${targetBucket}`]);
run(["mirror", "--overwrite", `${sourceAlias}/${bucket}`, `${targetAlias}/${targetBucket}`]);

console.log(`MinIO bucket mirrored: ${sourceAlias}/${bucket} -> ${targetAlias}/${targetBucket}`);
