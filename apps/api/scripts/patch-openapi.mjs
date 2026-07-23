#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const [openapiPath] = process.argv.slice(2);
if (!openapiPath) {
  console.error('Usage: node patch-openapi.mjs <openapi.json path>');
  process.exit(1);
}

const openapi = JSON.parse(readFileSync(openapiPath, 'utf-8'));

let patches = 0;

// Patch multipart form schemas
for (const [path, methods] of Object.entries(openapi.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const ep = methods[method];
    if (!ep?.requestBody?.content?.['multipart/form-data']?.schema?.properties) continue;
    
    const props = ep.requestBody.content['multipart/form-data'].schema.properties;
    if (props.lunchDutyType) continue;
    
    props.lunchDutyType = { type: "string", enum: ["indoor", "outdoor"] };
    patches++;
  }
}

// Patch AttendanceResponseDto schema
const schemas = openapi.components?.schemas;
if (schemas?.AttendanceResponseDto?.properties) {
  const props = schemas.AttendanceResponseDto.properties;
  if (!props.lunchDutyType) {
    props.lunchDutyType = { type: "string", nullable: true };
    patches++;
  }
}

writeFileSync(openapiPath, JSON.stringify(openapi, null, 2));
console.log(`Patched ${patches} schema(s) with lunchDutyType`);
