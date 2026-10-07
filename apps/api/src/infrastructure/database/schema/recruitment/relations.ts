import { relations } from "drizzle-orm";
import {
  jobRequisitions,
  jobPostings,
  candidates,
  applications,
  applicationStageEvents,
  interviewScorecards,
  interviews,
  interviewRubricScores,
  offers,
} from "./tables";
import { departments } from "../org/tables";
import { positions } from "../workforce/tables";
import { files } from "../_shared/files";
import { users } from "../identity/tables";

export const jobRequisitionsRelations = relations(
  jobRequisitions,
  ({ one, many }) => ({
    department: one(departments, {
      fields: [jobRequisitions.departmentId],
      references: [departments.id],
    }),
    position: one(positions, {
      fields: [jobRequisitions.positionId],
      references: [positions.id],
    }),
    postings: many(jobPostings),
  }),
);

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  requisition: one(jobRequisitions, {
    fields: [jobPostings.requisitionId],
    references: [jobRequisitions.id],
  }),
  applications: many(applications),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  applications: many(applications),
}));

export const applicationsRelations = relations(
  applications,
  ({ one, many }) => ({
    candidate: one(candidates, {
      fields: [applications.candidateId],
      references: [candidates.id],
    }),
    posting: one(jobPostings, {
      fields: [applications.postingId],
      references: [jobPostings.id],
    }),
    cvFile: one(files, {
      fields: [applications.cvFileId],
      references: [files.id],
    }),
    stageEvents: many(applicationStageEvents),
    scorecards: many(interviewScorecards),
    offers: many(offers),
  }),
);

export const applicationStageEventsRelations = relations(
  applicationStageEvents,
  ({ one }) => ({
    application: one(applications, {
      fields: [applicationStageEvents.applicationId],
      references: [applications.id],
    }),
    actor: one(users, {
      fields: [applicationStageEvents.actorUserId],
      references: [users.id],
    }),
  }),
);

export const interviewsRelations = relations(interviews, ({ one }) => ({
  application: one(applications, {
    fields: [interviews.applicationId],
    references: [applications.id],
  }),
}));

export const interviewRubricScoresRelations = relations(interviewRubricScores, ({ one }) => ({
  scorecard: one(interviewScorecards, {
    fields: [interviewRubricScores.scorecardId],
    references: [interviewScorecards.id],
  }),
}));

export const interviewScorecardsRelations = relations(
  interviewScorecards,
  ({ one }) => ({
    application: one(applications, {
      fields: [interviewScorecards.applicationId],
      references: [applications.id],
    }),
    interviewer: one(users, {
      fields: [interviewScorecards.interviewerUserId],
      references: [users.id],
    }),
  }),
);

export const offersRelations = relations(offers, ({ one }) => ({
  application: one(applications, {
    fields: [offers.applicationId],
    references: [applications.id],
  }),
}));
