import { useState, useEffect, useCallback, useRef } from 'react';
import {
  parseHashToken,
  getHashError,
  getCurrentUser,
  loadToken,
  persistToken,
  clearToken,
  initiateSpotifyLogin,
  type SpotifyUser,
} from '@/lib/spotify';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error';

export interface UseSpotifyAuthReturn {
  status: AuthStatus;
  user: SpotifyUser | null;
  error: string | null;
  login: () => void;
  logout: () => void;
}

export function useSpotifyAuth(): UseSpotifyAuthReturn {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const fetchUser = useCallback(async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
      setStatus('authenticated');
    } catch (e) {
      clearToken();
      setStatus('unauthenticated');
      setError(e instanceof Error ? e.message : 'Authentication failed');
    }
  }, []);

  useEffect(() => {
    if (processingRef.current) return;

    // Check for error in hash
    const hashError = getHashError();
    if (hashError) {
      window.history.replaceState({}, '', window.location.pathname);
      setStatus('unauthenticated');
      setError('Spotify login was cancelled or denied.');
      return;
    }

    // Check for access_token in hash (Implicit Grant callback)
    const hashToken = parseHashToken();
    if (hashToken) {
      processingRef.current = true;
      window.history.replaceState({}, '', window.location.pathname);
      persistToken(hashToken);
      console.log('[JamCircle] Token received from Spotify, fetching user...');
      fetchUser();
      return;
    }

    // No hash — check for existing stored token
    const existing = loadToken();
    if (existing) {
      console.log('[JamCircle] Found existing token, fetching user...');
      fetchUser();
    } else {
      setStatus('unauthenticated');
    }
  }, [fetchUser]);

  const login = useCallback(() => {
    setError(null);
    initiateSpotifyLogin();
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
    processingRef.current = false;
  }, []);

  return { status, user, error, login, logout };
}
