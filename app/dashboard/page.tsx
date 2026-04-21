"use client";

import { useEffect, useState } from "react";
import { Clock, Activity, Target } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

type WorkSession = {
  id: string;
  userId: string;
  clockInAt: string;
  clockOutAt?: string;
};

type AnalyticsResponse = {
  success: boolean;
  data: {
    userId: string;
    workSeconds: number;
    activeSeconds: number;
    productivityPercent: number;
    totalMouseMoves: number;
    totalKeyPresses: number;
    sessions: WorkSession[];
  };
};

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
};

const formatSessionTime = (value?: string): string => {
  if (!value) return "--:--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const sessionDurationSeconds = (session: WorkSession, rangeEnd: Date): number => {
  const start = new Date(session.clockInAt);
  const end = session.clockOutAt ? new Date(session.clockOutAt) : rangeEnd;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
};

export default function DashboardOverview() {
  const { authHeaders, apiBase, selectedUserId, dateRange } = useAuth();
  const [loading, setLoading] = useState(true);

  const [workSeconds, setWorkSeconds] = useState(0);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [productivity, setProductivity] = useState(0);
  const [sessions, setSessions] = useState<WorkSession[]>([]);

  useEffect(() => {
    if (!authHeaders || !selectedUserId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          userId: selectedUserId,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        });
        const response = await fetch(`${apiBase}/api/web/dashboard/analytics?` + queryParams.toString(), {
          headers: authHeaders,
        });
        const result = (await response.json()) as AnalyticsResponse;
        if (result.success) {
          setWorkSeconds(result.data.workSeconds);
          setActiveSeconds(result.data.activeSeconds);
          setProductivity(result.data.productivityPercent);
          setSessions(result.data.sessions);
        } else {
          setWorkSeconds(0);
          setActiveSeconds(0);
          setProductivity(0);
          setSessions([]);
        }
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, [authHeaders, apiBase, selectedUserId, dateRange]);

  if (loading) {
    return <div className="text-slate-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex items-center shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-indigo-50">
            <Clock className="h-7 w-7 text-indigo-600" />
          </div>
          <div className="ml-5">
            <h3 className="text-sm font-medium text-slate-500">Total Work Hours</h3>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatDuration(workSeconds)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex items-center shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-50">
            <Activity className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="ml-5">
            <h3 className="text-sm font-medium text-slate-500">Active Hours</h3>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatDuration(activeSeconds)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex items-center shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-amber-50">
            <Target className="h-7 w-7 text-amber-600" />
          </div>
          <div className="ml-5">
            <h3 className="text-sm font-medium text-slate-500">Productivity</h3>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Math.round(productivity)}%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">Session History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Clock In</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Clock Out</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {new Date(session.clockInAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatSessionTime(session.clockInAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatSessionTime(session.clockOutAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                    {formatDuration(sessionDurationSeconds(session, dateRange.endDate))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {session.clockOutAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Completed</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    No active or past sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
