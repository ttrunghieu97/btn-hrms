import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  BaseQueryDto,
} from "./base-query.dto";
import {
  PagedQueryDto,
  PaginationLimitField,
  PaginationPageField,
  SearchableQueryDto,
} from "./pagination.dto";

class DefaultPaginationDto extends PagedQueryDto {}

class CustomPaginationDto {
  @PaginationPageField()
  page = 1;

  @PaginationLimitField(50, 30)
  limit = 30;
}

class SearchDto extends SearchableQueryDto {}

describe("pagination decorators", () => {
  it("clamps shared limit values above 100", async () => {
    const dto = plainToInstance(DefaultPaginationDto, { limit: "999", page: "2" });

    expect(dto.limit).toBe(100);
    expect(dto.page).toBe(2);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("clamps custom limit values above endpoint max", async () => {
    const dto = plainToInstance(CustomPaginationDto, { limit: "500", page: "3" });

    expect(dto.limit).toBe(50);
    expect(dto.page).toBe(3);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("keeps invalid non-numeric input failing validation", async () => {
    const dto = plainToInstance(DefaultPaginationDto, { limit: "abc", page: "xyz" });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["limit", "page"]),
    );
  });

  it("clamps values below minimum to 1", async () => {
    const dto = plainToInstance(DefaultPaginationDto, { limit: "0", page: "0" });

    expect(dto.limit).toBe(1);
    expect(dto.page).toBe(0);

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe("page");
  });

  it("keeps search available on searchable query DTOs", async () => {
    const dto = plainToInstance(SearchDto, { search: "john", limit: "250" });

    expect(dto.search).toBe("john");
    expect(dto.limit).toBe(100);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("keeps full query surface on base query DTOs", async () => {
    const dto = plainToInstance(BaseQueryDto, {
      fields: "id,name",
      include: "department",
      sort: "createdAt:desc",
      search: "john",
    });

    expect(dto.fields).toBe("id,name");
    expect(dto.include).toBe("department");
    expect(dto.sort).toBe("createdAt:desc");
    expect(dto.search).toBe("john");

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
