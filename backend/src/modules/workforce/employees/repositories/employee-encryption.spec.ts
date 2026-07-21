import { EmployeeEncryption } from "./employee-encryption";

describe("EmployeeEncryption", () => {
  let enc: EmployeeEncryption;

  beforeAll(() => {
    enc = new EmployeeEncryption();
  });

  it("encrypts and decrypts a string", () => {
    const plain = "my-secret-data";
    const encrypted = enc.encrypt(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted).toContain("v1:");
    const decrypted = enc.decrypt(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("isEncrypted recognizes encrypted values", () => {
    expect(enc.isEncrypted(enc.encrypt("test"))).toBe(true);
    expect(enc.isEncrypted("plaintext")).toBe(false);
    expect(enc.isEncrypted(null)).toBe(false);
    expect(enc.isEncrypted(undefined)).toBe(false);
    expect(enc.isEncrypted(123)).toBe(false);
  });

  it("encryptPiiFields encrypts PII fields leaving others untouched", () => {
    const row = {
      id: "e1",
      firstName: "John",
      identityNumber: "123456789",
      bankAccountNumber: "ACC-001",
      taxCode: "TAX-99",
      emergencyContactName: "Jane",
      emergencyContactPhone: "+84123456789",
      status: "working",
    };
    const result = enc.encryptPiiFields(row);
    expect(result.firstName).toBe("John"); // non-PII untouched
    expect(result.status).toBe("working");
    expect(enc.isEncrypted(result.identityNumber)).toBe(true);
    expect(enc.isEncrypted(result.bankAccountNumber)).toBe(true);
    expect(enc.isEncrypted(result.taxCode)).toBe(true);
    expect(enc.isEncrypted(result.emergencyContactName)).toBe(true);
    expect(enc.isEncrypted(result.emergencyContactPhone)).toBe(true);
  });

  it("decryptPiiFields decrypts all PII fields", () => {
    const row = {
      id: "e1",
      identityNumber: enc.encrypt("ID-001"),
      bankAccountNumber: enc.encrypt("BANK-001"),
    };
    const result = enc.decryptPiiFields(row);
    expect(result.identityNumber).toBe("ID-001");
    expect(result.bankAccountNumber).toBe("BANK-001");
  });

  it("decryptPiiFields leaves plaintext values unchanged (legacy compat)", () => {
    const row = { id: "e1", identityNumber: "PLAIN-ID", bankAccountNumber: "PLAIN-BANK" };
    const result = enc.decryptPiiFields(row);
    expect(result.identityNumber).toBe("PLAIN-ID");
    expect(result.bankAccountNumber).toBe("PLAIN-BANK");
  });

  it("decryptPiiFields handles null and missing fields gracefully", () => {
    const row = { id: "e1", identityNumber: null, bankAccountNumber: undefined };
    const result = enc.decryptPiiFields(row);
    expect(result.identityNumber).toBeNull();
    expect(result.bankAccountNumber).toBeUndefined();
  });

  it("encryptPiiFields does not double-encrypt", () => {
    const row = { identityNumber: enc.encrypt("ID-001") };
    const once = enc.encryptPiiFields(row);
    const twice = enc.encryptPiiFields(once);
    expect(twice.identityNumber).toBe(once.identityNumber);
  });

  it("redactPiiFieldsForResponse nulls PII when not allowed", () => {
    const row = { id: "e1", identityNumber: enc.encrypt("ID-001") };
    const redacted = enc.redactPiiFieldsForResponse(row, false);
    expect(redacted.identityNumber).toBeNull();
  });

  it("redactPiiFieldsForResponse decrypts when allowed", () => {
    const row = { id: "e1", identityNumber: enc.encrypt("ID-001") };
    const allowed = enc.redactPiiFieldsForResponse(row, true);
    expect(allowed.identityNumber).toBe("ID-001");
  });
});
