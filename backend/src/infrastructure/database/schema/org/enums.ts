import { pgEnum } from "drizzle-orm/pg-core";

export const companyStatusEnum = pgEnum("company_status_enum", [
  "active",
  "inactive",
]);


export const locationTypeEnum = pgEnum("location_type_enum", [
  "region",
  "country",
  "city",
  "district",
  "site",
  "office",
]);
