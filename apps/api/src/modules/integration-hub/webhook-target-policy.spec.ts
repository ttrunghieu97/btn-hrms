import {
  isPrivateOrReservedIp,
  isPrivateHostname,
  validateOutboundWebhookUrl,
  assertSafeWebhookTarget,
} from "./webhook-target-policy";
import * as dns from "node:dns/promises";

jest.mock("node:dns/promises");

describe("Webhook SSRF & Target Policy", () => {
  beforeEach(() => {
    delete process.env.WEBHOOK_ALLOW_INSECURE_HTTP;
    delete process.env.WEBHOOK_TARGET_ALLOWLIST;
    jest.clearAllMocks();
  });

  describe("isPrivateOrReservedIp", () => {
    it("identifies private IPv4 addresses", () => {
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("127.1.2.3")).toBe(true);
      expect(isPrivateOrReservedIp("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("10.255.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("172.31.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.100")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true); // AWS/cloud metadata
      expect(isPrivateOrReservedIp("100.64.0.1")).toBe(true); // CGNAT
      expect(isPrivateOrReservedIp("0.0.0.0")).toBe(true);
      expect(isPrivateOrReservedIp("255.255.255.255")).toBe(true);
    });

    it("identifies private and reserved IPv6 addresses", () => {
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("::")).toBe(true);
      expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIp("fd12:3456:789a:1::1")).toBe(true);
      expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true);
    });

    it("allows public IP addresses", () => {
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrReservedIp("93.184.215.14")).toBe(false); // example.com
      expect(isPrivateOrReservedIp("2606:4700:4700::1111")).toBe(false); // Cloudflare DNS
    });
  });

  describe("isPrivateHostname", () => {
    it("detects local/internal domains", () => {
      expect(isPrivateHostname("localhost")).toBe(true);
      expect(isPrivateHostname("myapi.local")).toBe(true);
      expect(isPrivateHostname("service.internal")).toBe(true);
      expect(isPrivateHostname("router.lan")).toBe(true);
      expect(isPrivateHostname("intranet.corp")).toBe(true);
      expect(isPrivateHostname("127.0.0.1")).toBe(true);
      expect(isPrivateHostname("169.254.169.254")).toBe(true);
    });

    it("allows standard public hostnames", () => {
      expect(isPrivateHostname("api.stripe.com")).toBe(false);
      expect(isPrivateHostname("hooks.slack.com")).toBe(false);
      expect(isPrivateHostname("webhook.site")).toBe(false);
    });
  });

  describe("validateOutboundWebhookUrl", () => {
    it("rejects insecure HTTP by default", () => {
      expect(() => validateOutboundWebhookUrl("http://example.com/webhook")).toThrow(
        /must use HTTPS/,
      );
    });

    it("rejects embedded credentials", () => {
      expect(() =>
        validateOutboundWebhookUrl("https://admin:secret@example.com/webhook"),
      ).toThrow(/embedded credentials/);
    });

    it("rejects localhost and private network targets", () => {
      expect(() => validateOutboundWebhookUrl("https://localhost/webhook")).toThrow(
        /must not target localhost or private network/,
      );
      expect(() => validateOutboundWebhookUrl("https://127.0.0.1:8080/webhook")).toThrow(
        /must not target localhost or private network/,
      );
      expect(() =>
        validateOutboundWebhookUrl("https://169.254.169.254/latest/meta-data"),
      ).toThrow(/must not target localhost or private network/);
    });

    it("enforces allowlist if configured", () => {
      process.env.WEBHOOK_TARGET_ALLOWLIST = "trusted.com,partner.org";
      expect(() => validateOutboundWebhookUrl("https://evil.com/hook")).toThrow(
        /not permitted by policy/,
      );
      expect(validateOutboundWebhookUrl("https://api.trusted.com/hook")).toBe(
        "https://api.trusted.com/hook",
      );
    });

    it("accepts valid public HTTPS URLs", () => {
      expect(validateOutboundWebhookUrl("https://api.slack.com/events")).toBe(
        "https://api.slack.com/events",
      );
    });
  });

  describe("assertSafeWebhookTarget", () => {
    it("blocks domains that resolve to internal/cloud metadata IP (DNS rebinding / SSRF)", async () => {
      (dns.lookup as unknown as jest.Mock).mockResolvedValue([
        { address: "169.254.169.254", family: 4 },
      ]);

      await expect(
        assertSafeWebhookTarget("https://malicious-metadata-rebind.com/hook"),
      ).rejects.toThrow(/resolves to private or reserved IP/);
    });

    it("blocks domains that resolve to 127.0.0.1", async () => {
      (dns.lookup as unknown as jest.Mock).mockResolvedValue([
        { address: "127.0.0.1", family: 4 },
      ]);

      await expect(
        assertSafeWebhookTarget("https://local-rebind.com/hook"),
      ).rejects.toThrow(/resolves to private or reserved IP/);
    });

    it("allows domains that resolve to valid public IPs", async () => {
      (dns.lookup as unknown as jest.Mock).mockResolvedValue([
        { address: "93.184.215.14", family: 4 },
      ]);

      await expect(
        assertSafeWebhookTarget("https://example.com/webhook"),
      ).resolves.toBeUndefined();
    });
  });
});
