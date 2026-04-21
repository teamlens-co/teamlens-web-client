"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function ManagerSignInPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [loadingAuth, setLoadingAuth] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const apiBase = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
    return envBase && envBase.length > 0 ? envBase.replace(/\/$/, "") : "http://localhost:5000";
  }, []);

  // Check if already authenticated on mount
  useEffect(() => {
    const storedToken = window.localStorage.getItem("teamlens_manager_token");
    if (storedToken) {
      // Validate token before redirecting
      fetch(`${apiBase}/api/web/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            router.replace("/dashboard");
          } else {
            window.localStorage.removeItem("teamlens_manager_token");
            setIsCheckingSession(false);
          }
        })
        .catch(() => setIsCheckingSession(false));
    } else {
      setIsCheckingSession(false);
    }
  }, [apiBase, router]);

  const onAuthSuccess = (accessToken: string) => {
    window.localStorage.setItem("teamlens_manager_token", accessToken);
    setStatusMessage("Login successful! Redirecting...");
    router.push("/dashboard");
  };

  const login = async () => {
    setLoadingAuth(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${apiBase}/api/web/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const payload = await response.json();

      if (response.ok && payload.success) {
        onAuthSuccess(payload.data.accessToken);
      } else {
        setStatusMessage(`Error: ${payload.message ?? "Invalid credentials"}`);
        setLoadingAuth(false);
      }
    } catch {
      setStatusMessage("Failed to connect to the server.");
      setLoadingAuth(false);
    }
  };

  const signup = async () => {
    setLoadingAuth(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${apiBase}/api/web/auth/signup-manager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: signupName,
          email: signupEmail,
          password: signupPassword,
          organizationName,
        }),
      });

      const payload = await response.json();

      if (response.ok && payload.success) {
        onAuthSuccess(payload.data.accessToken);
      } else {
        let errorMsg = payload.message || "Registration failed";
        if (payload.issues?.fieldErrors) {
          const errors = Object.values(payload.issues.fieldErrors).flat();
          if (errors.length > 0) errorMsg = String(errors[0]);
        }
        setStatusMessage(`Error: ${errorMsg}`);
        setLoadingAuth(false);
      }
    } catch {
      setStatusMessage("Failed to connect to the server.");
      setLoadingAuth(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "login") {
      await login();
    } else {
      await signup();
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="bg-white px-8 py-10 shadow-xl shadow-slate-200/40 sm:rounded-[32px] border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-indigo-50 shadow-inner">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900 border-b-2 border-indigo-100 pb-2">
              TeamLens Workspace
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500 font-medium">
              {authMode === "login" ? "Sign in to your manager dashboard" : "Create a new organization account"}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleAuthSubmit}>
            {authMode === "signup" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-[16px] border-0 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-slate-50/50 hover:bg-white transition-colors"
                    placeholder="Jane Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-[16px] border-0 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-slate-50/50 hover:bg-white transition-colors"
                    placeholder="Acme Corp"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email address</label>
              <input
                type="email"
                readOnly={loadingAuth}
                autoComplete="email"
                required
                className="block w-full rounded-[16px] border-0 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-slate-50/50 hover:bg-white transition-colors"
                placeholder="you@company.com"
                value={authMode === "login" ? loginEmail : signupEmail}
                onChange={(e) => authMode === "login" ? setLoginEmail(e.target.value) : setSignupEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Password</label>
              <input
                type="password"
                readOnly={loadingAuth}
                autoComplete="current-password"
                required
                className="block w-full rounded-[16px] border-0 px-4 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-slate-50/50 hover:bg-white transition-colors"
                placeholder="••••••••"
                value={authMode === "login" ? loginPassword : signupPassword}
                onChange={(e) => authMode === "login" ? setLoginPassword(e.target.value) : setSignupPassword(e.target.value)}
              />
            </div>

            {statusMessage && (
              <div className={`p-3 text-sm font-bold rounded-[14px] text-center ${statusMessage.startsWith("Error") ? "bg-red-50 text-red-600 border border-red-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>
                {statusMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingAuth}
              className="flex w-full justify-center rounded-[16px] bg-indigo-600 px-3 py-3.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-600/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-300 transition-all duration-200 active:scale-[0.98]"
            >
              {loadingAuth ? <Loader2 className="w-5 h-5 animate-spin" /> : authMode === "login" ? "Sign in to Dashboard" : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500 font-medium">
            {authMode === "login" ? (
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setStatusMessage("");
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setStatusMessage("");
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
