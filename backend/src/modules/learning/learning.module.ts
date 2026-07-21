import { Module } from "@nestjs/common";
import { LearningController } from "./learning.controller";
import { CourseRepository } from "./course/repositories/course.repository";
import { SessionRepository } from "./session/repositories/session.repository";
import { CertificationRepository } from "./certification/repositories/certification.repository";
import { LearningPathRepository } from "./path/repositories/learning-path.repository";
import { LearningSessionNotificationSubscriber } from "./subscribers/session-notification.subscriber";
import {
  CreateCourseUseCase, PublishCourseUseCase, ListCoursesUseCase, GetCourseUseCase,
  AssignCourseUseCase, EnrollCourseUseCase, CompleteCourseUseCase, ListEnrollmentsUseCase,
} from "./course/use-cases";
import {
  CreateSessionUseCase, ListSessionsUseCase, PublishSessionUseCase, CancelSessionUseCase,
  RegisterSessionUseCase, WithdrawSessionUseCase, CheckInAttendanceUseCase, MarkCompletedUseCase,
} from "./session/use-cases";
import {
  CreateCertificationDefUseCase, IssueCertificateUseCase, RevokeCertificateUseCase,
  RenewCertificateUseCase, ListEmployeeCertificatesUseCase, ListCertificationDefsUseCase,
} from "./certification/use-cases";
import {
  CreatePathUseCase, PublishPathUseCase, ListPathsUseCase, GetPathUseCase,
  AssignLearningPathUseCase, CompleteLearningPathUseCase,
} from "./path/use-cases";
import { PlatformNotificationsDomainModule } from "../platform-notifications/platform-notifications.module";

@Module({
  imports: [PlatformNotificationsDomainModule],
  controllers: [LearningController],
  providers: [
    CourseRepository,
    SessionRepository,
    CertificationRepository,
    LearningPathRepository,
    LearningSessionNotificationSubscriber,
    CreateCourseUseCase, PublishCourseUseCase, ListCoursesUseCase, GetCourseUseCase,
    AssignCourseUseCase, EnrollCourseUseCase, CompleteCourseUseCase, ListEnrollmentsUseCase,
    CreateSessionUseCase, ListSessionsUseCase, PublishSessionUseCase, CancelSessionUseCase,
    RegisterSessionUseCase, WithdrawSessionUseCase, CheckInAttendanceUseCase, MarkCompletedUseCase,
    CreateCertificationDefUseCase, IssueCertificateUseCase, RevokeCertificateUseCase,
    RenewCertificateUseCase, ListEmployeeCertificatesUseCase, ListCertificationDefsUseCase,
    CreatePathUseCase, PublishPathUseCase, ListPathsUseCase, GetPathUseCase,
    AssignLearningPathUseCase, CompleteLearningPathUseCase,
  ],
})
export class LearningDomainModule {}
