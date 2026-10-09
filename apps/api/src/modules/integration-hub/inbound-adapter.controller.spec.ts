import { InboundAdapterController } from "./inbound-adapter.controller";
import { REQUIRE_PERMISSION_KEY } from "../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../core/security/permissions/permissions.registry";
import { signWebhookPayload } from "./webhook-signature";

describe("InboundAdapterController", () => {
  it("protects generic inbound ingestion with sys:all", () => {
    const metadata = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      InboundAdapterController.prototype.ingest,
    );

    expect(metadata).toEqual([Permissions.SYS_ALL]);
  });

  describe("signature verification", () => {
    const originalSecret = process.env.WEBHOOK_SECRET;

    beforeEach(() => {
      process.env.WEBHOOK_SECRET = "test-secret-key-123";
    });

    afterEach(() => {
      process.env.WEBHOOK_SECRET = originalSecret;
    });

    it("rejects invalid signature", async () => {
      const controller = new InboundAdapterController();
      await expect(
        controller.ingest("generic", "sha256=invalid-signature", { event: "test" }),
      ).rejects.toThrow("Invalid webhook signature");
    });

    it("accepts valid signature matching signed payload", async () => {
      const controller = new InboundAdapterController();
      const body = { event: "test" };
      const validSig = signWebhookPayload("test-secret-key-123", JSON.stringify(body));

      const res = await controller.ingest("generic", validSig, body);
      expect(res.data.received).toBe(true);
    });
  });
});
