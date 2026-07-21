import { extractProtectedAssetUrl, toProtectedAssetUrl } from "./asset-url";

describe("asset-url helpers", () => {
  it("maps protected backend paths to the web proxy route", () => {
    expect(toProtectedAssetUrl("/files/employees/e1/avatar.jpg")).toBe(
      "/api/files/employees/e1/avatar.jpg",
    );
  });

  it("keeps absolute external URLs unchanged", () => {
    expect(toProtectedAssetUrl("https://cdn.example.com/avatar.jpg")).toBe(
      "https://cdn.example.com/avatar.jpg",
    );
  });

  it("extracts and normalizes nested asset values", () => {
    expect(
      extractProtectedAssetUrl({
        signedUrl: "",
        url: "/files/temp/file-1.jpg",
      }),
    ).toBe("/api/files/temp/file-1.jpg");
  });

  it("preserves blob preview URLs", () => {
    expect(extractProtectedAssetUrl("blob:http://localhost:8080/123")).toBe(
      "blob:http://localhost:8080/123",
    );
  });
});
