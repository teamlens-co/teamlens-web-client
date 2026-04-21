"use client";

import { useState } from "react";
import { useAuth, Role } from "../../../contexts/AuthContext";
import { Mail, Check, AlertCircle, Copy, Key, Shield } from "lucide-react";

export default function TeamManagement() {
  const { user, authHeaders, apiBase } = useAuth();
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("EMPLOYEE");
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteLink: string } | null>(null);
  const [inviteError, setInviteError] = useState("");

  const [agentLabel, setAgentLabel] = useState("Desktop Agent");
  const [loadingToken, setLoadingToken] = useState(false);
  const [agentTokenResult, setAgentTokenResult] = useState<{ agentToken: string } | null>(null);
  const [tokenError, setTokenError] = useState("");

  if (user?.role !== "MANAGER") {
    // Only Managers can invite or generate tokens
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[28px] border border-slate-200">
        <Shield className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500 mt-2">Only organization managers have access to Team settings.</p>
      </div>
    );
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authHeaders) return;

    setLoadingInvite(true);
    setInviteResult(null);
    setInviteError("");

    try {
      const response = await fetch(`${apiBase}/api/web/invites`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await response.json();
      if (data.success) {
        setInviteResult(data.data);
        setInviteEmail("");
      } else {
        setInviteError(data.message || "Failed to create invite");
      }
    } catch {
      setInviteError("Network error occurred.");
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleGenerateAgentToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authHeaders) return;

    setLoadingToken(true);
    setAgentTokenResult(null);
    setTokenError("");

    try {
      const response = await fetch(`${apiBase}/api/web/auth/agent-token`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ label: agentLabel }),
      });
      const data = await response.json();
      if (data.success) {
        setAgentTokenResult(data.data);
      } else {
        setTokenError(data.message || "Failed to generate token");
      }
    } catch {
      setTokenError("Network error occurred.");
    } finally {
      setLoadingToken(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Invite Member Section */}
      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center">
          <Mail className="w-5 h-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-slate-900">Invite Team Member</h3>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm text-slate-500 mb-6">Create an invite link to onboard a new employee or another manager to your organization.</p>
          
          <form onSubmit={handleCreateInvite} className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loadingInvite}
              className="w-full sm:w-auto rounded-[14px] bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-600/20 disabled:bg-indigo-300 disabled:shadow-none"
            >
              {loadingInvite ? "Creating..." : "Create Invite"}
            </button>
          </form>

          {inviteError && (
            <div className="mt-4 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2" />
              {inviteError}
            </div>
          )}

          {inviteResult && (
            <div className="mt-6 rounded-xl bg-green-50 border border-green-100 p-5">
              <div className="flex items-start">
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="ml-3 flex-1 text-sm text-green-800">
                  <p className="font-medium">Invite generated successfully!</p>
                  <div className="mt-3 flex items-center rounded-lg bg-green-100/50 p-1">
                    <input
                      type="text"
                      className="block w-full bg-transparent border-0 py-1.5 px-3 text-green-900 focus:ring-0 text-xs sm:text-sm font-mono"
                      readOnly
                      value={inviteResult.inviteLink}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteResult.inviteLink)}
                      className="ml-2 inline-flex items-center rounded bg-white px-2 py-1 flex-shrink-0 border border-green-200 text-green-700 hover:bg-green-50 shadow-sm transition-colors cursor-pointer"
                    >
                      <Copy className="h-3 w-3 mr-1.5" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Agent Token Section */}
      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center">
          <Key className="w-5 h-5 text-emerald-600 mr-2" />
          <h3 className="text-lg font-semibold text-slate-900">Desktop Agent Token</h3>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm text-slate-500 mb-6">Generate a secure token for an employee to log into the Desktop Agent without using a password.</p>
          
          <form onSubmit={handleGenerateAgentToken} className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Device/User Label</label>
              <input
                type="text"
                required
                className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                placeholder="e.g. John's MacBook"
                value={agentLabel}
                onChange={(e) => setAgentLabel(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loadingToken}
              className="w-full sm:w-auto flex-shrink-0 rounded-[14px] bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-600/20 disabled:bg-emerald-300 disabled:shadow-none"
            >
              {loadingToken ? "Generating..." : "Generate Token"}
            </button>
          </form>

          {tokenError && (
            <div className="mt-4 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2" />
              {tokenError}
            </div>
          )}

          {agentTokenResult && (
            <div className="mt-6 rounded-xl bg-orange-50 border border-orange-100 p-5">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="ml-3 flex-1 text-sm text-orange-800">
                  <p className="font-medium text-orange-900">Provide this token to the user</p>
                  <p className="mt-1">This token will expire quickly and will only be shown once.</p>
                  <div className="mt-3 flex items-center rounded-lg bg-white border border-orange-200 p-1">
                    <input
                      type="text"
                      className="block w-full bg-transparent border-0 py-1.5 px-3 text-slate-800 focus:ring-0 text-xs sm:text-base font-mono"
                      readOnly
                      value={agentTokenResult.agentToken}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(agentTokenResult.agentToken)}
                      className="ml-2 inline-flex items-center rounded bg-orange-100 px-3 py-1.5 flex-shrink-0 border border-orange-200 text-orange-700 hover:bg-orange-200 shadow-sm transition-colors font-medium cursor-pointer"
                    >
                      <Copy className="h-4 w-4 mr-1.5" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
