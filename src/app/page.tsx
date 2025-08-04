"use client";

import { useState } from "react";
import { Button, Flex, TextField, Text, Box, Card } from "@radix-ui/themes";
import {
  Root as ToastRoot,
  Viewport as ToastViewport,
  Title as ToastTitle,
  Description as ToastDescription,
  Close as ToastClose,
} from "@radix-ui/react-toast";

// Define a type for the track item for better type safety
interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
  external_urls: {
    spotify: string;
  };
}

export default function Home() {
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingSongId, setAddingSongId] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastContent, setToastContent] = useState({
    title: "",
    description: "",
  });

  const handleSearch = async (event: React.FormEvent) => {
    // Prevent the form from reloading the page
    event.preventDefault();
    setLoading(true);
    setResults([]);

    try {
      // Make the API call to our own backend route
      const response = await fetch(`/api/request-song`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ song, artist }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      const data = await response.json();
      // The search results are in the 'tracks.items' property
      setResults(data.tracks?.items || []);
    } catch (error) {
      console.error("Failed to fetch from API route:", error);
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setToastContent({ title: "Error searching", description: message });
      setToastOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (
    trackUri: string,
    trackId: string,
    songTitle: string,
    artist: string
  ) => {
    setAddingSongId(trackId);

    try {
      const response = await fetch("/api/add-to-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackUri, songTitle, artist }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add song.");
      }

      setToastContent({
        title: "Success",
        description: `${songTitle} by ${artist} has been added to the playlist.`,
      });
      setToastOpen(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setToastContent({ title: "Error", description: message });
      setToastOpen(true);
    } finally {
      setAddingSongId(null);
    }
  };

  return (
    <Flex
      height="100%"
      direction="column"
      align="center"
      justify="center"
      gap="4"
      p="4"
    >
      <Box maxWidth="500px" width="100%">
        <form onSubmit={handleSearch}>
          <Flex direction="column" gap="3">
            <TextField.Root
              placeholder="Enter a song name"
              name="song"
              size="3"
              value={song}
              onChange={(e) => setSong(e.target.value)}
              required
            />
            <TextField.Root
              placeholder="Enter an artist"
              name="artist"
              size="3"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
            />
            <Button type="submit" size="3" disabled={loading}>
              {loading ? "Searching..." : "Search 🎵"}
            </Button>
          </Flex>
        </form>
      </Box>

      <Flex direction="row" gap="3" justify="center" width="100%" wrap="wrap">
        {results.length > 0 &&
          results.map((track) => (
            <Card key={track.id}>
              <Flex gap="3" align="center">
                <img
                  src={
                    track.album.images[0]?.url ||
                    "https://placehold.co/64x64/0a0a0a/ededed?text=N/A"
                  }
                  alt={track.name}
                  width="64"
                  height="64"
                  style={{ borderRadius: "4px" }}
                />
                <Box>
                  <Text as="div" weight="bold">
                    {track.name}
                  </Text>
                  <Text as="div" color="gray">
                    {track.artists.map((a) => a.name).join(", ")}
                  </Text>
                </Box>
                <Button
                  size="2"
                  variant="soft"
                  onClick={() =>
                    handleAddToPlaylist(
                      track.id,
                      track.id,
                      track.name,
                      track.artists[0].name
                    )
                  }
                  disabled={addingSongId === track.id}
                >
                  {addingSongId === track.id ? "Adding..." : "Add"}
                </Button>
              </Flex>
            </Card>
          ))}
      </Flex>
      <ToastRoot
        className="ToastRoot"
        open={toastOpen}
        onOpenChange={setToastOpen}
      >
        <ToastTitle className="ToastTitle">{toastContent.title}</ToastTitle>
        <ToastDescription className="ToastDescription">
          {toastContent.description}
        </ToastDescription>
        <ToastClose />
      </ToastRoot>
      <ToastViewport className="ToastViewport" />
    </Flex>
  );
}
