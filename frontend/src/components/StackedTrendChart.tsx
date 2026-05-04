import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ATTENDANCE, EMPLOYEES } from "@/lib/mockData";
import { AttendanceStatus, STATUS_COLOR, STATUS_BADGE } from "@/lib/types";
import { DateRange, dayDistribution } from "@/lib/dateRange";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

const KEYS: (AttendanceStatus | "NONE")[] = ["WFO","WFH","CLT","PTO","HOL","NONE"];
const COLOR: Record<string, string> = {
  ...STATUS_COLOR,
  NONE: "hsl(var(--muted-foreground) / 0.35)",
};
const LABEL: Record<string, string> = {
  WFO: "WFO", WFH: "WFH", CLT: "CLT", PTO: "PTO", HOL: "HOL", NONE: "Not Marked",
};

interface Props {
  range: DateRange;
}

export default function StackedTrendChart({ range }: Props) {
  const data = useMemo(
    () => dayDistribution(ATTENDANCE, EMPLOYEES.map(e => e.id), range),
    [range]
  );
  const [drill, setDrill] = useState<typeof data[number] | null>(null);

  const totalEmployees = EMPLOYEES.length;

  return (
    <Card className="card-soft p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold">Daily Attendance Trend</h3>
          <p className="text-xs text-muted-foreground">
            Stacked counts by status · click a bar for details
          </p>
        </div>
      </div>
      <div className="h-80">
        {data.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              onClick={(e: any) => {
                const idx = e?.activeTooltipIndex;
                if (typeof idx === "number" && data[idx]) setDrill(data[idx]);
              }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v: any, n: any) => [v, LABEL[n] ?? n]}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(v) => LABEL[v as string] ?? v}
              />
              {KEYS.map((k, i) => (
                <Bar
                  key={k}
                  dataKey={k}
                  name={k}
                  stackId="a"
                  fill={COLOR[k]}
                  radius={i === KEYS.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  cursor="pointer"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="sm:max-w-md">
          {drill && (
            <>
              <DialogHeader>
                <DialogTitle>{format(drill.date, "EEEE · d MMM yyyy")}</DialogTitle>
                <DialogDescription>
                  Attendance breakdown across {totalEmployees} employees
                </DialogDescription>
              </DialogHeader>
              <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {KEYS.map(k => {
                  const v = (drill as any)[k] as number;
                  const pct = totalEmployees ? Math.round((v / totalEmployees) * 100) : 0;
                  return (
                    <li key={k} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[k] }} />
                        <span className="text-sm font-medium">{LABEL[k]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                        <span className="text-sm font-bold tabular-nums w-8 text-right">{v}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
