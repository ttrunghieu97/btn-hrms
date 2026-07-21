import { Injectable } from "@nestjs/common";
import {
  AttachmentIntentDto,
  EmployeeCertificationIntentDto,
  EmployeeDocumentIntentDto,
} from "../dto/create-employee.dto";

export interface EmployeeAvatarAttachmentPlan {
  action: "keep" | "remove" | "replace";
  currentAttachmentId?: string;
  tempFileToken?: string;
}

export interface EmployeeDocumentAttachmentPlan {
  documentType: string;
  action: "keep" | "remove" | "replace";
  currentAttachmentId?: string;
  tempFileToken?: string;
}

export interface EmployeeCertificationAttachmentPlan {
  certificationId?: string;
  action: "create" | "update";
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiredDate?: string;
  evidenceAction?: "keep" | "remove" | "replace";
  currentAttachmentId?: string;
  tempFileToken?: string;
}

export interface EmployeeAttachmentPlan {
  avatar?: EmployeeAvatarAttachmentPlan;
  documents?: EmployeeDocumentAttachmentPlan[];
  certifications?: EmployeeCertificationAttachmentPlan[];
}

@Injectable()
export class ResolveEmployeeAttachmentPlanService {
  execute(input: {
    avatar?: AttachmentIntentDto;
    documents?: EmployeeDocumentIntentDto[];
    certifications?: EmployeeCertificationIntentDto[];
  }): EmployeeAttachmentPlan {
    return {
      avatar: input.avatar
        ? {
            action: input.avatar.mode,
            currentAttachmentId: input.avatar.attachmentId,
            tempFileToken: input.avatar.tempFileToken,
          }
        : undefined,
      documents: input.documents?.map((document) => ({
        documentType: document.documentType,
        action: document.mode,
        currentAttachmentId: document.attachmentId,
        tempFileToken: document.tempFileToken,
      })),
      certifications: input.certifications?.map((certification) => ({
        certificationId: certification.id,
        action: certification.id ? "update" : "create",
        name: certification.name,
        issuedBy: certification.issuedBy,
        issuedDate: certification.issuedDate,
        expiredDate: certification.expiredDate,
        evidenceAction: certification.evidence?.mode,
        currentAttachmentId: certification.evidence?.attachmentId,
        tempFileToken: certification.evidence?.tempFileToken,
      })),
    };
  }
}

