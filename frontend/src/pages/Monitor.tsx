import { useMemo, useState } from "react";
import { ATTENDANCE, EMPLOYEES } from "@/lib/mockData";
import { Employee, AttendanceStatus, DESIGNATION_RANK, STATUS_BADGE, STATUS_COLOR } from "@/lib/types";
import { countByStatus, isSameMonth } from "@/lib/attendance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, ArrowLeft, Download, FileText, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export default function Monitor() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);

  const list = useMemo(() => {
    return [...EMPLOYEES]
      .sort((a, b) => DESIGNATION_RANK[b.designation] - DESIGNATION_RANK[a.designation])
      .filter(e =>
        e.fullName.toLowerCase().includes(q.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(q.toLowerCase()) ||
        e.team.toLowerCase().includes(q.toLowerCase())
      );
  }, [q]);

  if (selected) return <EmployeeDetail emp={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and inspect individual attendance.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, ID, team…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="card-soft p-16 text-center">
          <p className="text-sm text-muted-foreground">No employees match your search.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(e => {
            const c = countByStatus((ATTENDANCE[e.id] || []).filter(r => isSameMonth(r.date)));
            return (
              <button key={e.id} onClick={() => setSelected(e)}
                className="card-soft p-5 text-left hover:shadow-elevated hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl grid place-items-center text-sm font-bold text-white"
                    style={{ background: e.avatarColor }}>
                    {e.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{e.fullName}</div>
                    <div className="text-xs text-muted-foreground">{e.designation} · {e.team}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
                  {(["WFO","WFH","CLT","PTO"] as AttendanceStatus[]).map(k => (
                    <div key={k} className="text-center">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{k}</div>
                      <div className="text-sm font-bold mt-0.5" style={{ color: STATUS_COLOR[k] }}>{c[k]}</div>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmployeeDetail({ emp, onBack }: { emp: Employee; onBack: () => void }) {
  const records = (ATTENDANCE[emp.id] || []).slice().sort((a,b) => b.date.localeCompare(a.date));
  const monthCounts = countByStatus(records.filter(r => isSameMonth(r.date)));
  const pie = (Object.keys(monthCounts) as AttendanceStatus[])
    .filter(k => monthCounts[k] > 0)
    .map(k => ({ name: k, value: monthCounts[k] }));

  // Last 6 months bars
  const months = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const recs = records.filter(r => {
        const dt = new Date(r.date);
        return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
      });
      const c = countByStatus(recs);
      arr.push({ name: format(d, "MMM"), WFO: c.WFO, WFH: c.WFH, CLT: c.CLT, PTO: c.PTO });
    }
    return arr;
  }, [records]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to directory
      </Button>

      <Card className="card-soft overflow-hidden">
        <div className="h-24 bg-gradient-primary" />
        <div className="px-8 pb-6 -mt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 rounded-2xl border-4 border-card grid place-items-center text-xl font-bold text-white shadow-elevated"
                style={{ background: emp.avatarColor }}>
                {emp.fullName.split(" ").map(n => n[0]).slice(0,2).join("")}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold">{emp.fullName}</h2>
                <p className="text-sm text-muted-foreground">{emp.employeeId} · {emp.designation} · {emp.team}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success("Individual attendance PDF generated")}>
                <Download className="h-4 w-4 mr-2" /> Individual PDF
              </Button>
              <Button size="sm" onClick={() => toast.success("Monthly report PDF generated")}>
                <FileText className="h-4 w-4 mr-2" /> Monthly Report
              </Button>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {emp.email}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {emp.phone}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {emp.city}, {emp.state}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["WFO","WFH","CLT","PTO"] as AttendanceStatus[]).map(k => (
          <div key={k} className="card-soft p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{k}</p>
            <p className="text-2xl font-bold mt-1.5" style={{ color: STATUS_COLOR[k] }}>{monthCounts[k]}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="card-soft p-6 lg:col-span-2">
          <h3 className="font-bold mb-1">Last 6 Months</h3>
          <p className="text-xs text-muted-foreground mb-4">Stacked status counts</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={months} margin={{ top: 8, right: 8, left: -16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="WFO" stackId="a" fill={STATUS_COLOR.WFO} />
                <Bar dataKey="WFH" stackId="a" fill={STATUS_COLOR.WFH} />
                <Bar dataKey="CLT" stackId="a" fill={STATUS_COLOR.CLT} />
                <Bar dataKey="PTO" stackId="a" fill={STATUS_COLOR.PTO} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-6">
          <h3 className="font-bold mb-1">This Month</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {pie.map(p => <Cell key={p.name} fill={STATUS_COLOR[p.name as AttendanceStatus]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="card-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold">Attendance Statement</h3>
          <p className="text-xs text-muted-foreground">{records.length} records</p>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Day</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.date} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{format(new Date(r.date), "dd MMM yyyy")}</td>
                  <td className="px-6 py-3 text-muted-foreground">{format(new Date(r.date), "EEEE")}</td>
                  <td className="px-6 py-3"><span className={STATUS_BADGE[r.status]}>{r.status}</span></td>
                  <td className="px-6 py-3 text-right text-muted-foreground tabular-nums">{format(new Date(r.markedAt), "hh:mm a")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
