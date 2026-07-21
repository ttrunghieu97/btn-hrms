export interface PayrollInputAcl {
  mapTimeSignalsToPayrollInputs(input: Record<string, unknown>): {
    type: string;
    amount?: string;
    quantity?: string;
    metadata?: Record<string, unknown>;
  }[];
}
