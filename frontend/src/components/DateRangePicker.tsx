import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange, rangeLabel, rangeThisMonth, rangeThisWeek, rangeToday } from "@/lib/dateRange";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
}

const PRESETS = [
  { id: "today", label: "Today", build: rangeToday },
  { id: "week", label: "This Week", build: rangeThisWeek },
  { id: "month", label: "This Month", build: rangeThisMonth },
] as const;

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value.to);

  const apply = () => {
    if (tempFrom && tempTo) {
      const f = tempFrom <= tempTo ? tempFrom : tempTo;
      const t = tempFrom <= tempTo ? tempTo : tempFrom;
      onChange({ preset: "custom", from: f, to: t });
      setOpen(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-sm">
      {PRESETS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.build())}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
            value.preset === p.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {p.label}
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              value.preset === "custom"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {value.preset === "custom"
              ? `${format(value.from, "d MMM")} – ${format(value.to, "d MMM")}`
              : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Pick a custom range</p>
            <Calendar
              mode="range"
              selected={{ from: tempFrom, to: tempTo }}
              onSelect={(r: any) => {
                setTempFrom(r?.from);
                setTempTo(r?.to);
              }}
              numberOfMonths={2}
              className={cn("p-0 pointer-events-auto")}
            />
            <div className="flex justify-end gap-2 mt-3 border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={apply} disabled={!tempFrom || !tempTo}>Apply</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function RangeContext({ value }: { value: DateRange }) {
  return (
    <p className="text-xs text-muted-foreground">
      Showing data for: <span className="font-semibold text-foreground">{rangeLabel(value)}</span>
    </p>
  );
}
