import { Module } from "@nestjs/common";
import { PayslipsController } from "./payslips.controller";
import { PayslipsRepository } from "./repositories/payslips.repository";
import { ListPayslipsUseCase } from "./use-cases/list-payslips.usecase";
import { GetPayslipUseCase } from "./use-cases/get-payslip.usecase";
import { PublishPayslipUseCase } from "./use-cases/publish-payslip.usecase";
import { SecurityModule } from "../../../infrastructure/security/security.module";

@Module({
  imports: [SecurityModule],
  controllers: [PayslipsController],
  providers: [
    PayslipsRepository,
    ListPayslipsUseCase,
    GetPayslipUseCase,
    PublishPayslipUseCase,
  ],
})
export class PayslipsModule {}



