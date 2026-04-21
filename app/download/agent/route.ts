import { NextResponse } from "next/server";

export function GET() {
  const downloadUrl = process.env.AGENT_DOWNLOAD_URL?.trim();

  if (!downloadUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "AGENT_DOWNLOAD_URL is not configured.",
      },
      { status: 500 },
    );
  }

  return NextResponse.redirect(downloadUrl, { status: 302 });
}