/**
 * VirusScannerPort — abstraction over malware scanning for uploaded evidence.
 */
export const VIRUS_SCANNER_PORT = Symbol("VIRUS_SCANNER_PORT");

export type VirusScanResult = {
  ok: boolean;
  threat?: string;
  scannedAt: Date;
};

export interface VirusScannerPort {
  scan(buffer: Buffer, originalName?: string): Promise<VirusScanResult>;
}
