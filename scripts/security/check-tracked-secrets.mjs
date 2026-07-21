import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const forbidden = trackedFiles.filter((file) => {
  const name = basename(file).toLowerCase();
  if (name === ".env") return true;
  if (!name.startsWith(".env.")) return false;
  return ![".env.example", ".env.sample"].includes(name);
});

if (forbidden.length > 0) {
  console.error("Tracked environment files are forbidden:");
  for (const file of forbidden) console.error(`- ${file}`);
  console.error("Remove them from Git tracking and rotate any exposed credentials.");
  process.exit(1);
}

console.log("Tracked secret-file check passed.");
