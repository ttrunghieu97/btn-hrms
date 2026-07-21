import { Injectable } from "@nestjs/common";
import { FileAuditLogService } from "../../../../infrastructure/storage/file-audit-log.service";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { FinalizeAttachmentBindingUseCase } from "../../../storage/use-cases/finalize-attachment-binding.usecase";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EmployeeCertificationRepository } from "../repositories/employee-certification.repository";
import { EmployeeDocumentRepository } from "../repositories/employee-document.repository";
import {
  EmployeesRepository,
  type Tx,
} from "../repositories/employees.repository";
import type {
  EmployeeAttachmentPlan,
  EmployeeCertificationAttachmentPlan,
  EmployeeDocumentAttachmentPlan,
} from "./resolve-employee-attachment-plan.service";

@Injectable()
export class ApplyEmployeeAttachmentPlanService {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly documentRepo: EmployeeDocumentRepository,
    private readonly certRepo: EmployeeCertificationRepository,
    private readonly finalizeAttachmentBinding: FinalizeAttachmentBindingUseCase,
    private readonly storage: StorageService,
    private readonly fileAuditLog?: FileAuditLogService,
  ) {}

  private async resolveDocumentAttachment(
    employeeId: string,
    document: EmployeeDocumentAttachmentPlan,
    finalizedAttachmentIds: string[],
  ) {
    if (document.action === "replace" && document.tempFileToken) {
      const finalized = await this.finalizeAttachmentBinding.execute({
        fileToken: document.tempFileToken,
        ownerType: "employee",
        ownerId: employeeId,
        purpose: "document",
      });
      finalizedAttachmentIds.push(finalized.attachmentId);
      return {
        documentType: document.documentType,
        fileId: finalized.attachmentId,
      };
    }
    if (document.action === "keep" && document.currentAttachmentId) {
      await this.assertOwnedAttachment(employeeId, document.currentAttachmentId, "document");
      return {
        documentType: document.documentType,
        fileId: document.currentAttachmentId,
      };
    }
    return null;
  }

  private async resolveCertificationAttachment(
    employeeId: string,
    certification: EmployeeCertificationAttachmentPlan,
    finalizedAttachmentIds: string[],
  ) {
    let fileId: string | undefined;

    if (certification.evidenceAction === "replace" && certification.tempFileToken) {
      const finalized = await this.finalizeAttachmentBinding.execute({
        fileToken: certification.tempFileToken,
        ownerType: "employee",
        ownerId: employeeId,
        purpose: "certification",
      });
      fileId = finalized.attachmentId;
      finalizedAttachmentIds.push(finalized.attachmentId);
    }

    if (certification.evidenceAction === "keep") {
      if (certification.currentAttachmentId) {
        await this.assertOwnedAttachment(
          employeeId,
          certification.currentAttachmentId,
          "certification",
        );
      }
      fileId = certification.currentAttachmentId;
    }

    return {
      id: certification.certificationId,
      name: certification.name,
      issuedBy: certification.issuedBy,
      issuedDate: certification.issuedDate,
      expiredDate: certification.expiredDate,
      fileId,
    };
  }

  private async assertOwnedAttachment(
    employeeId: string,
    attachmentId: string,
    purpose: "avatar" | "document" | "certification",
  ) {
    const file = await this.storage.getFileById(attachmentId);
    if (
      file?.status !== "active" ||
      file?.ownerType !== "employee" ||
      file?.ownerId !== employeeId ||
      file?.purpose !== purpose
    ) {
      throwBadRequest("Attachment does not belong to employee", ERROR_CODES.INVALID_REQUEST, {
        employeeId,
        attachmentId,
        purpose,
      });
    }
  }

  async execute(input: {
    employeeId: string;
    plan: EmployeeAttachmentPlan;
    mutateInTransaction?: (tx: Tx) => Promise<void>;
  }) {
    const { employeeId, plan, mutateInTransaction } = input;
    let avatarAttachmentId: string | undefined;
    const finalizedAttachmentIds: string[] = [];

    try {
      if (plan.avatar?.action === "replace" && plan.avatar.tempFileToken) {
        const finalized = await this.finalizeAttachmentBinding.execute({
          fileToken: plan.avatar.tempFileToken,
          ownerType: "employee",
          ownerId: employeeId,
          purpose: "avatar",
        });
        avatarAttachmentId = finalized.attachmentId;
        finalizedAttachmentIds.push(finalized.attachmentId);
      } else if (plan.avatar?.action === "keep" && plan.avatar.currentAttachmentId) {
        await this.assertOwnedAttachment(employeeId, plan.avatar.currentAttachmentId, "avatar");
      }

      const documents = plan.documents
        ? (
            await Promise.all(
              plan.documents.map((document) =>
                this.resolveDocumentAttachment(employeeId, document, finalizedAttachmentIds),
              ),
            )
          ).filter((document): document is NonNullable<typeof document> => document !== null)
        : undefined;

      const certifications = plan.certifications
        ? await Promise.all(
            plan.certifications.map((certification) =>
              this.resolveCertificationAttachment(
                employeeId,
                certification,
                finalizedAttachmentIds,
              ),
            ),
          )
        : undefined;

      await this.employeesRepo.transaction(async (tx) => {
        await mutateInTransaction?.(tx);

        if (plan.avatar?.action === "remove" || avatarAttachmentId) {
          await this.employeesRepo.replaceEmployeeAvatar(
            employeeId,
            avatarAttachmentId ?? null,
            tx,
          );
          if (plan.avatar?.currentAttachmentId) {
            await this.fileAuditLog?.unbind(plan.avatar.currentAttachmentId, undefined, {
              ownerType: "employee",
              ownerId: employeeId,
              purpose: "avatar",
            });
          }
        }

        if (documents) {
          await this.documentRepo.replaceEmployeeDocuments(employeeId, documents, tx);
        }

        if (certifications) {
          await this.certRepo.replaceEmployeeCertifications(employeeId, certifications, tx);
        }
      });

      const supersededAttachmentIds = [
        ...(plan.avatar?.action !== "keep" && plan.avatar?.currentAttachmentId
          ? [plan.avatar.currentAttachmentId]
          : []),
        ...(plan.documents ?? [])
          .filter((document) => document.action !== "keep")
          .flatMap((document) =>
            document.currentAttachmentId ? [document.currentAttachmentId] : [],
          ),
        ...(plan.certifications ?? [])
          .filter((certification) => certification.evidenceAction !== "keep")
          .flatMap((certification) =>
            certification.currentAttachmentId ? [certification.currentAttachmentId] : [],
          ),
      ].filter((attachmentId) => !finalizedAttachmentIds.includes(attachmentId));

      await this.storage.deleteFiles([...new Set(supersededAttachmentIds)]);
    } catch (error) {
      await this.storage.deleteFiles(finalizedAttachmentIds).catch(() => undefined);
      throw error;
    }
  }
}

