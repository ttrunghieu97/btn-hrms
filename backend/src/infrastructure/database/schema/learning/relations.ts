import { relations } from "drizzle-orm";
import { courses, courseSessions, sessionInstructors, sessionAttendees, courseEnrollments, learningAssignments, certificationDefinitions, employeeCertifications, learningPaths, learningPathCourses, learningPathAssignments, learningPathProgress } from "./tables";
import { employees } from "../workforce/tables";
import { users } from "../identity/tables";

export const coursesRelations = relations(courses, ({ one, many }) => ({
  createdByUser: one(users, { fields: [courses.createdByUserId], references: [users.id] }),
  enrollments: many(courseEnrollments),
  assignments: many(learningAssignments),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  employee: one(employees, { fields: [courseEnrollments.employeeId], references: [employees.id] }),
}));

export const learningAssignmentsRelations = relations(learningAssignments, ({ one }) => ({
  course: one(courses, { fields: [learningAssignments.courseId], references: [courses.id] }),
  employee: one(employees, { fields: [learningAssignments.employeeId], references: [employees.id] }),
}));

export const courseSessionsRelations = relations(courseSessions, ({ one, many }) => ({
  course: one(courses, { fields: [courseSessions.courseId], references: [courses.id] }),
  instructors: many(sessionInstructors),
  attendees: many(sessionAttendees),
}));

export const sessionInstructorsRelations = relations(sessionInstructors, ({ one }) => ({
  session: one(courseSessions, { fields: [sessionInstructors.sessionId], references: [courseSessions.id] }),
  employee: one(employees, { fields: [sessionInstructors.employeeId], references: [employees.id] }),
}));

export const sessionAttendeesRelations = relations(sessionAttendees, ({ one }) => ({
  session: one(courseSessions, { fields: [sessionAttendees.sessionId], references: [courseSessions.id] }),
  employee: one(employees, { fields: [sessionAttendees.employeeId], references: [employees.id] }),
}));

export const certificationDefinitionsRelations = relations(certificationDefinitions, ({ many }) => ({
  certifications: many(employeeCertifications),
}));

export const employeeCertificationsRelations = relations(employeeCertifications, ({ one }) => ({
  definition: one(certificationDefinitions, { fields: [employeeCertifications.definitionId], references: [certificationDefinitions.id] }),
  employee: one(employees, { fields: [employeeCertifications.employeeId], references: [employees.id] }),
  course: one(courses, { fields: [employeeCertifications.courseId], references: [courses.id] }),
  issuedByUser: one(users, { fields: [employeeCertifications.issuedByUserId], references: [users.id] }),
}));

export const learningPathsRelations = relations(learningPaths, ({ many }) => ({
  courses: many(learningPathCourses),
  assignments: many(learningPathAssignments),
  progress: many(learningPathProgress),
}));

export const learningPathCoursesRelations = relations(learningPathCourses, ({ one }) => ({
  path: one(learningPaths, { fields: [learningPathCourses.pathId], references: [learningPaths.id] }),
  course: one(courses, { fields: [learningPathCourses.courseId], references: [courses.id] }),
}));

export const learningPathAssignmentsRelations = relations(learningPathAssignments, ({ one }) => ({
  path: one(learningPaths, { fields: [learningPathAssignments.pathId], references: [learningPaths.id] }),
  employee: one(employees, { fields: [learningPathAssignments.employeeId], references: [employees.id] }),
}));

export const learningPathProgressRelations = relations(learningPathProgress, ({ one }) => ({
  path: one(learningPaths, { fields: [learningPathProgress.pathId], references: [learningPaths.id] }),
  employee: one(employees, { fields: [learningPathProgress.employeeId], references: [employees.id] }),
  course: one(courses, { fields: [learningPathProgress.courseId], references: [courses.id] }),
}));
