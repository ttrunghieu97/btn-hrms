SELECT
  COUNT(*) AS missing_payslip_count
FROM payrolls p
LEFT JOIN payslips ps
  ON ps.id = p.payslip_id
WHERE ps.id IS NULL;
