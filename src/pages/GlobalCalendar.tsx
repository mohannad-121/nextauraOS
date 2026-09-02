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
          <div className="flex items-center gap-2">
            {['all', 'Finance', 'HR', 'Marketing'].map((mod) => (
              <button
                key={mod}
                onClick={() => setFilterModule(mod)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterModule === mod
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {mod === 'all' ? 'All Events' : mod}
              </button>
            ))}
          </div>
        }
      />

      {/* Month Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-slate-100 font-heading">September 2026</h2>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Month Grid */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold uppercase text-slate-500 pb-2 border-b border-slate-800">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs">
          {days.map((day) => {
            const dateStr = `2026-09-${day.toString().padStart(2, '0')}`;
            const dayEvents = filteredEvents.filter((e) => e.date === dateStr);

            return (
              <div key={day} className="min-h-[100px] p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between space-y-1">
                <span className="font-mono font-bold text-slate-400 text-[11px]">{day}</span>

                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] truncate font-semibold"
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
