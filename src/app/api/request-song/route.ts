// file: app/api/request-song/route.ts

import { NextResponse } from "next/server";

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } =
  process.env;

// Function to get a new access token from Spotify using the refresh token
async function getAccessToken() {
  // The authorization header requires a Basic token, which is a base64-encoded string
  // of the client ID and client secret.
  const basicAuth = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN!,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to refresh access token:", errorText);
    throw new Error("Failed to get access token from Spotify.");
  }

  const data = await response.json();
  return data.access_token;
}

// This function handles POST requests to /api/request-song
export async function POST(request: Request) {
  try {
    // 1. Get the song/artist from the client's request
    const { song, artist } = await request.json();

    if (!song && !artist) {
      return NextResponse.json(
        { message: "Song or artist is required" },
        { status: 400 }
      );
    }

    // 2. Get a fresh access token from Spotify
    const accessToken = await getAccessToken();

    // 3. Use the token to search for the song
    const baseUrl = "https://api.spotify.com/v1/search";
    const query = `track:${song} artist:${artist}`;
    const params = new URLSearchParams();
    params.append("q", query);
    params.append("type", "track");
    params.append("limit", "10");

    const searchResponse = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(
        `Spotify API error! Status: ${searchResponse.status}, Details: ${errorText}`
      );
    }

    const searchData = await searchResponse.json();

    // 4. Send the search results back to the client
    return NextResponse.json(searchData, { status: 200 });
  } catch (error) {
    console.error("Error in /api/request-song:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "An error occurred", error: errorMessage },
      { status: 500 }
    );
  }
}
