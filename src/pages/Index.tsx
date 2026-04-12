import { useState, useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const VERIFIER_KEY = "spotify_code_verifier";
const START_KEY = "spotify_auth_start";

function generateVerifier(len = 128): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62]).join("");
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function Index() {
  const [status, setStatus] = useState<"idle" | "redirecting" | "success" | "error">("idle");
  const [code, setCode] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get("code");
    const error = params.get("error");

    if (error) {
      processed.current = true;
      setStatus("error");
      setErrorMsg(`Spotify returned error: ${error}`);
      window.history.replaceState({}, "", "/");
      return;
    }

    if (authCode) {
      processed.current = true;
      const start = parseInt(localStorage.getItem(START_KEY) || "0", 10);
      const ms = start ? Date.now() - start : 0;
      setCode(authCode);
      setElapsed(ms);
      setStatus("success");
      localStorage.removeItem(VERIFIER_KEY);
      localStorage.removeItem(START_KEY);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  async function login() {
    const verifier = generateVerifier();
    const challenge = await generateChallenge(verifier);
    localStorage.setItem(VERIFIER_KEY, verifier);
    localStorage.setItem(START_KEY, Date.now().toString());
    const url = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user-read-private&code_challenge_method=S256&code_challenge=${challenge}`;
    setStatus("redirecting");
    window.location.href = url;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 20 }}>
      <div style={{ maxWidth: 600, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, marginBottom: 32 }}>Spotify PKCE Test</h1>

        {status === "idle" && (
          <button onClick={login} style={{ background: "#1DB954", color: "#fff", border: "none", padding: "16px 32px", borderRadius: 8, fontSize: 18, cursor: "pointer" }}>
            Connect with Spotify
          </button>
        )}

        {status === "redirecting" && <p>Redirecting to Spotify…</p>}

        {status === "success" && (
          <div style={{ textAlign: "left", background: "#222", padding: 24, borderRadius: 12 }}>
            <p style={{ color: "#1DB954", fontSize: 20, marginBottom: 16 }}>✅ OAuth Success</p>
            <p><strong>Code:</strong></p>
            <p style={{ wordBreak: "break-all", fontSize: 12, color: "#aaa", marginBottom: 16 }}>{code}</p>
            <p><strong>Round-trip time:</strong> {(elapsed / 1000).toFixed(1)}s</p>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "left", background: "#331111", padding: 24, borderRadius: 12 }}>
            <p style={{ color: "#ff4444", fontSize: 20, marginBottom: 16 }}>❌ Error</p>
            <p>{errorMsg}</p>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ marginTop: 16, background: "#ff4444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer" }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
