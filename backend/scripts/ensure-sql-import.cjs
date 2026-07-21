// Ensure `sql` from drizzle-orm is imported in given files.
const fs = require("node:fs");

for (const p of process.argv.slice(2)) {
  let src = fs.readFileSync(p, "utf8");
  if (/\bsql`/.test(src) === false && /\bsql\(/.test(src) === false) {
    console.log("no sql usage", p);
    continue;
  }
  // Already imported?
  if (/from\s+["']drizzle-orm["']/.test(src)) {
    src = src.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']drizzle-orm["']\s*;/,
      (m, body) => {
        const items = body.split(",").map((s) => s.trim()).filter(Boolean);
        if (items.includes("sql")) return m;
        items.push("sql");
        return `import { ${items.join(", ")} } from "drizzle-orm";`;
      },
    );
  } else {
    // Insert after first import line.
    const lines = src.split("\n");
    let inserted = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) {
        lines.splice(i + 1, 0, `import { sql } from "drizzle-orm";`);
        inserted = true;
        break;
      }
    }
    if (!inserted) lines.unshift(`import { sql } from "drizzle-orm";`);
    src = lines.join("\n");
  }
  fs.writeFileSync(p, src, "utf8");
  console.log("import sql added", p);
}
