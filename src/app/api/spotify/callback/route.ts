// File: /app/api/spotify/callback/route.js

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = "http://127.0.0.1:3000/callback";

    if (!clientId || !clientSecret) {
      console.error("Error: Missing Spotify credentials.");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    // Ensure this URL is exactly correct
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    // Check the response content type before trying to parse as JSON
    const contentType = response.headers.get("content-type");
    if (
      !response.ok ||
      !contentType ||
      !contentType.includes("application/json")
    ) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Failed to fetch tokens from Spotify.", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    const refreshToken = data.refresh_token;

    return NextResponse.json(data);
  } catch (error) {
    console.error("--- CATCH BLOCK ERROR ---", error);
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: error.message },
      { status: 500 }
    );
  }
}
