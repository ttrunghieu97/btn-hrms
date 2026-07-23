import { Injectable } from "@nestjs/common";
import type { VirusScannerPort, VirusScanResult } from "../ports/virus-scanner.port";
import { VirusScannerService } from "../../../../infrastructure/storage/virus-scanner.service";

/**
 * Adapter: VirusScannerPort → VirusScannerService (infra).
 */
@Injectable()
export class VirusScannerAdapter implements VirusScannerPort {
  constructor(private readonly virusScanner: VirusScannerService) {}

  async scan(buffer: Buffer, originalName?: string): Promise<VirusScanResult> {
    const result = await this.virusScanner.scan(buffer);
    return { ok: result.status === "clean", scannedAt: new Date(), ...result };
  }
}
