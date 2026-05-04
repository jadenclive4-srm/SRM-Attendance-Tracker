import { useMemo, useState } from "react";
import { ATTENDANCE, EMPLOYEES } from "@/lib/mockData";
import { AttendanceStatus, STATUS_COLOR } from "@/lib/types";
import { countByStatus } from "@/lib/attendance";
import StatCard from "@/components/StatCard";
import { Users, CheckCircle2, AlertCircle, Trophy, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import DateRangePicker, { RangeContext } from "@/components/DateRangePicker";
import { defaultRange, filterRecords, rangeToday } from "@/lib/dateRange";
import StackedTrendChart from "@/components/StackedTrendChart";
import ExportDialog from "@/components/ExportDialog";

type RankRow = {
  emp: typeof EMPLOYEES[number];
  counts: Record<AttendanceStatus, number>;
};

export default function AdminDashboard() {
  const today = new Date();
  const [range, setRange] = useState(defaultRange());

  const todayKey = format(today, "yyyy-MM-dd");
  const stats = useMemo(() => {
    const total = EMPLOYEES.length;
    let marked = 0;
    EMPLOYEES.forEach(e => {
      if ((ATTENDANCE[e.id] || []).some(r => r.date === todayKey)) marked++;
    });
    return { total, marked, notMarked: total - marked };
  }, [todayKey]);

  const ranked: RankRow[] = useMemo(() => {
    return EMPLOYEES.map(e => {
      const recs = filterRecords(ATTENDANCE[e.id] || [], range);
      return { emp: e, counts: countByStatus(recs) };
    }).sort((a, b) => {
      // WFO desc → CLT desc → WFH desc → PTO asc
      if (b.counts.WFO !== a.counts.WFO) return b.counts.WFO - a.counts.WFO;
      if (b.counts.CLT !== a.counts.CLT) return b.counts.CLT - a.counts.CLT;
      if (b.counts.WFH !== a.counts.WFH) return b.counts.WFH - a.counts.WFH;
      return a.counts.PTO - b.counts.PTO;
    });
  }, [range]);

  const top5OfficeClient = useMemo(
    () => [...ranked].sort((a, b) =>
      (b.counts.WFO + b.counts.CLT) - (a.counts.WFO + a.counts.CLT)
    ).slice(0, 5),
    [ranked]
  );

  const avgOver3PerWeek = ranked.filter(r => (r.counts.WFO + r.counts.CLT) >= 12);
  const below4PerMonth = ranked.filter(r => (r.counts.WFO + r.counts.CLT) < 4);
  const fullyWFH = ranked.filter(r => r.counts.WFH > 0 && r.counts.WFO === 0 && r.counts.CLT === 0);

  // Export modals
  const [perfOpen, setPerfOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Detailed rows for "Monthly Report" export — one row per employee per day
  const buildReportRows = (r: typeof range) => {
    const out: any[] = [];
    EMPLOYEES.forEach(e => {
      filterRecords(ATTENDANCE[e.id] || [], r).forEach(rec => {
        out.push({
          employeeId: e.employeeId, name: e.fullName, designation: e.designation, team: e.team,
          date: rec.date, status: rec.status, markedAt: rec.markedAt,
        });
      });
    });
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(today, "EEEE, d MMMM yyyy")}</p>
          <div className="mt-2"><RangeContext value={range} /></div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker value={range} onChange={setRange} />
          <Button variant="outline" onClick={() => setPerfOpen(true)}>
            <Download className="h-4 w-4 mr-2" /> Top Performers
          </Button>
          <Button onClick={() => setReportOpen(true)}>
            <FileText className="h-4 w-4 mr-2" /> Full Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Employees" value={stats.total} icon={Users} accent="primary" />
        <StatCard label="Marked Today" value={stats.marked} icon={CheckCircle2} accent="success"
          sub={`${Math.round(stats.marked / stats.total * 100)}% completion`} />
        <StatCard label="Not Marked" value={stats.notMarked} icon={AlertCircle} accent="warning" />
      </div>

      <StackedTrendChart range={range} />

      {/* Leaderboard */}
      <Card className="card-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <h3 className="font-bold">Leaderboard</h3>
          </div>
          <span className="text-xs text-muted-foreground">Sort: WFO ↓ · CLT ↓ · WFH ↓ · PTO ↑</span>
        </div>
        {ranked.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No data in this range</p>
        ) : (
          <div className="overflow-auto max-h-[480px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-semibold">Rank</th>
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold text-center">WFO</th>
                  <th className="px-6 py-3 font-semibold text-center">CLT</th>
                  <th className="px-6 py-3 font-semibold text-center">WFH</th>
                  <th className="px-6 py-3 font-semibold text-center">PTO</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 10).map((r, i) => (
                  <tr key={r.emp.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-warning text-warning-foreground" :
                        i === 1 ? "bg-muted-foreground/20 text-foreground" :
                        i === 2 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
                          style={{ background: r.emp.avatarColor }}>
                          {r.emp.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <div className="font-medium">{r.emp.fullName}</div>
                          <div className="text-xs text-muted-foreground">{r.emp.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.WFO }}>{r.counts.WFO}</td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.CLT }}>{r.counts.CLT}</td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.WFH }}>{r.counts.WFH}</td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.PTO }}>{r.counts.PTO}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <InsightCard title="Top 5 — WFO + CLT" subtitle="Most office presence in range"
          items={top5OfficeClient.map(r => ({ emp: r.emp, value: `${r.counts.WFO + r.counts.CLT} days` }))} />
        <InsightCard title="≥ 12 office days" subtitle="Consistent in-office collaborators"
          items={avgOver3PerWeek.slice(0, 5).map(r => ({ emp: r.emp, value: `${r.counts.WFO + r.counts.CLT} days` }))}
          empty="No employees meet this threshold" />
        <InsightCard title="< 4 office days" subtitle="May need a check-in"
          items={below4PerMonth.slice(0, 5).map(r => ({ emp: r.emp, value: `${r.counts.WFO + r.counts.CLT} days` }))}
          tone="warning"
          empty="Everyone is on track 🎉" />
        <InsightCard title="Fully Remote" subtitle="No office or client visits"
          items={fullyWFH.slice(0, 5).map(r => ({ emp: r.emp, value: `${r.counts.WFH} WFH` }))}
          empty="No fully remote employees" />
      </div>

      <ExportDialog
        open={perfOpen}
        onOpenChange={setPerfOpen}
        title="Export Top Performers"
        reportTitle="Top Performers Leaderboard"
        fileName={`top-performers-${format(new Date(), "yyyy-MM-dd")}`}
        initialRange={range}
        getRows={(r) =>
          EMPLOYEES.map(e => ({
            emp: e, counts: countByStatus(filterRecords(ATTENDANCE[e.id] || [], r)),
          })).sort((a, b) => {
            if (b.counts.WFO !== a.counts.WFO) return b.counts.WFO - a.counts.WFO;
            if (b.counts.CLT !== a.counts.CLT) return b.counts.CLT - a.counts.CLT;
            if (b.counts.WFH !== a.counts.WFH) return b.counts.WFH - a.counts.WFH;
            return a.counts.PTO - b.counts.PTO;
          })
        }
        columns={[
          { header: "Employee ID", get: (r) => r.emp.employeeId },
          { header: "Name", get: (r) => r.emp.fullName },
          { header: "Designation", get: (r) => r.emp.designation },
          { header: "Team", get: (r) => r.emp.team },
          { header: "WFO", get: (r) => String(r.counts.WFO) },
          { header: "CLT", get: (r) => String(r.counts.CLT) },
          { header: "WFH", get: (r) => String(r.counts.WFH) },
          { header: "PTO", get: (r) => String(r.counts.PTO) },
        ]}
      />

      <ExportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Export Full Attendance Report"
        reportTitle="Attendance Report"
        fileName={`attendance-report-${format(new Date(), "yyyy-MM-dd")}`}
        initialRange={range}
        getRows={buildReportRows}
        columns={[
          { header: "Date", get: (r) => format(new Date(r.date), "dd MMM yyyy") },
          { header: "Employee ID", get: (r) => r.employeeId },
          { header: "Name", get: (r) => r.name },
          { header: "Designation", get: (r) => r.designation },
          { header: "Team", get: (r) => r.team },
          { header: "Status", get: (r) => r.status },
          { header: "Marked At", get: (r) => format(new Date(r.markedAt), "hh:mm a") },
        ]}
      />
    </div>
  );
}

function InsightCard({
  title, subtitle, items, empty = "No data", tone = "default",
}: {
  title: string; subtitle: string; tone?: "default" | "warning";
  items: { emp: any; value: string }[]; empty?: string;
}) {
  return (
    <Card className="card-soft p-6">
      <div className="mb-4">
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map(({ emp, value }) => (
            <li key={emp.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
                  style={{ background: emp.avatarColor }}>
                  {emp.fullName.split(" ").map((n:string)=>n[0]).slice(0,2).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{emp.fullName}</div>
                  <div className="text-[11px] text-muted-foreground">{emp.designation}</div>
                </div>
              </div>
              <span className={`text-sm font-semibold ${tone === "warning" ? "text-warning" : "text-primary"}`}>{value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
