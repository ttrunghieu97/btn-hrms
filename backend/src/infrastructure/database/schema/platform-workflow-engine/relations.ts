import { relations } from "drizzle-orm";
import {
  workflowDefinitions,
  workflowInstances,
  workflowInstanceTransitions,
} from "./tables";
import { users } from "../identity/tables";

export const workflowDefinitionsRelations = relations(
  workflowDefinitions,
  ({ many }) => ({
    instances: many(workflowInstances),
  }),
);

export const workflowInstancesRelations = relations(
  workflowInstances,
  ({ one, many }) => ({
    definition: one(workflowDefinitions, {
      fields: [workflowInstances.definitionId],
      references: [workflowDefinitions.id],
    }),
    transitions: many(workflowInstanceTransitions),
  }),
);

export const workflowInstanceTransitionsRelations = relations(
  workflowInstanceTransitions,
  ({ one }) => ({
    instance: one(workflowInstances, {
      fields: [workflowInstanceTransitions.instanceId],
      references: [workflowInstances.id],
    }),
    actorUser: one(users, {
      fields: [workflowInstanceTransitions.actorUserId],
      references: [users.id],
    }),
  }),
);
