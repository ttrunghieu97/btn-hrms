ALTER TABLE "employee_contracts" DROP CONSTRAINT "employee_contracts_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "timesheet_snapshots" DROP CONSTRAINT "timesheet_snapshots_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "payroll_input_snapshots" DROP CONSTRAINT "payroll_input_snapshots_payroll_run_id_payroll_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "payroll_input_snapshots" DROP CONSTRAINT "payroll_input_snapshots_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "payroll_items" DROP CONSTRAINT "payroll_items_payroll_run_id_payroll_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "payroll_items" DROP CONSTRAINT "payroll_items_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "payroll_runs" DROP CONSTRAINT "payroll_runs_payroll_period_id_payroll_periods_id_fk";
--> statement-breakpoint
ALTER TABLE "payrolls" DROP CONSTRAINT "payrolls_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "payslips" DROP CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "payslips" DROP CONSTRAINT "payslips_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_structures" DROP CONSTRAINT "salary_structures_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_snapshots" ADD CONSTRAINT "timesheet_snapshots_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_input_snapshots" ADD CONSTRAINT "payroll_input_snapshots_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_input_snapshots" ADD CONSTRAINT "payroll_input_snapshots_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;