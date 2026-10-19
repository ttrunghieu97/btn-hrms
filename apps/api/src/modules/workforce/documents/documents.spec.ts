import { plainToInstance } from "class-transformer";
import { ListDocumentsQueryDto } from "./dto/documents.dto";
import { CreateDocumentUseCase } from "./use-cases/create-document.usecase";
import { UpdateDocumentUseCase } from "./use-cases/update-document.usecase";
import { DeleteDocumentUseCase } from "./use-cases/delete-document.usecase";

describe("Documents DTO & UseCases", () => {
  describe("ListDocumentsQueryDto", () => {
    it("transforms isActive='false' to boolean false and isActive='true' to boolean true", () => {
      const falseDto = plainToInstance(ListDocumentsQueryDto, { isActive: "false" });
      const trueDto = plainToInstance(ListDocumentsQueryDto, { isActive: "true" });
      const emptyDto = plainToInstance(ListDocumentsQueryDto, { isActive: "" });

      expect(falseDto.isActive).toBe(false);
      expect(trueDto.isActive).toBe(true);
      expect(emptyDto.isActive).toBeUndefined();
    });
  });

  describe("CreateDocumentUseCase, UpdateDocumentUseCase & DeleteDocumentUseCase", () => {
    const sampleDoc = {
      id: "doc-1",
      employeeId: "emp-1",
      employeeName: "Nguyen Van A",
      employeeCode: "EMP001",
      departmentId: "dept-1",
      departmentName: "Engineering",
      documentType: "id_card",
      fileId: "file-1",
      fileUrl: "https://example.com/file-1.pdf",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("enforces department and self scope in CreateDocumentUseCase", async () => {
      const repo = {
        insertEmployeeDocument: jest.fn().mockResolvedValue({ id: "doc-1" }),
      };
      const queryRepo = {
        findEmployeeDepartmentId: jest.fn().mockResolvedValue("dept-2"),
        findById: jest.fn().mockResolvedValue({ ...sampleDoc, departmentId: "dept-2" }),
      };
      const useCase = new CreateDocumentUseCase(repo as any, queryRepo as any);

      await expect(
        useCase.execute(
          { employeeId: "emp-1", documentType: "id_card", fileId: "file-1" },
          { tier: "self", employeeId: "emp-other" },
        ),
      ).rejects.toThrow("Access denied to out-of-scope employee document");

      await expect(
        useCase.execute(
          { employeeId: "emp-1", documentType: "id_card", fileId: "file-1" },
          { tier: "department", departmentId: "dept-1" },
        ),
      ).rejects.toThrow("Access denied to out-of-scope department document");
      expect(repo.insertEmployeeDocument).not.toHaveBeenCalled();
    });

    it("persists document updates via repo.updateDocumentById and enforces DataScope", async () => {
      const repo = {
        updateDocumentById: jest.fn().mockResolvedValue({ id: "doc-1" }),
      };
      const queryRepo = {
        findById: jest
          .fn()
          .mockResolvedValueOnce(sampleDoc)
          .mockResolvedValueOnce({ ...sampleDoc, documentType: "degree", fileId: "file-2" }),
      };
      const useCase = new UpdateDocumentUseCase(repo as any, queryRepo as any);

      const updated = await useCase.execute(
        "doc-1",
        { documentType: "degree", fileId: "file-2" },
        { tier: "department", departmentId: "dept-1" },
      );

      expect(repo.updateDocumentById).toHaveBeenCalledWith("doc-1", {
        documentType: "degree",
        fileId: "file-2",
      });
      expect(updated.documentType).toBe("degree");

      queryRepo.findById.mockResolvedValueOnce(sampleDoc);
      await expect(
        useCase.execute(
          "doc-1",
          { documentType: "degree" },
          { tier: "department", departmentId: "dept-other" },
        ),
      ).rejects.toThrow("Access denied to out-of-scope department document");
    });

    it("enforces DataScope in DeleteDocumentUseCase", async () => {
      const repo = {
        deleteEmployeeDocumentById: jest.fn().mockResolvedValue({ id: "doc-1" }),
      };
      const queryRepo = {
        findById: jest.fn().mockResolvedValue(sampleDoc),
      };
      const useCase = new DeleteDocumentUseCase(repo as any, queryRepo as any);

      await expect(
        useCase.execute("doc-1", { tier: "self", employeeId: "emp-other" }),
      ).rejects.toThrow("Access denied to out-of-scope employee document");
      expect(repo.deleteEmployeeDocumentById).not.toHaveBeenCalled();

      await useCase.execute("doc-1", { tier: "self", employeeId: "emp-1" });
      expect(repo.deleteEmployeeDocumentById).toHaveBeenCalledWith("emp-1", "doc-1");
    });
  });
});
