import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { connect } from "net";
import { ContextLogger } from "../../shared/logging/context-logger";
import { RequestContextService } from "../../shared/context/request-context.service";

export type ScanResult = {
  status: "clean" | "infected" | "error";
  details: string | null;
};

/**
 * Virus scanner that sends files to ClamAV via TCP (clamd INSTREAM protocol).
 *
 * Falls back to "clean" when ClamAV is not configured (dev mode).
 * Also supports a configurable mock mode for environments without ClamAV.
 */
@Injectable()
export class VirusScannerService {
  private readonly logger: ContextLogger;
  private readonly enabled: boolean;
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(requestContext, VirusScannerService.name);
    this.enabled =
      String(this.config.get("CLAMAV_ENABLED") || "false").toLowerCase() === "true";
    this.host = String(this.config.get("CLAMAV_HOST") || "localhost");
    this.port = Number(this.config.get("CLAMAV_PORT") || 3310);
    this.timeoutMs = Number(this.config.get("CLAMAV_TIMEOUT_MS") || 30_000);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Scan a buffer for viruses via ClamAV.
   * Returns clean if ClamAV is disabled or unavailable.
   */
  async scan(buffer: Buffer): Promise<ScanResult> {
    if (!this.enabled) {
      return { status: "clean", details: null };
    }

    try {
      const result = await this.scanViaClamd(buffer);
      return result;
    } catch (err: unknown) {
      const msg = (err as Error).message;
      this.logger.error({ event: "virus_scan.error", error: msg });
      // On error, fail open (allow) or fail closed (block) based on config
      const failClosed =
        String(this.config.get("CLAMAV_FAIL_CLOSED") || "false").toLowerCase() ===
        "true";
      if (failClosed) {
        return { status: "infected", details: `Scan error: ${msg}` };
      }
      return { status: "clean", details: `Scan unavailable: ${msg}` };
    }
  }

  /**
   * Connect to ClamAV via TCP and send the file using INSTREAM protocol.
   *
   * INSTREAM format:
   *   - zINSTREAM\0 (4 bytes: length prefix + data chunks)
   *   - Each chunk: 4-byte LE length prefix + chunk data
   *   - Terminator: 4-byte LE zero
   *   - Response: "stream: OK" or "stream: <virusname> FOUND"
   */
  private scanViaClamd(buffer: Buffer): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const socket = connect(this.port, this.host, () => {
        // Send INSTREAM command
        socket.write("zINSTREAM\0");

        // Send file in chunks with length-prefixed framing
        const CHUNK_SIZE = 64 * 1024;
        let offset = 0;
        const sendChunk = () => {
          while (offset < buffer.length) {
            const end = Math.min(offset + CHUNK_SIZE, buffer.length);
            const chunk = buffer.subarray(offset, end);
            const len = Buffer.alloc(4);
            len.writeUInt32LE(chunk.length, 0);
            socket.write(Buffer.concat([len, chunk]));
            offset = end;
          }
          // Terminator: zero-length chunk
          const terminator = Buffer.alloc(4, 0);
          socket.write(terminator);
        };
        sendChunk();
      });

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("ClamAV scan timeout"));
      }, this.timeoutMs);

      let response = "";
      socket.on("data", (data: Buffer) => {
        response += data.toString("utf-8");
      });

      socket.on("end", () => {
        clearTimeout(timeout);
        const trimmed = response.trim();
        if (trimmed.includes("OK")) {
          resolve({ status: "clean", details: null });
        } else if (trimmed.includes("FOUND")) {
          const virusName = trimmed.replace(/^stream:\s*/, "").replace(/\s+FOUND$/, "");
          resolve({ status: "infected", details: virusName });
        } else {
          resolve({ status: "error", details: trimmed });
        }
      });

      socket.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }
}
