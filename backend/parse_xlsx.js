const XLSX = require('xlsx');
const path = require('path');

const file = '/home/hieutt/hieutt@sẻrver1/employee.xlsx';
const wb = XLSX.readFile(file);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

let hdr = -1;
for (let i = 0; i < rows.length; i++) {
  if (rows[i][0] === "STT") { hdr = i; break; }
}
if (hdr === -1) {
  console.log("Cannot find header row");
  process.exit(1);
}

const dataRows = rows.slice(hdr + 1).filter((r) => r[1]?.toString().trim() && r[2]?.toString().trim());
console.log("Total rows:", dataRows.length);

const codes = {};
const names = {};
const emails = {};

dataRows.forEach((row, idx) => {
  const code = row[1]?.toString().trim();
  const name = row[2]?.toString().trim();
  const email = row[25]?.toString().trim();

  if (codes[code]) {
    console.log(`Duplicate code in excel: ${code} at row ${idx + hdr + 2}`);
  }
  codes[code] = true;

  if (email) {
    if (emails[email]) {
      console.log(`Duplicate email in excel: ${email} at row ${idx + hdr + 2}`);
    }
    emails[email] = true;
  }
});
