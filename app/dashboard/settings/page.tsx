"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { MapPin, Search, Check, AlertCircle, Building2, Save, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { user, authHeaders, apiBase } = useAuth();

  // Office Location state
  const [officeLat, setOfficeLat] = useState("");
  const [officeLng, setOfficeLng] = useState("");
  const [officeRadius, setOfficeRadius] = useState("200");
  const [officeLabel, setOfficeLabel] = useState("Main Office");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [existingLocationId, setExistingLocationId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");

  // Fetch existing office location on load
  useEffect(() => {
    if (!authHeaders || user?.role !== "MANAGER") return;

    fetch(`${apiBase}/api/web/locations`, { headers: authHeaders, credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.length > 0) {
          const loc = data.data[0];
          setOfficeLat(String(loc.latitude));
          setOfficeLng(String(loc.longitude));
          setOfficeRadius(String(loc.radiusMeters));
          setOfficeLabel(loc.label || "Main Office");
          setExistingLocationId(loc.id);
        }
      })
      .catch((err) => console.error("Failed to load office location", err));
  }, [authHeaders, apiBase, user]);

  // Debounced address search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(false);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Location search failed", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authHeaders) return;

    setLoadingLocation(true);
    setLocationError("");
    setLocationSuccess(false);

    try {
      const response = await fetch(`${apiBase}/api/web/locations`, {
        method: "PUT",
        headers: authHeaders,
        credentials: "include",
        body: JSON.stringify({
          label: officeLabel,
          latitude: parseFloat(officeLat),
          longitude: parseFloat(officeLng),
          radiusMeters: parseInt(officeRadius, 10),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setLocationSuccess(true);
        if (data.data?.id) setExistingLocationId(data.data.id);
        setTimeout(() => setLocationSuccess(false), 3000);
      } else {
        setLocationError(data.message || "Failed to save location");
      }
    } catch {
      setLocationError("Network error occurred.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!authHeaders || !existingLocationId) return;
    if (!window.confirm("Are you sure you want to remove the office location? All future sessions will be marked as Remote.")) return;

    try {
      const res = await fetch(`${apiBase}/api/web/locations/${existingLocationId}`, {
        method: "DELETE",
        headers: authHeaders,
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setOfficeLat("");
        setOfficeLng("");
        setOfficeRadius("200");
        setOfficeLabel("Main Office");
        setExistingLocationId(null);
        setSelectedAddress("");
      }
    } catch (err) {
      console.error("Failed to delete location", err);
    }
  };

  if (!user || user.role !== "MANAGER") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Building2 className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500 mt-2">Only organization managers can access Settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your organization&apos;s configuration.</p>
      </div>

      {/* Office Location Card */}
      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900">Office Location</h3>
          </div>
          {existingLocationId && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <Check className="w-3 h-3 mr-1" /> Configured
            </span>
          )}
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-sm text-slate-500">
            Set the office coordinates so TeamLens can automatically classify employee sessions as <strong>Office</strong> or <strong>Remote</strong> based on their clock-in location.
          </p>

          {/* Current Location Display */}
          {existingLocationId && officeLat && officeLng && (
            <div className="flex items-center gap-4 bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-900">{officeLabel}</p>
                <p className="text-xs text-purple-600 mt-0.5">
                  {selectedAddress || `${parseFloat(officeLat).toFixed(4)}°, ${parseFloat(officeLng).toFixed(4)}°`}
                  &nbsp;·&nbsp;{officeRadius}m radius
                </p>
              </div>
              <button
                onClick={handleDeleteLocation}
                className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Remove office location"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {existingLocationId ? "Change Office Address" : "Search for Office Address"}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Start typing to search an address..."
                className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 pl-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-[11px] h-4 w-4 text-slate-400" />

              {/* Floating Dropdown */}
              {(searchResults.length > 0 || isSearching || (hasSearched && searchResults.length === 0)) && searchQuery.trim().length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-xl shadow-slate-200/50 z-50 max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="px-5 py-4 text-sm text-slate-500 flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul>
                      {searchResults.map((result: any, i: number) => (
                        <li
                          key={i}
                          className="px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-purple-50 cursor-pointer text-sm text-slate-700 transition-colors"
                          onClick={() => {
                            setOfficeLat(result.lat);
                            setOfficeLng(result.lon);
                            setSelectedAddress(result.display_name);
                            setSearchResults([]);
                            setSearchQuery("");
                            setHasSearched(false);
                          }}
                        >
                          {result.display_name}
                        </li>
                      ))}
                    </ul>
                  ) : hasSearched && searchResults.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-orange-600 bg-orange-50 border-l-[3px] border-orange-500">
                      No results found. Please check your spelling.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Manual Coordinate & Radius Form */}
          <form onSubmit={handleSaveLocation} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Office Name</label>
                <input
                  type="text"
                  className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="Main Office"
                  value={officeLabel}
                  onChange={(e) => setOfficeLabel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="e.g. 28.6315"
                  value={officeLat}
                  onChange={(e) => setOfficeLat(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="e.g. 77.2167"
                  value={officeLng}
                  onChange={(e) => setOfficeLng(e.target.value)}
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-1">Radius (meters)</label>
              <input
                type="number"
                min={50}
                max={100000}
                required
                className="w-full rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                value={officeRadius}
                onChange={(e) => setOfficeRadius(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Employees clocking in within this radius will be marked as &quot;Office&quot;.</p>
            </div>

            {/* Feedback Messages */}
            {locationError && (
              <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {locationError}
              </div>
            )}
            {locationSuccess && (
              <div className="flex items-center text-sm text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                Office location saved successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={loadingLocation || !officeLat || !officeLng}
              className="inline-flex items-center rounded-[14px] bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 hover:shadow-md hover:shadow-purple-600/20 disabled:bg-purple-300 disabled:shadow-none"
            >
              <Save className="w-4 h-4 mr-2" />
              {loadingLocation ? "Saving..." : existingLocationId ? "Update Location" : "Save Location"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
