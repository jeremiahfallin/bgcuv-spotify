// file: src/app/api/add-to-playlist/route.ts

import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
  SPOTIFY_PLAYLIST_ID,
  SPOTIFY_ALL_SONG_PLAYLIST_ID,
} = process.env;

interface SongEvaluation {
  evaluation:
    | "appropriate"
    | "likely_appropriate"
    | "likely_inappropriate"
    | "inappropriate";
  reasoning: string;
  issues: string[];
  song_title: string;
  artist: string;
}

async function lookUpSongApproval({
  songTitle,
  artist,
}: {
  songTitle: string;
  artist: string;
}): Promise<SongEvaluation> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const config = {
    thinkingConfig: {
      thinkingBudget: -1,
    },
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      required: ["evaluation", "reasoning", "issues", "song_title", "artist"],
      properties: {
        evaluation: {
          type: Type.STRING,
          enum: [
            "appropriate",
            "likely_appropriate",
            "likely_inappropriate",
            "inappropriate",
          ],
        },
        reasoning: {
          type: Type.STRING,
        },
        issues: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
        song_title: {
          type: Type.STRING,
        },
        artist: {
          type: Type.STRING,
        },
      },
    },
    systemInstruction: [
      {
        text: `# Prompt
You are a playlist creator for a Boys & Girls Club. You will be presented with song titles and the associated artist. For every song you will evaluate whether or not it is appropriate for a Boys & Girls Club.

We have extremely strict guidelines for what is acceptable. We do not allow profanity or adult themes. For example, the words "hell" and "damn" are not allowed.

## Examples:

- "Pumped Up Kicks" by Foster the People would not be allowed because of the suggestive violence in the song

- "Eyes on Fire" by Blue Foundation is inappropriate for the veiled threats and line "flay you alive"`,
      },
    ],
  };
  const model = "gemini-2.5-flash";
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `Song: ${songTitle}, Artist: ${artist}`,
        },
      ],
    },
  ];

  const response = (await ai.models.generateContent({
    model,
    config,
    contents,
  })) as unknown as {
    text: string;
  };

  return JSON.parse(response.text) as SongEvaluation;
}

/**
 * Retrieves a new access token from Spotify using the refresh token.
 * This is necessary because access tokens expire after a short period.
 */
async function getAccessToken() {
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

/**
 * Handles POST requests to /api/add-to-playlist.
 * Expects a `trackUri` in the request body.
 */
export async function POST(request: Request) {
  try {
    const { trackUri, songTitle, artist } = await request.json();

    // Validate that the track URI was provided
    if (!trackUri) {
      return NextResponse.json(
        { message: "Track URI is required" },
        { status: 400 }
      );
    }

    // Validate that the playlist ID is configured on the server
    if (!SPOTIFY_PLAYLIST_ID && !SPOTIFY_ALL_SONG_PLAYLIST_ID) {
      console.error("SPOTIFY_PLAYLIST_ID is not set in .env.local");
      return NextResponse.json(
        { message: "Server configuration error: Playlist ID is missing." },
        { status: 500 }
      );
    }

    // Get a fresh access token
    const accessToken = await getAccessToken();

    const allSongsResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${SPOTIFY_ALL_SONG_PLAYLIST_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const allSongsData = await allSongsResponse.json();

    const songs = allSongsData.tracks.items;

    for (const song of songs) {
      if (song.track.uri === `spotify:track:${trackUri}`) {
        return NextResponse.json(
          { message: "Song already requested!" },
          { status: 405 }
        );
      }
    }

    const approval = await lookUpSongApproval({ songTitle, artist });

    // Make the request to the Spotify API to add the track
    if (approval.evaluation === "appropriate") {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${SPOTIFY_PLAYLIST_ID}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [`spotify:track:${trackUri}`],
          }),
        }
      );
      await fetch(
        `https://api.spotify.com/v1/playlists/${SPOTIFY_ALL_SONG_PLAYLIST_ID}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [`spotify:track:${trackUri}`],
          }),
        }
      );

      // Handle errors from the Spotify API
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Spotify API error while adding track:", errorData);
        return NextResponse.json(
          { message: "Failed to add song to playlist.", details: errorData },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Return a success response
      return NextResponse.json(
        { message: "Song added to playlist successfully!", data },
        { status: 200 }
      );
    } else {
      await fetch(
        `https://api.spotify.com/v1/playlists/${SPOTIFY_ALL_SONG_PLAYLIST_ID}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [`spotify:track:${trackUri}`],
          }),
        }
      );
      return NextResponse.json(
        {
          message: `Song not added to playlist, decision: ${
            approval.evaluation
          } for reasons: ${approval.issues.join(", ")}`,
        },
        { status: 405 }
      );
    }
  } catch (error) {
    console.error("--- CATCH BLOCK ERROR in /api/add-to-playlist ---", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "An unexpected error occurred", error: errorMessage },
      { status: 500 }
    );
  }
}
