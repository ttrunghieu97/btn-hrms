import type {
  CandidateRow,
  StageEventRow,
  ScorecardRow,
  HydratedApplication,
} from "../repositories/applications.repository";

export class CandidateMapper {
  static toCandidateResponse(row: CandidateRow) {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phone: row.phone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toStageEventResponse(row: StageEventRow) {
    return {
      id: row.id,
      applicationId: row.applicationId,
      fromStage: row.fromStage,
      toStage: row.toStage,
      actorUserId: row.actorUserId,
      note: row.note,
      createdAt: row.createdAt,
    };
  }

  static toScorecardResponse(row: ScorecardRow) {
    return {
      id: row.id,
      applicationId: row.applicationId,
      interviewerUserId: row.interviewerUserId,
      rating: row.rating,
      feedback: row.feedback,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toApplicationResponse(row: HydratedApplication) {
    return {
      id: row.id,
      candidateId: row.candidateId,
      postingId: row.postingId,
      currentStage: row.currentStage,
      cvFileId: row.cvFileId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(row.candidate
        ? { candidate: CandidateMapper.toCandidateResponse(row.candidate) }
        : {}),
      ...(row.stageEvents
        ? {
            stageEvents: row.stageEvents.map((event) =>
              CandidateMapper.toStageEventResponse(event),
            ),
          }
        : {}),
      ...(row.scorecards
        ? {
            scorecards: row.scorecards.map((card) =>
              CandidateMapper.toScorecardResponse(card),
            ),
          }
        : {}),
    };
  }

  static toApplicationResponseList(rows: HydratedApplication[]) {
    return rows.map((row) => CandidateMapper.toApplicationResponse(row));
  }
}
