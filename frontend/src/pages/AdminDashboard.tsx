import { useEffect, useMemo, useState } from "react";
import { AttendanceRecord, AttendanceStatus, Employee, STATUS_COLOR } from "@/lib/types";
import { countByStatus, dateKey } from "@/lib/attendance";
import { getAttendanceForEmployees, getEmployees } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { Users, CheckCircle2, AlertCircle, Trophy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { eachDayOfInterval, format } from "date-fns";
import DateRangePicker, { RangeContext } from "@/components/DateRangePicker";
import { defaultRange, filterRecords, rangeToday } from "@/lib/dateRange";
import StackedTrendChart from "@/components/StackedTrendChart";
import FullReportAnalyticsDialog from "@/components/FullReportAnalyticsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type RankRow = {
  emp: Employee;
  counts: Record<AttendanceStatus, number>;
};

export default function AdminDashboard() {
  const today = new Date();
  const [range, setRange] = useState(defaultRange());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord[]>>({});
  const [markedTodayDialogOpen, setMarkedTodayDialogOpen] = useState(false);
  const [notMarkedDialogOpen, setNotMarkedDialogOpen] = useState(false);

  const todayKey = format(today, "yyyy-MM-dd");
  const stats = useMemo(() => {
    const total = employees.length;
    let marked = 0;
    employees.forEach(e => {
      if ((attendance[e.id] || []).some(r => r.date === todayKey)) marked++;
    });
    return { total, marked, notMarked: total - marked };
  }, [attendance, employees, todayKey]);

  // Get employees marked today with their status
  const markedTodayEmployees = useMemo(() => {
    return employees.filter(e => {
      const rec = (attendance[e.id] || []).find(r => r.date === todayKey);
      return !!rec;
    }).map(e => {
      const rec = (attendance[e.id] || []).find(r => r.date === todayKey);
      return { employee: e, status: rec?.status };
    }).sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
  }, [attendance, employees, todayKey]);

  // Get employees not marked today
  const notMarkedTodayEmployees = useMemo(() => {
    return employees.filter(e => {
      const rec = (attendance[e.id] || []).find(r => r.date === todayKey);
      return !rec;
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [attendance, employees, todayKey]);

  const ranked: RankRow[] = useMemo(() => {
    return employees.map(e => {
      const recs = filterRecords(attendance[e.id] || [], range);
      return { emp: e, counts: countByStatus(recs) };
    }).sort((a, b) => {
      if (b.counts.WFO !== a.counts.WFO) return b.counts.WFO - a.counts.WFO;
      if (b.counts.CLT !== a.counts.CLT) return b.counts.CLT - a.counts.CLT;
      if (b.counts.WFH !== a.counts.WFH) return b.counts.WFH - a.counts.WFH;
      return a.counts.PTO - b.counts.PTO;
    });
  }, [attendance, employees, range]);

  const totalWorkingDaysInRange = useMemo(() => {
    const effectiveTo = range.to > today ? today : range.to;
    if (effectiveTo < range.from) return 0;
    return eachDayOfInterval({ start: range.from, end: effectiveTo }).filter((d) => {
      const dow = d.getDay();
      return dow !== 0 && dow !== 6;
    }).length;
  }, [range, today]);

  // Individual total working days per employee
  const empTotalDays = useMemo(() => {
    return new Map(
      ranked.map((row) => {
        const total = row.counts.WFO + row.counts.WFH + row.counts.CLT + row.counts.PTO;
        return [row.emp.id, total];
      })
    );
  }, [ranked]);

  const officeMetrics = useMemo(() => {
    const weeksInRange = totalWorkingDaysInRange > 0 ? totalWorkingDaysInRange / 5 : 0;
    return new Map(
      ranked.map((row) => {
        const officeDays = row.counts.WFO + row.counts.CLT;
        const empTotal = empTotalDays.get(row.emp.id) || 1;
        const officePct = empTotal > 0
          ? Math.round((officeDays / empTotal) * 100)
          : 0;
        const avgOfficePerWeek = weeksInRange > 0 ? officeDays / weeksInRange : 0;
        return [row.emp.id, { officeDays, officePct, meetsThreePerWeek: avgOfficePerWeek >= 3 }];
      })
    );
  }, [ranked, totalWorkingDaysInRange, empTotalDays]);

  const top5OfficeClient = useMemo(
    () => [...ranked].sort((a, b) =>
      (b.counts.WFO + b.counts.CLT) - (a.counts.WFO + a.counts.CLT)
    ).slice(0, 5),
    [ranked]
  );

  const avgOver3PerWeek = ranked.filter(r => (r.counts.WFO + r.counts.CLT) >= 12);
  const below4PerMonth = ranked.filter(r => (r.counts.WFO + r.counts.CLT) < 4);
  const fullyWFH = ranked.filter(r => r.counts.WFH > 0 && r.counts.WFO === 0 && r.counts.CLT === 0);

  useEffect(() => {
    getEmployees()
      .then((data) => setEmployees(data))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (!employees.length) return;
    getAttendanceForEmployees(employees.map(e => e.id))
      .then((data) => setAttendance(data))
      .catch(() => setAttendance({}));
  }, [employees]);

  // Export modal
  const [reportOpen, setReportOpen] = useState(false);

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
          <Button onClick={() => setReportOpen(true)}>
            <FileText className="h-4 w-4 mr-2" /> Full Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Employees" value={stats.total} icon={Users} accent="primary" />
        <div className="cursor-pointer" onClick={() => setMarkedTodayDialogOpen(true)}>
          <StatCard label="Marked Today" value={stats.marked} icon={CheckCircle2} accent="success"
            sub={`${stats.total > 0 ? Math.round(stats.marked / stats.total * 100) : 0}% completion`} />
        </div>
        <div className="cursor-pointer" onClick={() => setNotMarkedDialogOpen(true)}>
          <StatCard label="Not Marked" value={stats.notMarked} icon={AlertCircle} accent="warning" />
        </div>
      </div>

      <StackedTrendChart range={range} attendance={attendance} employeeIds={employees.map(e => e.id)} employees={employees} />

      {/* Leaderboard */}
      <Card className="card-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <div>
              <h3 className="font-bold">Leaderboard</h3>
              <p className="text-xs text-muted-foreground">
                {range.preset === "today" && `Today · ${format(range.from, "d MMM yyyy")}`}
                {range.preset === "week" && `This Week · ${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`}
                {range.preset === "month" && `${format(range.from, "MMMM yyyy")}`}
                {range.preset === "custom" && `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`}
              </p>
            </div>
          </div>
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
                  <th className="px-6 py-3 font-semibold text-center">Total Working Days</th>
                  <th className="px-6 py-3 font-semibold text-center">% of (WFO + CLT)</th>
                  <th className="px-6 py-3 font-semibold text-center">3 (WFO + CLT) per Week</th>
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
                    <td className="px-6 py-3.5 text-center font-semibold tabular-nums">{empTotalDays.get(r.emp.id) ?? 0}</td>
                    <td className="px-6 py-3.5 text-center font-semibold tabular-nums">
                      {officeMetrics.get(r.emp.id)?.officePct ?? 0}%
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`text-sm font-semibold ${
                          officeMetrics.get(r.emp.id)?.meetsThreePerWeek
                            ? "text-success"
                            : "text-muted-foreground"
                        }`}
                      >
                        {officeMetrics.get(r.emp.id)?.meetsThreePerWeek ? "Yes" : "No"}
                      </span>
                    </td>
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

      <FullReportAnalyticsDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        employees={employees}
        attendance={attendance}
        initialRange={range}
      />

      {/* Marked Today Dialog */}
      <Dialog open={markedTodayDialogOpen} onOpenChange={setMarkedTodayDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employees Marked Today</DialogTitle>
            <DialogDescription>
              {markedTodayEmployees.length} of {stats.total} employees marked attendance
            </DialogDescription>
          </DialogHeader>
          {markedTodayEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No employees marked today</p>
          ) : (
            <div className="space-y-2">
              {markedTodayEmployees.map(({ employee, status }) => (
                <div key={employee.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
                      style={{ background: employee.avatarColor }}>
                      {employee.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{employee.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">{employee.employeeId}</div>
                    </div>
                  </div>
                  {status && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                      background: STATUS_COLOR[status] + "20",
                      color: STATUS_COLOR[status]
                    }}>
                      {status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Not Marked Dialog */}
      <Dialog open={notMarkedDialogOpen} onOpenChange={setNotMarkedDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employees Not Marked Today</DialogTitle>
            <DialogDescription>
              {notMarkedTodayEmployees.length} of {stats.total} employees haven't marked attendance
            </DialogDescription>
          </DialogHeader>
          {notMarkedTodayEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">All employees marked today! 🎉</p>
          ) : (
            <div className="space-y-2">
              {notMarkedTodayEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                  <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
                    style={{ background: employee.avatarColor }}>
                    {employee.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{employee.fullName}</div>
                    <div className="text-[11px] text-muted-foreground">{employee.employeeId} • {employee.designation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
