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
      console.log('[JamCircle] Fetching user profile...');
      const u = await getCurrentUser();
      console.log('[JamCircle] ✅ User profile loaded:', u.display_name);
      setUser(u);
      setStatus('authenticated');
    } catch (e) {
      console.error('[JamCircle] ❌ Failed to fetch user profile:', e);
      clearAccessToken();
      setStatus('unauthenticated');
      setError(e instanceof Error ? e.message : 'Authentication failed');
    }
  }, []);

  useEffect(() => {
    if (processingRef.current) return;

    const urlError = getErrorFromUrl();
    if (urlError) {
      console.log('[JamCircle] ❌ Spotify returned error:', urlError);
      clearUrlParams();
      setStatus('unauthenticated');
      setError('Spotify login was cancelled or denied.');
      return;
    }

    const code = getCodeFromUrl();
    if (code) {
      processingRef.current = true;
      console.log('[JamCircle] 🔑 Authorization code received from Spotify');
      clearUrlParams();
      exchangeCodeForToken(code)
        .then(() => {
          console.log('[JamCircle] ✅ Token exchange successful, token stored');
          return fetchUser();
        })
        .catch((e) => {
          console.error('[JamCircle] ❌ Token exchange failed:', e);
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Failed to authenticate with Spotify');
          processingRef.current = false;
        });
      return;
    }

    const token = getAccessToken();
    if (token) {
      console.log('[JamCircle] 🔄 Existing token found, verifying...');
      fetchUser();
    } else {
      console.log('[JamCircle] No token found, showing connect screen');
      setStatus('unauthenticated');
    }
  }, [fetchUser]);

  const login = useCallback(async () => {
    setError(null);
    console.log('[JamCircle] 🚀 Initiating Spotify login...');
    await initiateSpotifyLogin();
  }, []);

  const logout = useCallback(() => {
    console.log('[JamCircle] Logging out, clearing token');
    clearAccessToken();
    setUser(null);
    setStatus('unauthenticated');
    processingRef.current = false;
  }, []);

  return { status, user, error, login, logout };
}
