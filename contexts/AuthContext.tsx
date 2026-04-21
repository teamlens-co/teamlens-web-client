"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import type { DateRange } from "../components/DateFilter";
import { getPresetRange } from "../components/DateFilter";

export type Role = "MANAGER" | "EMPLOYEE";

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  organizationId: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
};

type AuthContextType = {
  user: UserProfile | null;
  organization: Organization | null;
  authToken: string | null;
  apiBase: string;
  authHeaders: { Authorization: string; "Content-Type": string } | null;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("teamlens_manager_token");
    }
    return null;
  });
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange("Last 7 Days"));
  const [isLoading, setIsLoading] = useState(true);

  const apiBase = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
    return envBase && envBase.length > 0 ? envBase.replace(/\/$/, "") : "http://localhost:5000";
  }, []);

  const authHeaders = useMemo(() => {
    if (!authToken) return null;
    return {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    };
  }, [authToken]);

  useEffect(() => {
    const restoreSession = async () => {
      if (!authHeaders) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/web/auth/me`, {
          method: "GET",
          headers: authHeaders,
          cache: "no-store",
        });

        const payload = await response.json();

        if (response.ok && payload.success) {
          setUser({
            id: payload.data.id,
            fullName: payload.data.fullName,
            email: payload.data.email,
            role: payload.data.role,
            organizationId: payload.data.organization.id,
          });
          setOrganization(payload.data.organization);
          
          if (!selectedUserId) {
            setSelectedUserId(payload.data.id);
          }
        } else {
          // Bad token
          setUser(null);
          setOrganization(null);
          setAuthToken(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("teamlens_manager_token");
          }
        }
      } catch (error) {
        console.error("Session restore error", error);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [apiBase, authHeaders, selectedUserId]);

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setAuthToken(null);
    setSelectedUserId("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("teamlens_manager_token");
    }
    router.push("/manager/sign-in");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        authToken,
        apiBase,
        authHeaders,
        selectedUserId,
        setSelectedUserId,
        dateRange,
        setDateRange,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
