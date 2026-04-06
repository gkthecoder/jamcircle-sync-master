import { useState, useEffect, useCallback, useRef } from 'react';
import {
  exchangeCodeForToken,
  getCurrentUser,
  loadTokens,
  clearTokens,
  initiateSpotifyLogin,
  type SpotifyUser,
} from '@/lib/spotify';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error';

export interface UseSpotifyAuthReturn {
  status: AuthStatus;
  user: SpotifyUser | null;
  error: string | null;
  login: () => Promise<void>;
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
      clearTokens();
      setStatus('unauthenticated');
      setError(e instanceof Error ? e.message : 'Authentication failed');
    }
  }, []);

  useEffect(() => {
    // Prevent double-processing (React StrictMode or re-renders)
    if (processingRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    // Clean URL immediately if auth params present
    if (code || errorParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (errorParam) {
      setStatus('unauthenticated');
      setError('Spotify login was cancelled or denied.');
      return;
    }

    if (code) {
      processingRef.current = true;
      console.log('[JamCircle] Processing Spotify auth callback...');
      
      exchangeCodeForToken(code)
        .then(() => {
          console.log('[JamCircle] Token exchange successful, fetching user...');
          return fetchUser();
        })
        .catch((e) => {
          console.error('[JamCircle] Auth callback failed:', e);
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Failed to authenticate with Spotify');
          processingRef.current = false;
        });
      return;
    }

    // No code in URL — check for existing session
    const tokens = loadTokens();
    if (tokens) {
      console.log('[JamCircle] Found existing tokens, fetching user...');
      fetchUser();
    } else {
      setStatus('unauthenticated');
    }
  }, [fetchUser]);

  const login = useCallback(async () => {
    setError(null);
    await initiateSpotifyLogin();
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus('unauthenticated');
    processingRef.current = false;
  }, []);

  return { status, user, error, login, logout };
}
