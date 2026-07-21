const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const openApiPath = path.join(appRoot, 'openapi.json');
const modelDir = path.join(appRoot, 'src', 'api', 'generated', 'model');

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function lowerFirst(value) {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function toPascal(value) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(capitalize)
    .join('');
}

function toTsType(schema, nullable = false) {
  if (!schema) return null;

  let baseType = null;

  if (schema.enum?.length) {
    baseType = schema.enum.map((item) => JSON.stringify(item)).join(' | ');
  } else if (schema.type === 'string') {
    baseType = 'string';
  } else if (schema.type === 'integer' || schema.type === 'number') {
    baseType = 'number';
  } else if (schema.type === 'boolean') {
    baseType = 'boolean';
  } else if (schema.type === 'array') {
    const itemType = toTsType(schema.items, false) ?? 'unknown';
    baseType = `${itemType}[]`;
  }

  if (!baseType) {
    return null;
  }

  return nullable ? `${baseType} | null` : baseType;
}

function replaceExportType(filePath, typeName, nextType) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const current = fs.readFileSync(filePath, 'utf8');
  const updated = current.replace(
    new RegExp(`export type ${typeName} = [\\s\\S]*?;`),
    `export type ${typeName} = ${nextType};`,
  );

  if (updated === current) {
    return false;
  }

  fs.writeFileSync(filePath, updated);
  return true;
}

function rewriteParamsType(filePath, typeName, parameters) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const current = fs.readFileSync(filePath, 'utf8');
  const headerMatch = current.match(/^([\s\S]*?)export type /);
  const header = headerMatch ? headerMatch[1] : '';

  const props = parameters
    .map((parameter) => {
      const tsType = toTsType(parameter.schema, false) ?? 'unknown';
      const optional = parameter.required ? '' : '?';
      return `${parameter.name}${optional}: ${tsType};`;
    })
    .join('\n');

  const next =
    `${header}export type ${typeName} = {\n` +
    (props ? `${props}\n` : '') +
    `};\n`;

  if (next === current) {
    return false;
  }

  fs.writeFileSync(filePath, next);
  return true;
}

function getOperationParameters(pathItem = {}, operation = {}) {
  const combined = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];
  const byKey = new Map();

  for (const parameter of combined) {
    const key = `${parameter.in}:${parameter.name}`;
    byKey.set(key, parameter);
  }

  return Array.from(byKey.values());
}

function main() {
  const openApi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  const schemas = openApi.components?.schemas ?? {};

  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    const properties = schemaDef.properties ?? {};

    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      if (!propertySchema || propertySchema.nullable !== true) {
        continue;
      }

      const tsType = toTsType(propertySchema, true);
      if (!tsType) {
        continue;
      }

      const aliasName = `${schemaName}${capitalize(propertyName)}`;
      const filename = `${lowerFirst(aliasName)}.ts`;
      replaceExportType(path.join(modelDir, filename), aliasName, tsType);
    }
  }

  for (const [route, pathItem] of Object.entries(openApi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        continue;
      }

      if (!operation || typeof operation !== 'object' || !operation.operationId) {
        continue;
      }

      const parameters = getOperationParameters(pathItem, operation)
        .filter(
          (parameter) =>
            parameter?.schema &&
            parameter?.name &&
            parameter.in !== 'path',
        );

      if (parameters.length === 0) {
        continue;
      }

      const typeName = `${toPascal(operation.operationId)}Params`;
      const filename = `${lowerFirst(typeName)}.ts`;
      rewriteParamsType(path.join(modelDir, filename), typeName, parameters);
    }
  }
}

main();
