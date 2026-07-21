import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnv } from "../../../../infrastructure/database/env";
import {
  boardingTemplates,
  boardingTemplateItems,
} from "../../../../infrastructure/database/schema";
import { sql } from "drizzle-orm";

loadEnv();

interface SeedItem {
  title: string;
  dueDaysOffset: number;
  mandatory: boolean;
}

interface SeedTemplate {
  name: string;
  type: "onboarding" | "offboarding";
  items: SeedItem[];
}

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: "Standard Onboarding",
    type: "onboarding",
    items: [
      {
        title: "Prepare equipment and workspace",
        dueDaysOffset: -1,
        mandatory: true,
      },
      {
        title: "Create system accounts (Email, Slack, Jira)",
        dueDaysOffset: 0,
        mandatory: true,
      },
      {
        title: "Sign labor contract and NDA",
        dueDaysOffset: 7,
        mandatory: true,
      },
      {
        title: "Attend company introduction session",
        dueDaysOffset: 14,
        mandatory: false,
      },
    ],
  },
  {
    name: "Engineering Onboarding",
    type: "onboarding",
    items: [
      {
        title: "Request repository access (GitHub/GitLab)",
        dueDaysOffset: 1,
        mandatory: true,
      },
      {
        title: "Setup local development environment",
        dueDaysOffset: 2,
        mandatory: true,
      },
      {
        title: "Complete security and compliance training",
        dueDaysOffset: 5,
        mandatory: true,
      },
    ],
  },
  {
    name: "Standard Offboarding",
    type: "offboarding",
    items: [
      {
        title: "Collect company assets (laptop, phone, badge)",
        dueDaysOffset: 0,
        mandatory: true,
      },
      {
        title: "Revoke system access (Email, Slack, Jira)",
        dueDaysOffset: 0,
        mandatory: true,
      },
      {
        title: "Knowledge transfer handover",
        dueDaysOffset: 0,
        mandatory: true,
      },
      {
        title: "Conduct exit interview",
        dueDaysOffset: 0,
        mandatory: true,
      },
      {
        title: "Final settlement computation",
        dueDaysOffset: 0,
        mandatory: true,
      },
    ],
  },
] as const;

async function seed() {
  const connectionString =
    process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not defined");
    process.exitCode = 1;
    return;
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    let created = 0;
    let skipped = 0;

    for (const tmpl of SEED_TEMPLATES) {
      const existing = await db
        .select({ id: boardingTemplates.id })
        .from(boardingTemplates)
        .where(sql`${boardingTemplates.name} = ${tmpl.name}`)
        .limit(1);

      if (existing.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`  Skipped (exists): ${tmpl.name}`);
        skipped++;
        continue;
      }

      const [template] = await db
        .insert(boardingTemplates)
        .values({
          name: tmpl.name,
          type: tmpl.type,
          isDefault: false,
          isActive: true,
        })
        .returning();

      if (!template) {
        console.error(`  Failed to create: ${tmpl.name}`);
        continue;
      }

      await db.insert(boardingTemplateItems).values(
        tmpl.items.map((item, idx) => ({
          templateId: template.id,
          title: item.title,
          assigneeType: "hr" as const,
          dueDaysOffset: item.dueDaysOffset,
          isMandatory: item.mandatory,
          sortOrder: (idx + 1) * 10,
        })),
      );

      created++;
      // eslint-disable-next-line no-console
      console.log(`  Created: ${tmpl.name}`);
    }

    console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  } catch (error) {
    console.error("Seed error:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
    process.exit(process.exitCode);
  }
}

void seed();
