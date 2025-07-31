"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function Callback() {
  const searchParams = useSearchParams();
  const requestSent = useRef(false); // <-- Add this ref

  useEffect(() => {
    const code = searchParams.get("code");

    // Only run this if we have a code AND the request hasn't been sent yet
    if (code && !requestSent.current) {
      requestSent.current = true;

      fetch("/api/spotify/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          // Redirect or do something with the tokens
        })
        .catch((err) => console.error(err));
    }
  }, [searchParams]);

  return <div>Loading...</div>;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Callback />
    </Suspense>
  );
}
