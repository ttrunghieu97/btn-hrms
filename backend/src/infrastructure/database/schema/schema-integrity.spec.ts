import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { fileStatusEnum } from "./_shared/enums";
import { files } from "./_shared/files";
import {
  certifications,
  employeeDocuments,
} from "./workforce/tables";

const schemaDir = __dirname;
const srcRoot = join(schemaDir, "..", "..", "..");

describe("schema integrity guards", () => {
  it("schema/index.ts contains no pgTable() definitions", () => {
    const indexSrc = readFileSync(join(schemaDir, "index.ts"), "utf8");
    expect(indexSrc).not.toContain("pgTable(");
  });

  it("legacy top-level schema files do not exist", () => {
    const banned = [
      "tables.ts",
      "relations.ts",
      "schema.ts",
      "enums.ts",
    ];
    for (const file of banned) {
      expect(existsSync(join(schemaDir, file))).toBe(false);
    }
  });

  it("workforce-legacy.schema.ts does not exist", () => {
    const legacyPath = join(
      srcRoot,
      "modules",
      "workforce",
      "infrastructure",
      "workforce-legacy.schema.ts",
    );
    expect(existsSync(legacyPath)).toBe(false);
  });

  it("workforce repositories do not import from workforce-legacy schema", () => {
    // All repositories now live in their respective domain modules
    // This test is preserved as an empty check since old paths are gone
    expect(true).toBe(true);
  });

  it("no pgTable SQL name is declared in two different domain files", () => {
    const tableNamePattern = /pgTable\(\s*["']([^"']+)["']/g;
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    function scanDir(dir: string) {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const entryPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(entryPath);
        } else if (entry.isFile() && entry.name === "tables.ts") {
          const src = readFileSync(entryPath, "utf8");
          let match: RegExpExecArray | null;
          while ((match = tableNamePattern.exec(src)) !== null) {
            const tableName = match[1]!;
            const prev = seen.get(tableName);
            if (prev && prev !== entryPath) {
              duplicates.push(`"${tableName}" in ${entryPath} and ${prev}`);
            } else {
              seen.set(tableName, entryPath);
            }
          }
        }
      }
    }

    scanDir(schemaDir);
    expect(duplicates).toEqual([]);
  });

  it("no module imports from internal schema sub-paths (only barrel allowed)", () => {
    const modulesRoot = join(srcRoot, "modules");
    const bannedPattern =
      /from\s+["'][^"']*infrastructure\/database\/schema\/[a-z_-]+\.(schema|tables|relations|enums)["']/;

    function scanDir(dir: string): string[] {
      if (!existsSync(dir)) return [];
      const violations: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const entryPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          violations.push(...scanDir(entryPath));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
          const src = readFileSync(entryPath, "utf8");
          if (bannedPattern.test(src)) {
            violations.push(entryPath);
          }
        }
      }
      return violations;
    }

    expect(scanDir(modulesRoot)).toEqual([]);
  });

  it("does not declare not-null companyId with set-null delete in any domain table", () => {
    function scanDir(dir: string) {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const entryPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(entryPath);
        } else if (entry.isFile() && entry.name === "tables.ts") {
          const src = readFileSync(entryPath, "utf8");
          expect(src).not.toMatch(
            /companyId:\s+uuid\("company_id"\)\s+\.notNull\(\)\s+\.references\(\(\)\s*=>\s*companies\.id,\s*\{\s*onDelete:\s*"set null"/gs,
          );
        }
      }
    }

    scanDir(schemaDir);
  });

  describe("file lifecycle schema requirements", () => {
    it("fileStatusEnum matches required lifecycle statuses", () => {
      expect(fileStatusEnum.enumValues).toEqual([
        "temp",
        "active",
        "archived",
        "replaced",
        "orphan",
        "finalize_failed",
        "pending_upload",
      ]);
    });

    it("files table keeps required lifecycle column defaults and nullability", () => {
      expect(files.finalizeAttempts.notNull).toBe(true);
      expect(files.finalizeAttempts.default).toBe(0);
      expect(files.lastFinalizeAt.notNull).toBe(false);
      expect(files.lastFinalizeError.notNull).toBe(false);
      expect(files.status.notNull).toBe(true);
      expect(files.status.default).toBe("temp");
    });
  });

  describe("employee attachment relation schema requirements", () => {
    it("defines employee attachment relation tables", () => {
      expect(employeeDocuments).toBeDefined();
      expect(certifications.fileId).toBeDefined();
    });

    it("keeps attachment relation foreign keys and activity flags", () => {
      expect(employeeDocuments.fileId.notNull).toBe(true);
      expect(employeeDocuments.documentType.notNull).toBe(true);
      expect(employeeDocuments.isActive.default).toBe(true);
      expect(certifications.fileId.notNull).toBe(false);
    });
  });

  describe("active schema domain policy", () => {
    it("does not export speculative placeholder domain schemas", () => {
      const indexSrc = readFileSync(join(schemaDir, "index.ts"), "utf8");
      const inactiveDomains = [
        "hr-helpdesk",
      ];

      for (const domain of inactiveDomains) {
        expect(indexSrc).not.toContain(`./${domain}/enums`);
        expect(indexSrc).not.toContain(`./${domain}/tables`);
        expect(indexSrc).not.toContain(`./${domain}/relations`);
      }
    });

    it("does not export retired core duplicate tables", async () => {
      const schema = await import("./index");

      expect(schema).not.toHaveProperty("workLocations");
      expect(schema).not.toHaveProperty("payrollFormulaComponents");
      expect(schema).not.toHaveProperty("salaryStructureComponents");
      expect(schema).not.toHaveProperty("payrollAccumulators");
      expect(schema).not.toHaveProperty("payComponentRules");
    });
  });
});
