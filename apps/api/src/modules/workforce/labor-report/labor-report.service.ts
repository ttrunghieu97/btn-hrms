import { Injectable } from "@nestjs/common";
import * as XLSX from "xlsx";
import { LaborReportRepository } from "./repositories/labor-report.repository";

interface ExcelRow {
  stt: number;
  fullName: string;
  socialInsuranceNo: string;
  dob: string;
  gender: string;
  identityNumber: string;
  positionTitle: string;
  isManager: string;
  isHighTech: string;
  isMidTech: string;
  isOther: string;
  baseSalary: string;
  positionAllowance: string;
  salaryAllowance: string;
  seniorityRate: string;
  professionalSeniorityRate: string;
  additionalAmount: string;
  indefiniteContractStart: string;
  fixedTermStart: string;
  fixedTermEnd: string;
  otherContractStart: string;
  otherContractEnd: string;
  siStart: string;
  siEnd: string;
  note: string;
}

@Injectable()
export class LaborReportService {
  private static readonly ALLOWANCE_LABELS: Record<string, string> = {
    position: "positionAllowance",
    salary: "salaryAllowance",
    seniority: "seniorityRate",
    professional_seniority: "professionalSeniorityRate",
    additional: "additionalAmount",
  };

  constructor(
    private readonly reportRepo: LaborReportRepository,
  ) {}

  async generateReport(year: number): Promise<Buffer> {
    const employees = await this.reportRepo.findAllActiveEmployees();
    const rows = this.transformToRows(employees);
    return this.buildWorkbook(rows, year);
  }

