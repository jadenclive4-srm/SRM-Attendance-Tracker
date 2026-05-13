import { Employee, AttendanceRecord, AttendanceStatus } from "./types";
import { countByStatus } from "./attendance";
import { DateRange, filterRecords } from "./dateRange";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface AnalyticsExportData {
  leaderboard: LeaderboardRow[];
  top5: Top5Row[];
  consistentInOffice: ConsistentRow[];
  lessThan4Days: LessThan4Row[];
  fullyRemote: FullyRemoteRow[];
}

export interface LeaderboardRow {
  rank: number;
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  wfo: number;
  clt: number;
  wfh: number;
  pto: number;
  hol: number;
  totalOffice: number;
}

export interface Top5Row {
  rank: number;
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  totalOffice: number;
}

export interface ConsistentRow {
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  totalOffice: number;
}

export interface LessThan4Row {
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  totalOffice: number;
}

export interface FullyRemoteRow {
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  wfh: number;
}

/**
 * Build analytics report data reusing dashboard aggregation logic
 */
export function buildAnalyticsReport(
  employees: Employee[],
  attendance: Record<string, AttendanceRecord[]>,
  range: DateRange
): AnalyticsExportData {
  // Step 1: Calculate counts for all employees
  type RankRow = {
    emp: Employee;
    counts: Record<AttendanceStatus, number>;
  };

  const ranked: RankRow[] = employees
    .map((e) => {
      const recs = filterRecords(attendance[e.id] || [], range);
      return { emp: e, counts: countByStatus(recs) };
    })
    .sort((a, b) => {
      if (b.counts.WFO !== a.counts.WFO) return b.counts.WFO - a.counts.WFO;
      if (b.counts.CLT !== a.counts.CLT) return b.counts.CLT - a.counts.CLT;
      if (b.counts.WFH !== a.counts.WFH) return b.counts.WFH - a.counts.WFH;
      return a.counts.PTO - b.counts.PTO;
    });

  // Step 2: Build Leaderboard (all employees, ranked)
  const leaderboard: LeaderboardRow[] = ranked.map((r, idx) => ({
    rank: idx + 1,
    employeeId: r.emp.employeeId,
    name: r.emp.fullName,
    designation: r.emp.designation,
    team: r.emp.team,
    wfo: r.counts.WFO,
    clt: r.counts.CLT,
    wfh: r.counts.WFH,
    pto: r.counts.PTO,
    hol: r.counts.HOL,
    totalOffice: r.counts.WFO + r.counts.CLT,
  }));

  // Step 3: Top 5 by Office Presence (WFO + CLT)
  const top5: Top5Row[] = [...ranked]
    .sort((a, b) => (b.counts.WFO + b.counts.CLT) - (a.counts.WFO + a.counts.CLT))
    .slice(0, 5)
    .map((r, idx) => ({
      rank: idx + 1,
      employeeId: r.emp.employeeId,
      name: r.emp.fullName,
      designation: r.emp.designation,
      team: r.emp.team,
      totalOffice: r.counts.WFO + r.counts.CLT,
    }));

  // Step 4: Consistent In Office (>= 12 days threshold)
  const consistentInOffice: ConsistentRow[] = ranked
    .filter((r) => r.counts.WFO + r.counts.CLT >= 12)
    .map((r) => ({
      employeeId: r.emp.employeeId,
      name: r.emp.fullName,
      designation: r.emp.designation,
      team: r.emp.team,
      totalOffice: r.counts.WFO + r.counts.CLT,
    }));

  // Step 5: Less Than 4 Office Days
  const lessThan4: LessThan4Row[] = ranked
    .filter((r) => r.counts.WFO + r.counts.CLT < 4)
    .map((r) => ({
      employeeId: r.emp.employeeId,
      name: r.emp.fullName,
      designation: r.emp.designation,
      team: r.emp.team,
      totalOffice: r.counts.WFO + r.counts.CLT,
    }));

  // Step 6: Fully Remote (WFH > 0 and WFO = 0 and CLT = 0)
  const fullyRemoteList: FullyRemoteRow[] = ranked
    .filter((r) => r.counts.WFH > 0 && r.counts.WFO === 0 && r.counts.CLT === 0)
    .map((r) => ({
      employeeId: r.emp.employeeId,
      name: r.emp.fullName,
      designation: r.emp.designation,
      team: r.emp.team,
      wfh: r.counts.WFH,
    }));

  return {
    leaderboard,
    top5,
    consistentInOffice,
    lessThan4,
    fullyRemote: fullyRemoteList,
  };
}

/**
 * Generate Analytics CSV with logical sections
 */
