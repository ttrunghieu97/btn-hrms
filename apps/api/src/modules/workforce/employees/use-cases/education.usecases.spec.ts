import { ListEducationsUseCase } from "./list-educations.usecase";
import { AddEducationUseCase } from "./add-education.usecase";
import { UpdateEducationUseCase } from "./update-education.usecase";
import { DeleteEducationUseCase } from "./delete-education.usecase";

describe("Employee Education UseCases", () => {
  const educationRepo = {
    findByEmployeeId: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const aggregation = {
    recomputeHighestEducation: jest.fn(),
  };

  const listUseCase = new ListEducationsUseCase(educationRepo as never);
  const addUseCase = new AddEducationUseCase(
    educationRepo as never,
    aggregation as never,
  );
  const updateUseCase = new UpdateEducationUseCase(
    educationRepo as never,
    aggregation as never,
  );
  const deleteUseCase = new DeleteEducationUseCase(
    educationRepo as never,
    aggregation as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists education records and rejects empty employeeId", async () => {
    await expect(listUseCase.execute("")).rejects.toThrow(/employeeId is required/i);

    educationRepo.findByEmployeeId.mockResolvedValue([
      { id: "edu-1", employeeId: "emp-1", educationLevel: "bachelor" },
    ]);
    const list = await listUseCase.execute("emp-1");
    expect(list).toHaveLength(1);
  });

  it("adds an education record and recomputes highest education level", async () => {
    educationRepo.create.mockResolvedValue({
      id: "edu-new",
      employeeId: "emp-1",
      educationLevel: "master",
      gpa: "3.8",
    });

    const created = await addUseCase.execute("emp-1", {
      educationLevel: "master" as never,
      educationName: "MSc Computer Science",
      institution: "HCMUT",
      graduationYear: 2024,
      gpa: 3.8,
    });

    expect(educationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        educationLevel: "master",
        gpa: "3.8",
        verified: false,
      }),
    );
    expect(aggregation.recomputeHighestEducation).toHaveBeenCalledWith("emp-1");
    expect(created.id).toBe("edu-new");
  });

  it("enforces employee ownership when updating or deleting education records", async () => {
    educationRepo.findById.mockResolvedValue({
      id: "edu-other",
      employeeId: "emp-other",
    });

    await expect(
      updateUseCase.execute("emp-1", "edu-other", { major: "AI" }),
    ).rejects.toThrow(/Education record not found/i);

    await expect(
      deleteUseCase.execute("emp-1", "edu-other"),
    ).rejects.toThrow(/Education record not found/i);

    educationRepo.findById.mockResolvedValue({
      id: "edu-1",
      employeeId: "emp-1",
    });
    educationRepo.update.mockResolvedValue({
      id: "edu-1",
      employeeId: "emp-1",
      educationLevel: "phd",
    });

    await updateUseCase.execute("emp-1", "edu-1", {
      educationLevel: "phd" as never,
    });
    expect(aggregation.recomputeHighestEducation).toHaveBeenCalledWith("emp-1");

    await deleteUseCase.execute("emp-1", "edu-1");
    expect(educationRepo.softDelete).toHaveBeenCalledWith("edu-1");
    expect(aggregation.recomputeHighestEducation).toHaveBeenCalledTimes(2);
  });
});
