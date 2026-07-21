const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(appRoot, 'error-contracts.manifest.json');
const outputDir = path.join(appRoot, 'src', 'lib', 'generated');
const outputPath = path.join(outputDir, 'backend-error-contracts.generated.ts');
const shouldCheck = process.argv.includes('--check');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeEol(value) {
  return value.replace(/\r\n/g, '\n');
}

function readManifest() {
  assert(
    fs.existsSync(manifestPath),
    'Missing error contract manifest. Run `npm --prefix backend run error-contracts:json ../web/error-contracts.manifest.json`.',
  );

  const manifest = JSON.parse(read(manifestPath));

  assert(manifest?.schemaVersion === 1, 'Unsupported error contract manifest schema version.');
  assert(
    manifest?.contracts && typeof manifest.contracts === 'object',
    'Invalid error contract manifest: missing contracts object.',
  );

  return manifest;
}

function serializeContracts(manifest) {
  const entries = Object.entries(manifest.contracts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([backendCode, contract]) => {
      assert(
        contract?.code === backendCode,
        `Manifest contract code mismatch for ${backendCode}.`,
      );
      return [backendCode, contract];
    });

  const lines = [
    '/**',
    ' * Auto-generated from backend/src/shared/constants/error-contracts.ts.',
    ' * Do not edit manually.',
    ' */',
    '',
    `export const generatedErrorContractSchemaVersion = ${manifest.schemaVersion} as const;`,
    '',
    'export const generatedBackendErrorCodes = [',
    ...entries.map(([backendCode]) => `  '${backendCode}',`),
    '] as const;',
    '',
    'export const generatedBackendErrorContracts = {',
    ...entries.flatMap(([backendCode, contract]) => [
      `  ${backendCode}: {`,
      `    backendCode: '${backendCode}',`,
      `    httpStatus: ${contract.httpStatus},`,
      `    domain: '${contract.domain}',`,
      `    apiCode: '${contract.apiCode}',`,
      `    kind: '${contract.kind}',`,
      `    retryable: ${contract.retryable ? 'true' : 'false'},`,
      `    action: '${contract.action}',`,
      '  },',
    ]),
    '} as const;',
    '',
  ];

  return `${lines.join('\n')}`;
}

function main() {
  const manifest = readManifest();
  const nextContent = serializeContracts(manifest);

  if (shouldCheck) {
    assert(
      fs.existsSync(outputPath),
      'Generated backend error contract catalog is missing. Run `npm run error-contracts:generate`.',
    );

    const current = normalizeEol(read(outputPath));
    assert(
      current === normalizeEol(nextContent),
      'Generated backend error contract catalog is stale. Run `npm run error-contracts:generate`.',
    );
    process.stdout.write('Backend error contract catalog is up to date.\n');
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, nextContent);
  process.stdout.write('Backend error contract catalog generated.\n');
}

main();