  private transformToRows(employees: any[]): ExcelRow[] {
    return employees.map((emp, idx) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.trim();
      const gender = emp.gender === "male" ? "Nam" : emp.gender === "female" ? "Nữ" : "";
      const jobCat = emp.jobCategory;

      // Allowance breakdown
      const allowanceMap: Record<string, string> = {};
      for (const a of emp.allowances ?? []) {
        const key = LaborReportService.ALLOWANCE_LABELS[a.type];
        if (key) allowanceMap[key] = a.amount;
      }

      // Contract type mapping
      let indefiniteContractStart = "";
      let fixedTermStart = "";
      let fixedTermEnd = "";
      let otherContractStart = "";
      let otherContractEnd = "";

      if (emp.contractType === "permanent") {
        indefiniteContractStart = emp.contractEffectiveFrom ?? "";
      } else if (emp.contractType === "fixed_term") {
        fixedTermStart = emp.contractEffectiveFrom ?? "";
        fixedTermEnd = emp.contractEffectiveTo ?? "";
      } else if (emp.contractType) {
        otherContractStart = emp.contractEffectiveFrom ?? "";
        otherContractEnd = emp.contractEffectiveTo ?? "";
      }

      return {
        stt: idx + 1,
        fullName,
        socialInsuranceNo: emp.socialInsuranceNo ?? "",
        dob: emp.dob ?? "",
        gender,
        identityNumber: emp.identityNumber ?? "",
        positionTitle: emp.positionTitle ?? emp.orgJobTitle ?? "",
        isManager: jobCat === "manager" ? "x" : "",
        isHighTech: jobCat === "high_level_technical" ? "x" : "",
        isMidTech: jobCat === "mid_level_technical" ? "x" : "",
        isOther: !jobCat || jobCat === "other" ? "x" : "",
        baseSalary: emp.baseSalary ?? "",
        positionAllowance: allowanceMap["positionAllowance"] ?? "0",
        salaryAllowance: allowanceMap["salaryAllowance"] ?? "0",
        seniorityRate: allowanceMap["seniorityRate"] ?? "",
        professionalSeniorityRate: allowanceMap["professionalSeniorityRate"] ?? "",
        additionalAmount: allowanceMap["additionalAmount"] ?? "0",
        indefiniteContractStart,
        fixedTermStart,
        fixedTermEnd,
        otherContractStart,
        otherContractEnd,
        siStart: emp.siStart ?? "",
        siEnd: emp.siEnd ?? "",
        note: emp.status === "retired" ? "Hưởng chế độ hưu trí" : "",
      };
    });
  }

  private buildWorkbook(rows: ExcelRow[], year: number): Buffer {
    const wb = XLSX.utils.book_new();

    // ─── Sheet 1: Chi tiết (Mẫu 01/PLI) ───
    const wsData: unknown[][] = [];
    wsData.push([`BÁO CÁO TÌNH HÌNH SỬ DỤNG LAO ĐỘNG`]);
    wsData.push([`(Tính đến tháng 06 năm ${year})`]);
    wsData.push([]);

    wsData.push([
      "STT", "Họ tên", "Mã số BHXH", "Ngày tháng\nnăm sinh", "Giới tính",
      "Số CCCD/CMND/\nHộ chiếu", "Cấp bậc, chức vụ,\nchức danh nghề,\nnơi làm việc",
      "Nhà quản lý", "Chuyên môn kỹ\nthuật bậc cao",
      "Chuyên môn kỹ\nthuật bậc trung", "Khác",
      "Hệ số/\nMức lương", "Phụ cấp\nchức vụ",
      "Thâm niên\nVK (%)", "Thâm niên\nnghề (%)",
      "Phụ cấp\nlương", "Các khoản\nbổ sung",
      "HĐLĐ không XĐ\nthời hạn\nNgày bắt đầu",
      "HĐLĐ XĐ thời hạn\nNgày bắt đầu",
      "HĐLĐ XĐ thời hạn\nNgày kết thúc",
      "HĐLĐ khác\nNgày bắt đầu",
      "HĐLĐ khác\nNgày kết thúc",
      "Bắt đầu\nđóng BHXH", "Kết thúc\nđóng BHXH", "Ghi chú",
    ]);

    for (const r of rows) {
      wsData.push([
        r.stt, r.fullName, r.socialInsuranceNo, r.dob, r.gender,
        r.identityNumber, r.positionTitle,
        r.isManager, r.isHighTech, r.isMidTech, r.isOther,
        r.baseSalary, r.positionAllowance,
        r.seniorityRate, r.professionalSeniorityRate,
        r.salaryAllowance, r.additionalAmount,
        r.indefiniteContractStart, r.fixedTermStart, r.fixedTermEnd,
        r.otherContractStart, r.otherContractEnd,
        r.siStart, r.siEnd, r.note,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 14 }, { wch: 8 },
      { wch: 18 }, { wch: 28 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 8 },
      { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu 01-PLI");

    // ─── Sheet 2: Tổng hợp ───
    const total = rows.length;
    const mgr = rows.filter((r) => r.isManager).length;
    const hTech = rows.filter((r) => r.isHighTech).length;
    const mTech = rows.filter((r) => r.isMidTech).length;
    const other = rows.filter((r) => r.isOther).length;
    const indef = rows.filter((r) => r.indefiniteContractStart).length;
    const fixed = rows.filter((r) => r.fixedTermStart).length;
    const otherCt = rows.filter((r) => r.otherContractStart).length;
    const si = rows.filter((r) => r.siStart).length;

    const sData: unknown[][] = [
      [`TỔNG HỢP - 6 THÁNG ĐẦU NĂM ${year}`], [],
      ["Chỉ tiêu", "Số lượng"],
      ["Tổng số lao động", total],
      ["Phân loại vị trí việc làm:"],
      ["  - Nhà quản lý", mgr],
      ["  - Chuyên môn kỹ thuật bậc cao", hTech],
      ["  - Chuyên môn kỹ thuật bậc trung", mTech],
      ["  - Khác", other], [],
      ["Phân loại hợp đồng:"],
      ["  - HĐLĐ không xác định thời hạn", indef],
      ["  - HĐLĐ xác định thời hạn", fixed],
      ["  - HĐLĐ khác", otherCt], [],
      ["Tham gia BHXH", si],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sData);
    ws2["!cols"] = [{ wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Tong hop");

    return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  }
}
