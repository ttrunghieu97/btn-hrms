import { type EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { type EmployeesRepository } from "../../employees/repositories/employees.repository";
import { CreateEmployeeDocumentUseCase } from "./create-employee-document.usecase";

describe(CreateEmployeeDocumentUseCase.name, () => {
  it("verifies employee exists before creating a document", async () => {
    const employeesRepo = {
      findEmployeeById: jest.fn().mockResolvedValue({ id: "e1" }),
    };
    const documentRepo = {
      insertEmployeeDocument: jest.fn().mockResolvedValue({
        id: "d1",
        employeeId: "e1",
        documentType: "resume",
        attachmentId: "att-1",
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    };

    const useCase = new CreateEmployeeDocumentUseCase(
      employeesRepo as unknown as EmployeesRepository,
      documentRepo as unknown as EmployeeDocumentRepository,
    );

    await useCase.execute("e1", {
      documentType: "resume",
      fileId: "att-1",
    });

    expect(employeesRepo.findEmployeeById).toHaveBeenCalledWith("e1");
    expect(documentRepo.insertEmployeeDocument).toHaveBeenCalledWith("e1", {
      documentType: "resume",
      fileId: "att-1",
    });
  });
});
