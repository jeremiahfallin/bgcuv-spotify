"use client";

// A simple function to generate a random string for the 'state' parameter
const generateRandomString = (length) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export default function Login() {
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID; // Recommended to prefix with NEXT_PUBLIC_ for frontend access in Next.js
    const redirectUri = "http://127.0.0.1:3000/callback"; // This must be whitelisted in your Spotify Developer Dashboard
    const scope =
      "user-read-private user-read-email playlist-modify-public playlist-modify-private";
    const state = generateRandomString(16);

    // In a real app, you would store the 'state' value (e.g., in localStorage)
    // to verify it on the callback page.
    // localStorage.setItem('spotify_auth_state', state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state,
    });

    // Redirect the user to the Spotify authorization page
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  return (
    <div>
      {/* This button now triggers the redirect to Spotify's login page.
        This is a more typical user flow than displaying a long URL.
      */}
      <button onClick={handleLogin}>Login with Spotify</button>
    </div>
  );
}
