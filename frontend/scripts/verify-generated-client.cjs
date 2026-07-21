const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(appRoot, 'src', 'api', 'generated');
const modelRoot = path.join(generatedRoot, 'model');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyFileExists(relativePath) {
  const fullPath = path.join(appRoot, relativePath);
  assert(fs.existsSync(fullPath), `Missing generated file: ${relativePath}`);
  return fullPath;
}

function verifyNoBrokenNullableAliases() {
  const files = fs.readdirSync(modelRoot).filter((name) => name.endsWith('.ts'));
  const broken = [];

  for (const name of files) {
    const content = read(path.join(modelRoot, name));
    if (content.includes('{ [key: string]: unknown } | null')) {
      broken.push(name);
    }
  }

  assert(
    broken.length === 0,
    `Broken nullable aliases remain in generated client: ${broken.join(', ')}`,
  );
}

function verifyCriticalContracts() {
  const positionsParams = read(
    verifyFileExists('src/api/generated/model/positionsControllerFindAllParams.ts'),
  );
  assert(
    positionsParams.includes('departmentId?: string;'),
    'positionsControllerFindAllParams.departmentId must be optional string',
  );

  const employeeFindOneParams = read(
    verifyFileExists('src/api/generated/model/employeesControllerFindOneParams.ts'),
  );
  assert(
    !employeeFindOneParams.includes('username:'),
    'employeesControllerFindOneParams must not include path param username',
  );

  const departmentEmployeesParams = read(
    verifyFileExists(
      'src/api/generated/model/departmentEmployeesControllerListByDepartmentParams.ts',
    ),
  );
  assert(
    !departmentEmployeesParams.includes('id:'),
    'departmentEmployeesControllerListByDepartmentParams must not include path param id',
  );
}

function main() {
  verifyFileExists('src/api/generated/endpoints.ts');
  verifyNoBrokenNullableAliases();
  verifyCriticalContracts();
  process.stdout.write('Generated client verification passed.\n');
}

main();
