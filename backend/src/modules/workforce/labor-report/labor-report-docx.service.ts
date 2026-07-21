import { Injectable } from "@nestjs/common";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, TextRun,
  Header, Footer, PageNumber, PageBreak,
  convertInchesToTwip,
} from "docx";
import { LaborReportRepository, EmployeeReportRaw } from "./repositories/labor-report.repository";

@Injectable()
export class LaborReportDocxService {
  constructor(
    private readonly reportRepo: LaborReportRepository,
  ) {}

  async generateReport(year: number): Promise<Buffer> {
    const employees = await this.reportRepo.findAllActiveEmployees();
    const rows = this.transformRows(employees);

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: "Times New Roman", size: 22 },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(0.8),
                right: convertInchesToTwip(0.6),
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Mẫu số 01/PLI",
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: this.buildContent(rows, year),
        },
      ],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }

  private transformRows(employees: EmployeeReportRaw[]) {
    return employees.map((emp, idx) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.trim();
      const gender = emp.gender === "male" ? "Nam" : emp.gender === "female" ? "Nữ" : "";
      const jobCat = emp.jobCategory;

      const allowanceMap: Record<string, string> = {};
      for (const a of emp.allowances ?? []) {
        allowanceMap[a.type] = a.amount;
      }

      let indefiniteStart = "", fixedStart = "", fixedEnd = "",
          otherStart = "", otherEnd = "";
      if (emp.contractType === "permanent") {
        indefiniteStart = emp.contractEffectiveFrom ?? "";
      } else if (emp.contractType === "fixed_term") {
        fixedStart = emp.contractEffectiveFrom ?? "";
        fixedEnd = emp.contractEffectiveTo ?? "";
      } else if (emp.contractType) {
        otherStart = emp.contractEffectiveFrom ?? "";
        otherEnd = emp.contractEffectiveTo ?? "";
      }

      return {
        idx: idx + 1,
        name: fullName,
        siNo: emp.socialInsuranceNo ?? "",
        dob: emp.dob ?? "",
        gender,
        idNo: emp.identityNumber ?? "",
        title: emp.positionTitle ?? emp.orgJobTitle ?? "",
        isManager: jobCat === "manager" ? "x" : "",
        isHighTech: jobCat === "high_level_technical" ? "x" : "",
        isMidTech: jobCat === "mid_level_technical" ? "x" : "",
        isOther: !jobCat || jobCat === "other" ? "x" : "",
        baseSalary: emp.baseSalary ?? "",
        posAllowance: allowanceMap["position"]?.toString() ?? "",
        seniorityPct: allowanceMap["seniority"]?.toString() ?? "",
        profSeniorityPct: allowanceMap["professional_seniority"]?.toString() ?? "",
        salaryAllowance: allowanceMap["salary"]?.toString() ?? "",
        additional: allowanceMap["additional"]?.toString() ?? "",
        indefiniteStart,
        fixedStart, fixedEnd,
        otherStart, otherEnd,
        siStart: emp.siStart ?? "",
        siEnd: emp.siEnd ?? "",
        note: emp.status === "retired" ? "Hưởng chế độ hưu trí" : "",
      };
    });
  }

  private buildContent(rows: any[], year: number) {
    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0 }, children: [new TextRun({ text: "TÊN DOANH NGHIỆP, CƠ QUAN, TỔ CHỨC-------", size: 20 })] }));
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 100 }, children: [
      new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 20 }),
    ]}));
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 200 }, children: [
      new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", size: 20 }),
      new TextRun({ text: "\n---------------", size: 20 }),
    ]}));

    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 100 }, children: [
      new TextRun({ text: `Số: …/….`, size: 20 }),
    ]}));
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 200 }, children: [
      new TextRun({ text: `……, ngày … tháng … năm 202..`, size: 20 }),
    ]}));

    // Main title
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "BÁO CÁO TÌNH HÌNH SỬ DỤNG LAO ĐỘNG", bold: true, size: 24 })],
    }));
    children.push(new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: `Kính gửi: (1)`, size: 20 })],
    }));

    // Info section
    children.push(new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: "1. Thông tin chung về doanh nghiệp, cơ quan, tổ chức:", bold: true, size: 20 })],
    }));
    children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Tên đơn vị: ..........................................................................................................", size: 20 })] }));
    children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Địa chỉ: ..............................................................................................................", size: 20 })] }));
    children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Điện thoại: ................................... Fax: ........................ Email: ...........................", size: 20 })] }));
    children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Mã số giấy chứng nhận đăng ký doanh nghiệp/ Giấy phép thành lập: ........................................", size: 20 })] }));
    children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Lĩnh vực hoạt động, ngành, nghề kinh doanh chính: .........................................................", size: 20 })] }));

    // Section 2 header
    children.push(new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: `2. Thông tin tình hình sử dụng lao động của đơn vị: (tính đến tháng 06 năm ${year})`, bold: true, size: 20 })],
    }));

    // ─── Build the data table ───
    const mergedHeader = this.buildMergedHeader();
    const columnIndexRow = this.buildColumnIndexRow();
    const dataRows = this.buildDataRows(rows);

    const table = new Table({
      rows: [mergedHeader, columnIndexRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
    children.push(table);

    // Notes
    children.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Ghi chú:", bold: true, size: 18 })] }));
    children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `(1) Sở Nội vụ; cơ quan bảo hiểm xã hội cấp quận, huyện nơi đặt trụ sở, chi nhánh, văn phòng đại diện`, size: 18 })] }));

    // Signature
    children.push(new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: `……, ngày … tháng … năm 202..`, size: 20 }),
    ]}));
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: "ĐẠI DIỆN DOANH NGHIỆP, CƠ QUAN, TỔ CHỨC", bold: true, size: 20 }),
    ]}));
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 300 }, children: [
      new TextRun({ text: "(Chức vụ, họ và tên, chữ ký, dấu)", size: 20 }),
    ]}));

    return children;
  }

  private buildMergedHeader(): TableRow {
    // Complex merged header - using a simplified row for the header
    // Each column index corresponds to a position
    const headers = [
      "STT", "Họ tên", "Mã số BHXH", "Ngày tháng\nnăm sinh",
      "Giới tính", "Số CCCD/CMND/\nHộ chiếu",
      "Cấp bậc, chức vụ,\nchức danh nghề,\nnơi làm việc",
    ];
    const subHeaders = ["Nhà quản lý", "Chuyên môn kỹ\nthuật bậc cao", "Chuyên môn kỹ\nthuật bậc trung", "Khác"];
    const salaryHeaders = ["Hệ số/\nMức lương", "Phụ cấp"];
    const contractHeaders = ["Ngày bắt đầu\nHĐLĐ không XĐ\nthời hạn", "HĐLĐ XĐ thời hạn\nNgày bắt đầu", "HĐLĐ XĐ thời hạn\nNgày kết thúc",
      "HĐLĐ khác\nNgày bắt đầu", "HĐLĐ khác\nNgày kết thúc"];
    const lastHeaders = ["Bắt đầu\nđóng BHXH", "Kết thúc\nđóng BHXH", "Ghi chú"];

    const allCols = [];
    for (const h of headers) {
      allCols.push(this.cell(h, true, 22));
    }
    // Vị trí việc làm (4 cols)
    for (const h of subHeaders) {
      allCols.push(this.cell(h, true, 22));
    }
    // Tiền lương (2+5=7 cols)
    for (const h of salaryHeaders) {
      allCols.push(this.cell(h, true, 22));
    }
    // Phụ cấp breakdown (5 cols)
    for (const h of ["Chức vụ", "Thâm niên\nVK (%)", "Thâm niên\nnghề (%)", "Phụ cấp\nlương", "Các khoản\nbổ sung"]) {
      allCols.push(this.cell(h, true, 22));
    }
    // Ngành/nghề nặng nhọc - skip
    allCols.push(this.cell("", true, 22));
    allCols.push(this.cell("", true, 22));
    // Contract headers (5 cols)
    for (const h of contractHeaders) {
      allCols.push(this.cell(h, true, 22));
    }
    // BHXH dates (2 cols)
    for (const h of lastHeaders) {
      allCols.push(this.cell(h, true, 22));
    }

    return new TableRow({ tableHeader: true, children: allCols });
  }

  private buildColumnIndexRow(): TableRow {
    const indices = [
      "(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)",
      "(8)", "(9)", "(10)", "(11)",
      "(12)", "(13)",
      "(14)", "(15)", "(16)", "(17)", "(18)",
      "(19)", "(20)",
      "(21)", "(22)", "(23)", "(24)", "(25)", "(26)", "(27)",
    ];
    return new TableRow({
      children: indices.map((i) => this.cell(i, true, 18)),
    });
  }

  private buildDataRows(rows: any[]): TableRow[] {
    return rows.map((r) => {
      const cells = [
        String(r.idx), r.name, r.siNo, r.dob, r.gender, r.idNo, r.title,
        r.isManager, r.isHighTech, r.isMidTech, r.isOther,
        r.baseSalary,
        r.posAllowance,
        r.seniorityPct, r.profSeniorityPct, r.salaryAllowance, r.additional,
        "", "", // hazardous skip
        r.indefiniteStart, r.fixedStart, r.fixedEnd, r.otherStart, r.otherEnd,
        r.siStart, r.siEnd, r.note,
      ];
      return new TableRow({
        children: cells.map((c) => this.cell(String(c), false, 20)),
      });
    });
  }

  private cell(text: string, bold: boolean, size: number): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: text,
              bold,
              size,
              font: "Times New Roman",
            }),
          ],
        }),
      ],
    });
  }
}
