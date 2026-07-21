import { Body, Controller, Get, Param, Post, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { LearningPolicies } from "../../core/security/policies/learning.policy";
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
import {
  CreateCourseDto, AssignCourseDto, CourseResponseDto, EnrollmentResponseDto,
  CreateSessionDto, SessionResponseDto,
  CreateCertificationDefDto, IssueCertificateDto,
  CreatePathDto, AssignPathDto,
} from "./dto/learning.dto";

@ApiTags("Learning")
@ApiBearerAuth()
@Controller("learning")
@CheckPolicy(LearningPolicies.access)
export class LearningController {
  constructor(
    private readonly createCourse: CreateCourseUseCase,
    private readonly publishCourse: PublishCourseUseCase,
    private readonly listCourses: ListCoursesUseCase,
    private readonly getCourse: GetCourseUseCase,
    private readonly assignCourse: AssignCourseUseCase,
    private readonly enrollCourse: EnrollCourseUseCase,
    private readonly completeCourse: CompleteCourseUseCase,
    private readonly listEnrollments: ListEnrollmentsUseCase,
    // Session
    private readonly createSession: CreateSessionUseCase,
    private readonly listSessions: ListSessionsUseCase,
    private readonly publishSession: PublishSessionUseCase,
    private readonly cancelSession: CancelSessionUseCase,
    private readonly registerSession: RegisterSessionUseCase,
    private readonly withdrawSession: WithdrawSessionUseCase,
    private readonly checkInAttendance: CheckInAttendanceUseCase,
    private readonly markCompleted: MarkCompletedUseCase,
    // Certification
    private readonly createCertDef: CreateCertificationDefUseCase,
    private readonly issueCert: IssueCertificateUseCase,
    private readonly revokeCert: RevokeCertificateUseCase,
    private readonly renewCert: RenewCertificateUseCase,
    private readonly listCerts: ListEmployeeCertificatesUseCase,
    private readonly listDefs: ListCertificationDefsUseCase,
    // Paths
    private readonly createPath: CreatePathUseCase,
    private readonly publishPath: PublishPathUseCase,
    private readonly listPaths: ListPathsUseCase,
    private readonly getPath: GetPathUseCase,
    private readonly assignPath: AssignLearningPathUseCase,
    private readonly completePath: CompleteLearningPathUseCase,
  ) {}

  @Post("courses") create(@Body() d: CreateCourseDto) { return this.createCourse.execute(d); }
  @Get("courses") list() { return this.listCourses.execute(); }
  @Get("courses/:id") get(@Param("id") id: string) { return this.getCourse.execute(id); }
  @Post("courses/:id/publish") publish(@Param("id") id: string) { return this.publishCourse.execute(id); }
  @Post("assignments") assign(@Body() d: AssignCourseDto, @Request() r: any) { return this.assignCourse.execute(d, r.user?.userId); }
  @Post("enrollments") enroll(@Body("courseId") courseId: string, @Request() r: any) { return this.enrollCourse.execute(courseId, r.user?.userId); }
  @Post("enrollments/:id/complete") complete(@Param("id") id: string) { return this.completeCourse.execute(id); }
  @Get("enrollments") listEnrollmentsForUser(@Request() r: any) { return this.listEnrollments.execute(r.user?.userId); }


  // ── Sessions ──
  @Post("sessions") createNewSession(@Body() d: CreateSessionDto) { return this.createSession.execute(d); }
  @Get("courses/:courseId/sessions") listSessionsForCourse(@Param("courseId") courseId: string) { return this.listSessions.execute(courseId); }
  @Post("sessions/:id/publish") publishSessionById(@Param("id") id: string) { return this.publishSession.execute(id); }
  @Post("sessions/:id/cancel") cancelSessionById(@Param("id") id: string) { return this.cancelSession.execute(id); }
  @Post("sessions/:id/register") registerForSession(@Param("id") id: string, @Request() r: any) { return this.registerSession.execute(id, r.user?.userId); }
  @Post("sessions/:id/withdraw") withdrawFromSession(@Param("id") id: string, @Request() r: any) { return this.withdrawSession.execute(id, r.user?.userId); }
  @Post("sessions/:id/checkin") checkInToSession(@Param("id") id: string, @Request() r: any) { return this.checkInAttendance.execute(id, r.user?.userId); }
  @Post("sessions/:id/complete") markSessionCompleted(@Param("id") id: string, @Request() r: any) { return this.markCompleted.execute(id, r.user?.userId); }

  // ── Certification ──
  @Post("certifications/definitions") createCertDefinition(@Body() d: CreateCertificationDefDto) { return this.createCertDef.execute(d); }
  @Get("certifications/definitions") listCertDefs() { return this.listDefs.execute(); }
  @Post("certifications/issue") issueCertificate(@Body() d: IssueCertificateDto, @Request() r: any) { return this.issueCert.execute(d, r.user?.userId); }
  @Post("certifications/:id/revoke") revokeCertificate(@Param("id") id: string, @Request() r: any) { return this.revokeCert.execute(id, r.user?.userId); }
  @Post("certifications/:id/renew") renewCertificate(@Param("id") id: string) { return this.renewCert.execute(id); }
  @Get("certifications/employee/:employeeId") listEmployeeCerts(@Param("employeeId") employeeId: string) { return this.listCerts.execute(employeeId); }

  // ── Learning Paths ──
  @Post("paths") createLearningPath(@Body() d: CreatePathDto) { return this.createPath.execute(d); }
  @Get("paths") listLearningPaths() { return this.listPaths.execute(); }
  @Get("paths/:id") getLearningPath(@Param("id") id: string) { return this.getPath.execute(id); }
  @Post("paths/:id/publish") publishLearningPath(@Param("id") id: string) { return this.publishPath.execute(id); }
  @Post("paths/assign") assignLearningPath(@Body() d: AssignPathDto, @Request() r: any) { return this.assignPath.execute(d, r.user?.userId); }
  @Post("paths/:id/complete") completeLearningPath(@Param("id") id: string, @Request() r: any) { return this.completePath.execute(id, r.user?.userId); }
}
