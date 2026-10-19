export class CreateClaimDto {
  title!: string; description?: string; currency?: string;
}
export class AddItemDto {
  claimId!: string; categoryId?: string; description!: string;
  amount!: number; expenseDate!: string; receiptRequired?: boolean;
}
export class ClaimItemResponseDto {
  id!: string;
  claimId!: string;
  description!: string;
  amount!: string;
  expenseDate!: string;
  categoryId?: string | null;
}
export class ClaimResponseDto {
  id!: string; employeeId!: string; title!: string; status!: string;
  totalAmount!: string; currency!: string;
  description?: string | null;
  createdAt?: string;
  items?: ClaimItemResponseDto[];
}
