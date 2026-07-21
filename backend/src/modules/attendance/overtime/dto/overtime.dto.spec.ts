import { validate } from "class-validator";
import { OvertimeQueryDto } from "./overtime.dto";

describe(OvertimeQueryDto.name, () => {
  it("rejects unsupported overtime statuses", async () => {
    const dto = new OvertimeQueryDto();
    dto.status = "invalid" as OvertimeQueryDto["status"];

    const errors = await validate(dto);

    expect(errors).toEqual([
      expect.objectContaining({
        property: "status",
        constraints: expect.objectContaining({ isIn: expect.any(String) }),
      }),
    ]);
  });
});
