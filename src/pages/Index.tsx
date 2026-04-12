import { useState, useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const VERIFIER_KEY = "spotify_code_verifier";
const START_KEY = "spotify_auth_start";
const TOKEN_KEY = "spotify_access_token";

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

type SpotifyProfile = { display_name: string; images: { url: string }[] };
type Track = { name: string; artists: { name: string }[]; album: { images: { url: string }[] } };

type Status = "idle" | "redirecting" | "success" | "exchanging" | "profile" | "playlists" | "error";

export default function Index() {
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
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
      window.history.replaceState({}, "", "/");
    }
  }, []);

  async function login() {
    const verifier = generateVerifier();
    const challenge = await generateChallenge(verifier);
    localStorage.setItem(VERIFIER_KEY, verifier);
    localStorage.setItem(START_KEY, Date.now().toString());
    const scopes = "playlist-read-private playlist-read-collaborative user-read-private user-read-email";
    const url = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&code_challenge_method=S256&code_challenge=${challenge}`;
    setStatus("redirecting");
    window.location.href = url;
  }

  async function exchangeAndFetchProfile() {
    setStatus("exchanging");
    const verifier = localStorage.getItem(VERIFIER_KEY);
    console.log("[PKCE] Exchanging code for token…", { code: code.slice(0, 20) + "…", hasVerifier: !!verifier });

    try {
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier || "",
        }),
      });

      const data = await res.json();
      console.log("[PKCE] Token response status:", res.status);

      if (!res.ok) {
        throw new Error(data.error_description || data.error || "Token exchange failed");
      }

      const token = data.access_token;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(VERIFIER_KEY);
      localStorage.removeItem(START_KEY);
      console.log("[PKCE] Token stored, fetching profile…");

      const meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      console.log("[PKCE] Profile response:", meData.display_name);

      if (!meRes.ok) {
        throw new Error(meData.error?.message || "Failed to fetch profile");
      }

      setProfile(meData);
      setStatus("profile");
    } catch (err: any) {
      console.error("[PKCE] Error:", err);
      setErrorMsg(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  function extractPlaylistId(input: string): string | null {
    const urlMatch = input.match(/playlist\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    const uriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    return uriMatch ? uriMatch[1] : null;
  }

  async function loadPlaylist() {
    const id = extractPlaylistId(playlistUrl);
    if (!id) { setErrorMsg("Invalid playlist URL or URI"); setStatus("error"); return; }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setErrorMsg("No access token found. Please reconnect."); setStatus("error"); return; }

    setLoadingTracks(true);
    setTracks([]);
    console.log("[Playlist] Loading playlist:", id);

    try {
      const res = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("[Playlist] Response status:", res.status);

      if (!res.ok) throw new Error(data.error?.message || "Failed to load playlist");

      const items: Track[] = data.items
        .filter((i: any) => i.track)
        .map((i: any) => ({ name: i.track.name, artists: i.track.artists, album: i.track.album }));

      console.log("[Playlist] Loaded", items.length, "tracks");
      setTracks(items);
    } catch (err: any) {
      console.error("[Playlist] Error:", err);
      setErrorMsg(err.message);
      setStatus("error");
    } finally {
      setLoadingTracks(false);
    }
  }

  const btnStyle = { background: "#1DB954", color: "#fff", border: "none", padding: "16px 32px", borderRadius: 8, fontSize: 18, cursor: "pointer" } as const;

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 20 }}>
      <div style={{ maxWidth: 600, width: "100%", textAlign: "center" }}>

        {status === "idle" && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 32 }}>Spotify PKCE Test</h1>
            <button onClick={login} style={btnStyle}>Connect with Spotify</button>
          </>
        )}

        {status === "redirecting" && <p>Redirecting to Spotify…</p>}

        {status === "success" && (
          <div style={{ textAlign: "left", background: "#222", padding: 24, borderRadius: 12 }}>
            <p style={{ color: "#1DB954", fontSize: 20, marginBottom: 16 }}>✅ OAuth Success</p>
            <p><strong>Code:</strong></p>
            <p style={{ wordBreak: "break-all", fontSize: 12, color: "#aaa", marginBottom: 16 }}>{code}</p>
            <p style={{ marginBottom: 20 }}><strong>Round-trip time:</strong> {(elapsed / 1000).toFixed(1)}s</p>
            <div style={{ textAlign: "center" }}>
              <button onClick={exchangeAndFetchProfile} style={btnStyle}>Continue</button>
            </div>
          </div>
        )}

        {status === "exchanging" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, border: "4px solid #333", borderTopColor: "#1DB954", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <p>Connecting to Spotify…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {status === "profile" && profile && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {profile.images?.[0]?.url ? (
              <img src={profile.images[0].url} alt={profile.display_name} style={{ width: 120, height: 120, borderRadius: "50%", border: "3px solid #1DB954" }} />
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, border: "3px solid #1DB954" }}>🎵</div>
            )}
            <h2 style={{ fontSize: 24, margin: 0 }}>{profile.display_name}</h2>
            <button onClick={() => setStatus("playlists")} style={btnStyle}>Continue to Playlists</button>
          </div>
        )}

        {status === "playlists" && (
          <div style={{ textAlign: "left" }}>
            <h2 style={{ fontSize: 22, marginBottom: 16, textAlign: "center" }}>Load a Playlist</h2>
            <input
              type="text"
              placeholder="Paste Spotify playlist URL or URI…"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }}
            />
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <button onClick={loadPlaylist} disabled={loadingTracks || !playlistUrl.trim()} style={{ ...btnStyle, opacity: loadingTracks || !playlistUrl.trim() ? 0.5 : 1 }}>
                {loadingTracks ? "Loading…" : "Load Playlist"}
              </button>
            </div>

            {loadingTracks && (
              <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                <div style={{ width: 32, height: 32, border: "3px solid #333", borderTopColor: "#1DB954", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {tracks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tracks.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1a1a", padding: 10, borderRadius: 8 }}>
                    <img src={t.album.images?.[t.album.images.length - 1]?.url || ""} alt="" style={{ width: 48, height: 48, borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ overflow: "hidden" }}>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artists.map(a => a.name).join(", ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
