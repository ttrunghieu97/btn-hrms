import { InboundAdapterController } from "./inbound-adapter.controller";
import { REQUIRE_PERMISSION_KEY } from "../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../core/security/permissions/permissions.registry";

describe("InboundAdapterController", () => {
  it("protects generic inbound ingestion with sys:all", () => {
    const metadata = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      InboundAdapterController.prototype.ingest,
    );

    expect(metadata).toEqual([Permissions.SYS_ALL]);
  });
});
