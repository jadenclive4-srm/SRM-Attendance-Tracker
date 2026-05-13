import { format } from "date-fns";
import { dateKey, startOfWeek } from "./attendance";
import { AttendanceRecord, AttendanceStatus } from "./types";

export type RangePreset = "today" | "week" | "month" | "custom";

export interface DateRange {
  preset: RangePreset;
  from: Date;
  to: Date; // inclusive
}

export function rangeToday(): DateRange {
  const d = new Date(); d.setHours(0,0,0,0);
  return { preset: "today", from: d, to: d };
}
export function rangeThisWeek(): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = startOfWeek(today);
  const weekEnd = new Date(from);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(0, 0, 0, 0);
  const to = weekEnd > today ? today : weekEnd;
  return { preset: "week", from, to };
}
export function rangeThisMonth(): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(0, 0, 0, 0);
  const to = monthEnd > today ? today : monthEnd;
  return { preset: "month", from, to };
}

export function defaultRange(): DateRange { return rangeThisMonth(); }

export function inRange(date: string, r: DateRange) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const f = new Date(r.from); f.setHours(0,0,0,0);
  const t = new Date(r.to); t.setHours(23,59,59,999);
  return d >= f && d <= t;
}

export function filterRecords(records: AttendanceRecord[], r: DateRange) {
  return records.filter(rec => inRange(rec.date, r));
}

export function rangeLabel(r: DateRange) {
  if (r.preset === "today") return `Today · ${format(r.from, "d MMM yyyy")}`;
  if (r.preset === "week") return `This Week · ${format(r.from, "d MMM")} – ${format(r.to, "d MMM")}`;
  if (r.preset === "month") return `${format(r.from, "MMMM yyyy")}`;
  return `${format(r.from, "d MMM yyyy")} – ${format(r.to, "d MMM yyyy")}`;
}

export function rangeDays(r: DateRange): Date[] {
  const days: Date[] = [];
  const cur = new Date(r.from); cur.setHours(0,0,0,0);
  const end = new Date(r.to); end.setHours(0,0,0,0);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function dayDistribution(
  attendance: Record<string, AttendanceRecord[]>,
  employeeIds: string[],
  r: DateRange
) {
  const days = rangeDays(r);
  return days.map(d => {
    const key = dateKey(d);
    const counts: Record<AttendanceStatus | "NONE", number> = {
      WFO:0, WFH:0, CLT:0, PTO:0, HOL:0, NONE:0,
    };
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    employeeIds.forEach(id => {
      const rec = (attendance[id] || []).find(x => x.date === key);
      if (rec) counts[rec.status]++;
      else if (!isWeekend) counts.NONE++;
    });
    return {
      key,
      date: d,
      label: format(d, "dd MMM"),
      ...counts,
    };
  });
}
