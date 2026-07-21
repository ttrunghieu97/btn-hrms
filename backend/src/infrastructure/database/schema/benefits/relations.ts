import { relations } from "drizzle-orm";
import {
  benefitProviders, benefitPlans, benefitEligibilityRules,
  benefitEnrollments, benefitDependents,
} from "./tables";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

export const benefitProvidersRelations = relations(benefitProviders, ({ many }) => ({
  plans: many(benefitPlans),
}));

export const benefitPlansRelations = relations(benefitPlans, ({ one, many }) => ({
  provider: one(benefitProviders, {
    fields: [benefitPlans.providerId], references: [benefitProviders.id],
  }),
  eligibilityRule: one(benefitEligibilityRules),
  enrollments: many(benefitEnrollments),
  createdByUser: one(users, {
    fields: [benefitPlans.createdByUserId], references: [users.id],
  }),
}));

export const benefitEligibilityRulesRelations = relations(benefitEligibilityRules, ({ one }) => ({
  plan: one(benefitPlans, {
    fields: [benefitEligibilityRules.planId], references: [benefitPlans.id],
  }),
}));

export const benefitEnrollmentsRelations = relations(benefitEnrollments, ({ one, many }) => ({
  plan: one(benefitPlans, {
    fields: [benefitEnrollments.planId], references: [benefitPlans.id],
  }),
  employee: one(employees, {
    fields: [benefitEnrollments.employeeId], references: [employees.id],
  }),
  approvedByUser: one(users, {
    fields: [benefitEnrollments.approvedByUserId], references: [users.id],
  }),
  dependents: many(benefitDependents),
}));

export const benefitDependentsRelations = relations(benefitDependents, ({ one }) => ({
  enrollment: one(benefitEnrollments, {
    fields: [benefitDependents.enrollmentId], references: [benefitEnrollments.id],
  }),
}));
