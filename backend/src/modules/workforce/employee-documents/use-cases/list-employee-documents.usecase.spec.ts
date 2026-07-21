import { type EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { type EmployeesRepository } from "../../employees/repositories/employees.repository";
import { ListEmployeeDocumentsUseCase } from "./list-employee-documents.usecase";

describe(ListEmployeeDocumentsUseCase.name, () => {
  it("verifies employee exists before listing documents", async () => {
    const employeesRepo = {
      findEmployeeById: jest.fn().mockResolvedValue({ id: "e1" }),
    };
    const documentRepo = {
      findDocumentsByEmployeeId: jest.fn().mockResolvedValue([]),
    };

    const useCase = new ListEmployeeDocumentsUseCase(
      employeesRepo as unknown as EmployeesRepository,
      documentRepo as unknown as EmployeeDocumentRepository,
    );

    await useCase.execute("e1");

    expect(employeesRepo.findEmployeeById).toHaveBeenCalledWith("e1");
    expect(documentRepo.findDocumentsByEmployeeId).toHaveBeenCalledWith("e1");
  });
});
