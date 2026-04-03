import { useState, useEffect, useCallback } from "react";
import {
  exchangeCodeForToken,
  getCurrentUser,
  loadTokens,
  clearTokens,
  initiateSpotifyLogin,
  type SpotifyUser,
} from "@/lib/spotify";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated" | "error";

export interface UseSpotifyAuthReturn {
  status: AuthStatus;
  user: SpotifyUser | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

export function useSpotifyAuth(): UseSpotifyAuthReturn {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
      setStatus("authenticated");
    } catch (e) {
      clearTokens();
      setStatus("unauthenticated");
      setError(e instanceof Error ? e.message : "Authentication failed");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    // Clean the URL immediately
    if (code || errorParam) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (errorParam) {
      setStatus("unauthenticated");
      setError("Spotify login was cancelled or denied.");
      return;
    }

    if (code) {
      // Exchange the auth code for tokens
      exchangeCodeForToken(code)
        .then(() => fetchUser())
        .catch((e) => {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Failed to authenticate");
        });
      return;
    }

    // Check for existing valid session
    const tokens = loadTokens();
    if (tokens) {
      fetchUser();
    } else {
      setStatus("unauthenticated");
    }
  }, [fetchUser]);

  const login = useCallback(async () => {
    setError(null);
    await initiateSpotifyLogin();
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return { status, user, error, login, logout };
}
