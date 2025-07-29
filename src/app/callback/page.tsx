"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const requestSent = useRef(false); // <-- Add this ref

  useEffect(() => {
    const code = searchParams.get("code");

    // Only run this if we have a code AND the request hasn't been sent yet
    if (code && !requestSent.current) {
      requestSent.current = true; // <-- Mark as sent immediately

      fetch("/api/spotify/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Success:", data);
          // Redirect or do something with the tokens
        })
        .catch((err) => console.error(err));
    }
  }, [searchParams]);

  return <div>Loading...</div>;
}
