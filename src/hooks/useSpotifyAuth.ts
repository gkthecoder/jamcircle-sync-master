import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCodeFromUrl,
  getErrorFromUrl,
  clearUrlParams,
  exchangeCodeForToken,
  getAccessToken,
  clearAccessToken,
  getCurrentUser,
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
      clearAccessToken();
      setStatus('unauthenticated');
      setError(e instanceof Error ? e.message : 'Authentication failed');
    }
  }, []);

  useEffect(() => {
    if (processingRef.current) return;

    // 1. Check for error from Spotify
    const urlError = getErrorFromUrl();
    if (urlError) {
      clearUrlParams();
      setStatus('unauthenticated');
      setError('Spotify login was cancelled or denied.');
      return;
    }

    // 2. Check for authorization code in URL
    const code = getCodeFromUrl();
    if (code) {
      processingRef.current = true;
      clearUrlParams();
      console.log('[JamCircle] Auth code received, exchanging for token...');
      exchangeCodeForToken(code)
        .then(() => {
          console.log('[JamCircle] Token stored, fetching user...');
          return fetchUser();
        })
        .catch((e) => {
          console.error('[JamCircle] Token exchange failed:', e);
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Failed to authenticate');
          processingRef.current = false;
        });
      return;
    }

    // 3. No code – check for existing token
    const token = getAccessToken();
    if (token) {
      console.log('[JamCircle] Existing token found, verifying...');
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
    clearAccessToken();
    setUser(null);
    setStatus('unauthenticated');
    processingRef.current = false;
  }, []);

  return { status, user, error, login, logout };
}
