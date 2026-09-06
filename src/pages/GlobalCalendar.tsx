import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';

export const GlobalCalendar: React.FC = () => {
  const { calendarEvents } = useApp();
  const [filterModule, setFilterModule] = useState('all');

  const filteredEvents = calendarEvents.filter(
    (ev) => filterModule === 'all' || ev.module.toLowerCase() === filterModule.toLowerCase()
  );

  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Unified Global Company Calendar"
        subtitle="Cross-module calendar aggregating HR leave, payroll dates, marketing launches, board meetings & sign deadlines."
        actions={
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {['all', 'Finance', 'HR', 'Marketing'].map((mod) => (
              <button
                key={mod}
                onClick={() => setFilterModule(mod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterModule === mod
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {mod === 'all' ? 'All Events' : mod}
              </button>
            ))}
          </div>
        }
      />

      {/* Month Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">September 2026</h2>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Month Grid */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs">
          {days.map((day) => {
            const dateStr = `2026-09-${day.toString().padStart(2, '0')}`;
            const dayEvents = filteredEvents.filter((e) => e.date === dateStr);

            return (
              <div key={day} className="min-h-[100px] p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between space-y-1">
                <span className="font-mono font-semibold text-slate-400 dark:text-slate-500 text-[11px]">{day}</span>

                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[10px] truncate font-medium shadow-2xs"
                      style={{ color: ev.color }}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
