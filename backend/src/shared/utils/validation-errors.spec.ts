import { normalizeValidationErrors } from "./validation-errors";

describe("normalizeValidationErrors", () => {
  it("normalizes nested array paths to dotted notation", () => {
    const result = normalizeValidationErrors([
      {
        property: "certification_list",
        children: [
          {
            property: "[0]",
            children: [
              {
                property: "issued_date",
                constraints: {
                  isDateString: "issuedDate must be a valid ISO 8601 date string",
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(result).toEqual({
      "certificationList.0.issuedDate": [
        "issuedDate must be a valid ISO 8601 date string",
      ],
    });
  });
});

