"use client";

import { useEffect, useState } from "react";
import { Clock, Activity, Target, MapPin } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import LiveScreenViewer from "../../components/LiveScreenViewer";

type WorkSession = {
  id: string;
  userId: string;
  clockInAt: string;
  clockOutAt?: string;
  locationType?: "office" | "remote";
  latitude?: number;
  longitude?: number;
};

type AnalyticsResponse = {
  success: boolean;
  data: {
    userId: string;
    workSeconds: number;
    activeSeconds: number;
    manualSeconds: number;
    productivityPercent: number;
    totalMouseMoves: number;
    totalKeyPresses: number;
    sessions: WorkSession[];
    locationStatus: string | null;
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

const formatCoordinate = (value?: number): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(6);
};

const LocationBadge = ({ type }: { type?: string }) => {
  if (!type) return <span className="text-slate-400 text-xs">—</span>;

  const styles: Record<string, string> = {
    office: "bg-blue-100 text-blue-800",
    remote: "bg-orange-100 text-orange-800",
    manual: "bg-purple-100 text-purple-800",
  };

  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] ?? "bg-slate-100 text-slate-700"}`}>
      {label}
    </span>
  );
};

const LocationStatusCard = ({ status }: { status: string | null }) => {
  const getStatusConfig = (s: string | null) => {
    switch (s) {
      case "Office":
        return { color: "bg-blue-50", iconColor: "text-blue-600", textColor: "text-blue-800", gradient: "from-blue-500 to-blue-600" };
      case "Remote":
        return { color: "bg-orange-50", iconColor: "text-orange-600", textColor: "text-orange-800", gradient: "from-orange-500 to-orange-600" };
      case "Mixed":
        return { color: "bg-purple-50", iconColor: "text-purple-600", textColor: "text-purple-800", gradient: "from-purple-500 to-violet-600" };
      default:
        return { color: "bg-slate-50", iconColor: "text-slate-400", textColor: "text-slate-500", gradient: "from-slate-400 to-slate-500" };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex items-center shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${config.color}`}>
        <MapPin className={`h-7 w-7 ${config.iconColor}`} />
      </div>
      <div className="ml-5">
        <h3 className="text-sm font-medium text-slate-500">Location</h3>
        {status ? (
          <p className={`mt-1 text-2xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>{status}</p>
        ) : (
          <p className="mt-1 text-2xl font-bold text-slate-300">—</p>
        )}
      </div>
    </div>
  );
};

export default function DashboardOverview() {
  const { authHeaders, apiBase, selectedUserId, dateRange, user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [workSeconds, setWorkSeconds] = useState(0);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [manualSeconds, setManualSeconds] = useState(0);
  const [productivity, setProductivity] = useState(0);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

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
          credentials: "include",
        });
        const result = (await response.json()) as AnalyticsResponse;
        if (result.success) {
          setWorkSeconds(result.data.workSeconds);
          setActiveSeconds(result.data.activeSeconds);
          setManualSeconds(result.data.manualSeconds || 0);
          setProductivity(result.data.productivityPercent);
          setSessions(result.data.sessions);
          setLocationStatus(result.data.locationStatus ?? null);
        } else {
          setWorkSeconds(0);
          setActiveSeconds(0);
          setManualSeconds(0);
          setProductivity(0);
          setSessions([]);
          setLocationStatus(null);
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
      {user?.role === "MANAGER" && (
        <LiveScreenViewer employeeId={selectedUserId} disabled={!selectedUserId || selectedUserId === user.id} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-purple-50">
            <Clock className="h-7 w-7 text-purple-600" />
          </div>
          <div className="ml-5">
            <h3 className="text-sm font-medium text-slate-500">Manual Hours</h3>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatDuration(manualSeconds)}</p>
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

        <LocationStatusCard status={locationStatus} />
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
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Coordinates</th>
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
                    <LocationBadge type={session.locationType} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                    {formatCoordinate(session.latitude)}, {formatCoordinate(session.longitude)}
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
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
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
