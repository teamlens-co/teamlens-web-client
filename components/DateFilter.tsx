"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";

export type DateRange = {
  label: string;
  startDate: Date;
  endDate: Date;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const PRESETS = [
  "Today",
  "Yesterday",
  "This Week",
  "Last 7 Days",
  "Previous Week",
  "This Month",
  "Previous Month",
  "Last 3 Months",
  "Last 6 Months",
];

export const getPresetRange = (label: string): DateRange => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (label) {
    case "Today":
      start.setHours(0, 0, 0, 0);
      // Keep end as 'now' so active sessions count time up to this moment.
      // Setting 23:59:59 makes backend think the range is in the future and breaks isCurrentRange.
      break;
    case "Yesterday":
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);   end.setHours(23, 59, 59, 999);
      break;
    case "This Week": {
      const d = start.getDay();
      start.setDate(start.getDate() - (d === 0 ? 6 : d - 1));
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "Last 7 Days":
      start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "Previous Week": {
      const d = start.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (d === 0 ? 6 : d - 1));
      end.setTime(mon.getTime() - 1);
      start.setTime(mon.getTime()); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
      break;
    }
    case "This Month":
      start.setDate(1); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "Previous Month":
      start.setMonth(now.getMonth() - 1, 1); start.setHours(0, 0, 0, 0);
      end.setDate(0); end.setHours(23, 59, 59, 999);
      break;
    case "Last 3 Months":
      start.setMonth(now.getMonth() - 3); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "Last 6 Months":
      start.setMonth(now.getMonth() - 6); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }
  return { label, startDate: start, endDate: end };
};

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function DateFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); // 0-based
  // staging state — only committed on Apply
  const [staged, setStaged] = useState<DateRange>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // reset staging when popup opens
  useEffect(() => {
    if (open) {
      setStaged(value);
      setCalYear(value.startDate.getFullYear());
      setCalMonth(value.startDate.getMonth());
    }
  }, [open, value]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // apply and close
  const apply = () => { onChange(staged); setOpen(false); };
  const cancel = () => setOpen(false);

  const selectPreset = (label: string) => setStaged(getPresetRange(label));

  const selectDay = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    const e = new Date(calYear, calMonth, day);
    e.setHours(23, 59, 59, 999);
    setStaged({ label: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), startDate: d, endDate: e });
  };

  // calendar grid helpers
  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  const prevCal = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextCal = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

  const stagedKey = toDateKey(staged.startDate);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <CalendarIcon className="h-4 w-4 text-indigo-500" />
        {value.label}
      </button>

      {/* POPOVER */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 origin-top-right rounded-2xl bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-slate-100 w-[540px]">
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">CALENDAR</span>
          </div>

          <div className="flex">
            {/* LEFT: calendar */}
            <div className="flex-1 p-4 border-r border-slate-100">
              {/* month nav */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevCal} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-slate-500" />
                </button>
                <span className="text-sm font-bold text-slate-700">
                  {MONTHS[calMonth].toUpperCase().slice(0, 3)} {calYear}
                  <ChevronLeft className="inline h-3 w-3 ml-1 text-slate-400 rotate-[-90deg]" />
                </span>
                <button onClick={nextCal} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              {/* day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map((d, i) => (
                  <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                ))}
              </div>

              {/* day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === stagedKey;
                  const isFuture = dateKey > todayKey;

                  return (
                    <button
                      key={day}
                      onClick={() => !isFuture && selectDay(day)}
                      disabled={isFuture}
                      className={[
                        "h-8 w-full flex items-center justify-center rounded-full text-sm font-medium transition-all",
                        isFuture ? "text-slate-200 cursor-not-allowed" : "hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer",
                        isSelected ? "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white" : "",
                        isToday && !isSelected ? "font-extrabold text-slate-900 ring-2 ring-indigo-400" : "",
                        !isSelected && !isToday ? "text-slate-700" : "",
                      ].join(" ")}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: preset filters */}
            <div className="w-44 py-3 px-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Preset Filters</p>
              <div className="space-y-0.5">
                {PRESETS.map(preset => {
                  const isActive = staged.label === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => selectPreset(preset)}
                      className={[
                        "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between",
                        isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      ].join(" ")}
                    >
                      {preset}
                      {isActive && <Check className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-100">
            <button
              onClick={cancel}
              className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
