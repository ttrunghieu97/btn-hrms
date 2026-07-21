import { relations } from "drizzle-orm";
import {
  performanceCycles,
  goals,
  goalKeyResults,
  goalAssignments,
  reviewAssignments,
  reviewRatings,
  performanceResults,
} from "./tables";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

export const performanceCyclesRelations = relations(performanceCycles, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [performanceCycles.createdByUserId],
    references: [users.id],
  }),
  goals: many(goals),
  reviewAssignments: many(reviewAssignments),
  results: many(performanceResults),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  cycle: one(performanceCycles, {
    fields: [goals.cycleId],
    references: [performanceCycles.id],
  }),
  keyResults: many(goalKeyResults),
  assignments: many(goalAssignments),
}));

export const goalKeyResultsRelations = relations(goalKeyResults, ({ one }) => ({
  goal: one(goals, {
    fields: [goalKeyResults.goalId],
    references: [goals.id],
  }),
}));

export const goalAssignmentsRelations = relations(goalAssignments, ({ one }) => ({
  goal: one(goals, {
    fields: [goalAssignments.goalId],
    references: [goals.id],
  }),
  employee: one(employees, {
    fields: [goalAssignments.employeeId],
    references: [employees.id],
  }),
}));

export const reviewAssignmentsRelations = relations(reviewAssignments, ({ one, many }) => ({
  cycle: one(performanceCycles, {
    fields: [reviewAssignments.cycleId],
    references: [performanceCycles.id],
  }),
  employee: one(employees, {
    fields: [reviewAssignments.employeeId],
    references: [employees.id],
    relationName: "reviewSubject",
  }),
  reviewer: one(employees, {
    fields: [reviewAssignments.reviewerId],
    references: [employees.id],
    relationName: "reviewer",
  }),
  ratings: many(reviewRatings),
}));

export const reviewRatingsRelations = relations(reviewRatings, ({ one }) => ({
  reviewAssignment: one(reviewAssignments, {
    fields: [reviewRatings.reviewAssignmentId],
    references: [reviewAssignments.id],
  }),
}));

export const performanceResultsRelations = relations(performanceResults, ({ one }) => ({
  cycle: one(performanceCycles, {
    fields: [performanceResults.cycleId],
    references: [performanceCycles.id],
  }),
  employee: one(employees, {
    fields: [performanceResults.employeeId],
    references: [employees.id],
  }),
  decidedByUser: one(users, {
    fields: [performanceResults.decidedByUserId],
    references: [users.id],
  }),
}));
