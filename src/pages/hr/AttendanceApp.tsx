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
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';

export const AttendanceApp: React.FC = () => {
  const {
    activeSubView,
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

  useEffect(() => {
    if (activeSubView === 'kiosk') {
      setIsKioskMode(true);
    } else {
      setIsKioskMode(false);
    }
  }, [activeSubView]);

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 space-y-8">
        <button
          onClick={() => setIsKioskMode(false)}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm"
        >
          Exit Kiosk Mode
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto">
            <Monitor className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">San Francisco HQ Attendance Kiosk</h1>
          <p className="text-xs text-slate-500">Enter your 4-digit employee PIN or tap badge to check in.</p>
        </div>

        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 w-full max-w-sm">
          {kioskStatusMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center">
              {kioskStatusMessage}
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-center font-mono text-3xl font-bold tracking-widest text-slate-900 dark:text-slate-100">
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
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-base font-bold text-slate-900 dark:text-slate-100 transition-colors"
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Live Attendance & Time Tracking"
        subtitle="Real-time employee check-ins, working hours timer, break management & attendance logs."
        actions={
          <Button
            onClick={() => setIsKioskMode(true)}
            variant="secondary"
            size="sm"
            icon={<Monitor className="w-4 h-4" />}
          >
            Launch Kiosk Mode
          </Button>
        }
      />

      {/* Live Clock-In Action Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Session Timer</span>
            <span className="text-3xl font-bold font-mono text-blue-600 dark:text-blue-400 tracking-wider">
              {formatTimer(secondsWorked)}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isCurrentlyWorking ? (isOnBreak ? `On Break — ${user.name}` : `Checked In — ${user.name}`) : 'Ready to Start Work Day'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Work Location: San Francisco HQ (Office IP 192.168.1.1)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCurrentlyWorking && (
            <Button
              onClick={handleToggleBreak}
              variant={isOnBreak ? "secondary" : "secondary"}
              size="md"
              icon={<Coffee className="w-4 h-4" />}
            >
              {isOnBreak ? 'End Break' : 'Take Break'}
            </Button>
          )}

          <Button
            onClick={handleToggleClock}
            variant={isCurrentlyWorking ? "danger" : "primary"}
            size="md"
            icon={isCurrentlyWorking ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          >
            {isCurrentlyWorking ? 'Clock Out' : 'Clock In Now'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Checked In Today" value={attendanceRecords.length} comparisonText="staff active" accentColor="azure" />
        <StatCard title="On Time Rate" value="98.2%" change={1.4} accentColor="emerald" />
        <StatCard title="Late Arrivals" value="1" comparisonText="this week" accentColor="amber" />
        <StatCard title="Overtime Accrued" value="14.5 Hrs" comparisonText="month to date" accentColor="indigo" />
      </div>

      {/* Attendance Records Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-semibold text-xs text-slate-900 dark:text-slate-100">
          Today's Attendance Logs
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="p-3.5 text-start">Employee</th>
                <th className="p-3.5 text-start">Check In</th>
                <th className="p-3.5 text-start">Check Out</th>
                <th className="p-3.5 text-center">Worked Hours</th>
                <th className="p-3.5 text-center">Location</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {attendanceRecords.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 flex items-center gap-2.5">
                    <Avatar src={att.employeeAvatar} name={att.employeeName} className="w-7 h-7 rounded-lg text-xs" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{att.employeeName}</div>
                      <div className="text-[11px] text-slate-500">{att.department}</div>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-blue-600 dark:text-blue-400 font-semibold">{att.checkIn}</td>
                  <td className="p-3.5 font-mono text-slate-500">{att.checkOut || 'In Session'}</td>
                  <td className="p-3.5 text-center font-mono font-semibold text-slate-900 dark:text-slate-100">{att.workedHours} hrs</td>
                  <td className="p-3.5 text-center text-slate-500">{att.locationType}</td>
                  <td className="p-3.5 text-center">
                    <StatusBadge status={att.status} />
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
