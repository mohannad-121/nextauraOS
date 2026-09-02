import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Coffee,
  Monitor,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

export const AttendanceApp: React.FC = () => {
  const {
    attendanceRecords,
    clockInAttendance,
    startBreakAttendance,
    endBreakAttendance,
    clockOutAttendance,
    user,
  } = useApp();

  const [isKioskMode, setIsKioskMode] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [kioskStatusMessage, setKioskStatusMessage] = useState('');

  // Live Clock State
  const [secondsWorked, setSecondsWorked] = useState(13338);

  const activeUserRecord = attendanceRecords.find(
    (r) => r.employeeName === user.name && (r.status === 'Working' || r.status === 'On Break')
  );

  const isCurrentlyWorking = !!activeUserRecord;
  const isOnBreak = activeUserRecord?.status === 'On Break';

  useEffect(() => {
    let interval: any = null;
    if (isCurrentlyWorking && !isOnBreak) {
      interval = setInterval(() => {
        setSecondsWorked((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCurrentlyWorking, isOnBreak]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleClock = () => {
    if (isCurrentlyWorking) {
      clockOutAttendance(activeUserRecord.id);
    } else {
      clockInAttendance('Office');
    }
  };

  const handleToggleBreak = () => {
    if (!activeUserRecord) return;
    if (isOnBreak) {
      endBreakAttendance(activeUserRecord.id);
    } else {
      startBreakAttendance(activeUserRecord.id);
    }
  };

  const handleKioskSubmit = () => {
    if (pinCode.length >= 4) {
      clockInAttendance('Office');
      setKioskStatusMessage(`Clock-in successful for PIN ${pinCode}! Welcome to San Francisco HQ.`);
      setPinCode('');
      setTimeout(() => setKioskStatusMessage(''), 3000);
    }
  };

  if (isKioskMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-8">
        <button
          onClick={() => setIsKioskMode(false)}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-100"
        >
          Exit Kiosk Mode
        </button>

        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <Monitor className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black font-heading">San Francisco HQ Attendance Kiosk</h1>
          <p className="text-xs text-slate-400">Enter your 4-digit employee PIN or tap badge to check in.</p>
        </div>

        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 w-full max-w-sm">
          {kioskStatusMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
              {kioskStatusMessage}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center font-mono text-3xl font-black tracking-widest text-cyan-400">
            {pinCode.padEnd(4, '•')}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') setPinCode('');
                  else if (btn === 'OK') handleKioskSubmit();
                  else if (pinCode.length < 4) setPinCode((prev) => prev + btn);
                }}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-base font-bold text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Live Attendance & Time Tracking"
        subtitle="Real-time employee check-ins, working hours timer, break management & attendance logs."
        actions={
          <button
            onClick={() => setIsKioskMode(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2"
          >
            <Monitor className="w-4 h-4 text-cyan-400" />
            Launch Kiosk Mode
          </button>
        }
      />

      {/* Live Clock-In Action Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Session Timer</span>
            <span className="text-3xl font-black font-mono text-cyan-400 tracking-wider">
              {formatTimer(secondsWorked)}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-100 font-heading">
                {isCurrentlyWorking ? (isOnBreak ? `On Break — ${user.name}` : `Checked In — ${user.name}`) : 'Ready to Start Work Day'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Work Location: San Francisco HQ (Office IP 192.168.1.1)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCurrentlyWorking && (
            <button
              onClick={handleToggleBreak}
              className={`px-4 py-3 rounded-2xl text-xs font-bold border flex items-center gap-2 transition-all ${
                isOnBreak
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Coffee className="w-4 h-4" />
              {isOnBreak ? 'End Break' : 'Take Break'}
            </button>
          )}

          <button
            onClick={handleToggleClock}
            className={`px-6 py-3.5 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 transition-transform hover:scale-105 ${
              isCurrentlyWorking
                ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {isCurrentlyWorking ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                Clock Out
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Clock In Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Checked In Today" value={attendanceRecords.length} comparisonText="staff active" accentColor="cyan" />
        <StatCard title="On Time Rate" value="98.2%" change={1.4} accentColor="emerald" />
        <StatCard title="Late Arrivals" value="1" comparisonText="this week" accentColor="amber" />
        <StatCard title="Overtime Accrued" value="14.5 Hrs" comparisonText="month to date" accentColor="indigo" />
      </div>

      {/* Attendance Records Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-100 font-heading">
          Today's Attendance Logs
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Employee</th>
                <th className="p-4 text-start">Check In</th>
                <th className="p-4 text-start">Check Out</th>
                <th className="p-4 text-center">Worked Hours</th>
                <th className="p-4 text-center">Location</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {attendanceRecords.map((att) => (
                <tr key={att.id} className="hover:bg-slate-800/40">
                  <td className="p-4 flex items-center gap-2.5">
                    <img src={att.employeeAvatar} alt="" className="w-7 h-7 rounded-xl object-cover" />
                    <div>
                      <div className="font-semibold text-slate-100">{att.employeeName}</div>
                      <div className="text-[10px] text-slate-400">{att.department}</div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-cyan-400 font-bold">{att.checkIn}</td>
                  <td className="p-4 font-mono text-slate-400">{att.checkOut || 'In Session'}</td>
                  <td className="p-4 text-center font-mono font-bold text-slate-200">{att.workedHours} hrs</td>
                  <td className="p-4 text-center text-slate-400">{att.locationType}</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      {att.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
