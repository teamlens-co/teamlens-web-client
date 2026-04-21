"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Image as ImageIcon, AlertCircle } from "lucide-react";

type Screenshot = {
  id: string;
  userId: string;
  sessionId?: string;
  capturedAt: string;
  createdAt: string;
};

function ScreenshotCard({ screenshot }: { screenshot: Screenshot }) {
  const { authHeaders, apiBase } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!authHeaders) {
      setImageError("Missing auth token.");
      setIsLoadingImage(false);
      return;
    }

    let objectUrl: string | null = null;
    let isMounted = true;

    const loadImage = async () => {
      setIsLoadingImage(true);
      setImageError(null);

      try {
        const response = await fetch(`${apiBase}/api/agent/screenshots/${screenshot.id}`, {
          headers: authHeaders,
        });

        if (!response.ok) {
          throw new Error(`Failed to load screenshot (${response.status})`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setImageUrl(objectUrl);
        }
      } catch (error) {
        console.error("Failed to load screenshot image", error);
        if (isMounted) {
          setImageError("Unable to load screenshot image.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingImage(false);
        }
      }
    };

    void loadImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [authHeaders, apiBase, screenshot.id]);

  return (
    <a
      href={`${apiBase}/api/agent/screenshots/${screenshot.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100 hover:shadow-lg transition-all duration-300"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-900 flex items-center justify-center">
        {isLoadingImage ? (
          <p className="text-sm text-slate-300">Loading...</p>
        ) : imageError ? (
          <p className="px-4 text-center text-sm text-red-200">{imageError}</p>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Screenshot"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <p className="text-sm text-slate-300">No preview available</p>
        )}
      </div>
      <div className="bg-white p-4">
        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {new Date(screenshot.capturedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
        <p className="text-xs text-slate-500 mt-1">{new Date(screenshot.capturedAt).toLocaleDateString()}</p>
      </div>
    </a>
  );
}

export default function ScreenshotsView() {
  const { authHeaders, apiBase, selectedUserId, dateRange } = useAuth();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authHeaders || !selectedUserId) return;

    const fetchScreenshots = async () => {
      setLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams({
          userId: selectedUserId,
          limit: "50",
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        });
        const response = await fetch(`${apiBase}/api/agent/screenshots?` + queryParams.toString(), {
          headers: authHeaders,
        });
        const result = await response.json();
        if (result.success) {
          setScreenshots(result.data);
        } else {
          setScreenshots([]);
          setError(result.message || "Failed to load screenshots.");
        }
      } catch (err) {
        console.error("Failed to fetch screenshots", err);
        setError("An error occurred while fetching screenshots.");
      } finally {
        setLoading(false);
      }
    };

    void fetchScreenshots();
  }, [authHeaders, apiBase, selectedUserId, dateRange]);

  if (loading) {
    return <div className="text-slate-500">Loading screenshots...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center">
            <ImageIcon className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900">Recent Screenshots</h3>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 flex items-center shadow-sm">
              <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
              {error}
            </div>
          )}
          
          {screenshots.length === 0 && !error ? (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">No screenshots have been captured yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {screenshots.map((screenshot) => (
                <ScreenshotCard key={screenshot.id} screenshot={screenshot} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