export function generateAnalyticsCSV(
  data: AnalyticsExportData,
  periodLabel: string
): string {
  const lines: string[] = [];

  // Helper to escape CSV values
  const escapeCSV = (val: any) => {
    const str = String(val ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Header
  lines.push(`Attendance Analytics Report - ${periodLabel}`);
  lines.push(`Generated: ${format(new Date(), "d MMM yyyy · hh:mm a")}`);
  lines.push("");

  // Section 1: Leaderboard
  lines.push("=== LEADERBOARD ===");
  lines.push(
    [
      "Rank",
      "Employee ID",
      "Name",
      "Designation",
      "Team",
      "WFO",
      "CLT",
      "WFH",
      "PTO",
      "HOL",
      "Total Office Days",
    ]
      .map(escapeCSV)
      .join(",")
  );
  data.leaderboard.forEach((row) => {
    lines.push(
      [
        row.rank,
        row.employeeId,
        row.name,
        row.designation,
        row.team,
        row.wfo,
        row.clt,
        row.wfh,
        row.pto,
        row.hol,
        row.totalOffice,
      ]
        .map(escapeCSV)
        .join(",")
    );
  });
  lines.push("");

  // Section 2: Top 5
  lines.push("=== TOP 5 EMPLOYEES BY OFFICE PRESENCE ===");
  lines.push(
    ["Rank", "Employee ID", "Name", "Designation", "Team", "Total Office Days"]
      .map(escapeCSV)
      .join(",")
  );
  data.top5.forEach((row) => {
    lines.push(
      [row.rank, row.employeeId, row.name, row.designation, row.team, row.totalOffice]
        .map(escapeCSV)
        .join(",")
    );
  });
  lines.push("");

  // Section 3: Consistent In Office
  lines.push("=== CONSISTENT IN-OFFICE EMPLOYEES (>=12 days) ===");
  lines.push(
    ["Employee ID", "Name", "Designation", "Team", "Total Office Days"]
      .map(escapeCSV)
      .join(",")
  );
  data.consistentInOffice.forEach((row) => {
    lines.push(
      [row.employeeId, row.name, row.designation, row.team, row.totalOffice]
        .map(escapeCSV)
        .join(",")
    );
  });
  lines.push("");

  // Section 4: Less Than 4 Days
  lines.push("=== EMPLOYEES WITH LESS THAN 4 OFFICE DAYS ===");
  lines.push(
    ["Employee ID", "Name", "Designation", "Team", "Total Office Days"]
      .map(escapeCSV)
      .join(",")
  );
  data.lessThan4.forEach((row) => {
    lines.push(
      [row.employeeId, row.name, row.designation, row.team, row.totalOffice]
        .map(escapeCSV)
        .join(",")
    );
  });
  lines.push("");

  // Section 5: Fully Remote
  lines.push("=== FULLY REMOTE EMPLOYEES ===");
  lines.push(["Employee ID", "Name", "Designation", "Team", "WFH Days"].map(escapeCSV).join(","));
  data.fullyRemote.forEach((row) => {
    lines.push(
      [row.employeeId, row.name, row.designation, row.team, row.wfh]
        .map(escapeCSV)
        .join(",")
    );
  });

  return lines.join("\n");
}

/**
 * Generate Analytics PDF with properly formatted sections
 */
export function generateAnalyticsPDF(
  data: AnalyticsExportData,
  periodLabel: string
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  let yPosition = 40;

  // Helper to add section
  const addSection = (title: string, columnHeaders: string[], rows: (string | number)[][]): void => {
    // Add title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 40, yPosition);
    yPosition += 18;

    // Add table
    autoTable(doc, {
      startY: yPosition,
      head: [columnHeaders],
      body: rows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [60, 80, 180], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      didDrawPage: () => {
        // Footer
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${doc.internal.pages.length}`, 40, pageHeight - 20);
      },
    });

    // Update position after table
    yPosition = (doc as any).lastAutoTable?.finalY + 18 ?? yPosition + 100;

    // Add page break if needed
    if (yPosition > 500) {
      doc.addPage();
      yPosition = 40;
    }
  };

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Attendance Analytics Report", 40, yPosition);
  yPosition += 18;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Period: ${periodLabel}`, 40, yPosition);
  yPosition += 14;
  doc.text(`Generated: ${format(new Date(), "d MMM yyyy · hh:mm a")}`, 40, yPosition);
  yPosition += 24;
  doc.setTextColor(0);

  // Section 1: Leaderboard
  addSection(
    "1. LEADERBOARD - ALL EMPLOYEES",
    ["Rank", "Emp ID", "Name", "Designation", "Team", "WFO", "CLT", "WFH", "PTO", "HOL", "Total Office"],
    data.leaderboard.map((r) => [r.rank, r.employeeId, r.name, r.designation, r.team, r.wfo, r.clt, r.wfh, r.pto, r.hol, r.totalOffice])
  );

  // Section 2: Top 5
  addSection(
    "2. TOP 5 EMPLOYEES BY OFFICE PRESENCE (WFO + CLT)",
    ["Rank", "Emp ID", "Name", "Designation", "Team", "Total Office Days"],
    data.top5.map((r) => [r.rank, r.employeeId, r.name, r.designation, r.team, r.totalOffice])
  );

  // Section 3: Consistent In Office
  addSection(
    "3. CONSISTENT IN-OFFICE EMPLOYEES (≥12 Days)",
    ["Emp ID", "Name", "Designation", "Team", "Total Office Days"],
    data.consistentInOffice.map((r) => [r.employeeId, r.name, r.designation, r.team, r.totalOffice])
  );

  // Section 4: Less Than 4 Days
  addSection(
    "4. EMPLOYEES WITH LESS THAN 4 OFFICE DAYS",
    ["Emp ID", "Name", "Designation", "Team", "Total Office Days"],
    data.lessThan4.map((r) => [r.employeeId, r.name, r.designation, r.team, r.totalOffice])
  );

  // Section 5: Fully Remote
  addSection(
    "5. FULLY REMOTE EMPLOYEES (WFO=0, CLT=0, WFH>0)",
    ["Emp ID", "Name", "Designation", "Team", "WFH Days"],
    data.fullyRemote.map((r) => [r.employeeId, r.name, r.designation, r.team, r.wfh])
  );

  // Save
  doc.save(`analytics-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
