export class CreateClaimDto {
  title!: string; description?: string; currency?: string;
}
export class AddItemDto {
  claimId!: string; categoryId?: string; description!: string;
  amount!: number; expenseDate!: string; receiptRequired?: boolean;
}
export class ClaimResponseDto {
  id!: string; employeeId!: string; title!: string; status!: string;
  totalAmount!: string; currency!: string;
}
