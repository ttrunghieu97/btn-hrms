import { type EmployeeDocumentRepository } from "../../employees/repositories/employee-document.repository";
import { type EmployeesRepository } from "../../employees/repositories/employees.repository";
import { DeleteEmployeeDocumentUseCase } from "./delete-employee-document.usecase";

describe(DeleteEmployeeDocumentUseCase.name, () => {
  it("verifies employee exists before deleting a document", async () => {
    const employeesRepo = {
      findEmployeeById: jest.fn().mockResolvedValue({ id: "e1" }),
    };
    const documentRepo = {
      deleteEmployeeDocumentById: jest.fn().mockResolvedValue({ id: "d1" }),
    };

    const useCase = new DeleteEmployeeDocumentUseCase(
      employeesRepo as unknown as EmployeesRepository,
      documentRepo as unknown as EmployeeDocumentRepository,
    );

    await useCase.execute("e1", "d1");

    expect(employeesRepo.findEmployeeById).toHaveBeenCalledWith("e1");
    expect(documentRepo.deleteEmployeeDocumentById).toHaveBeenCalledWith(
      "e1",
      "d1",
    );
  });
});
