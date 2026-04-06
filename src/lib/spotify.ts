const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI as string;

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-read-private',
  'user-read-email',
].join(' ');

function generateVerifier(length = 128): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function initiateSpotifyLogin(): Promise<void> {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  sessionStorage.setItem('spotify_pkce_verifier', verifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'false',
  });
  window.location.href = 'https://accounts.spotify.com/authorize?' + params;
}

export async function exchangeCodeForToken(code: string): Promise<SpotifyTokens> {
  const verifier = sessionStorage.getItem('spotify_pkce_verifier');
  if (!verifier) throw new Error('PKCE verifier missing from session');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || 'Token exchange failed');
  }
  const data = await res.json();
  sessionStorage.removeItem('spotify_pkce_verifier');
  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  persistTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json();
  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  persistTokens(tokens);
  return tokens;
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_KEY = 'jamcircle_spotify_tokens';

export function persistTokens(tokens: SpotifyTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function loadTokens(): SpotifyTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenExpired(tokens: SpotifyTokens): boolean {
  return Date.now() > tokens.expiresAt - 60000;
}

async function getValidToken(): Promise<string> {
  let tokens = loadTokens();
  if (!tokens) throw new Error('Not authenticated');
  if (isTokenExpired(tokens)) {
    tokens = await refreshAccessToken(tokens.refreshToken);
  }
  return tokens.accessToken;
}

async function spotifyFetch<T>(endpoint: string): Promise<T> {
  const token = await getValidToken();
  const res = await fetch('https://api.spotify.com/v1' + endpoint, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (res.status === 401) {
    clearTokens();
    throw new Error('Session expired. Please reconnect Spotify.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || 'Spotify API error ' + res.status);
  }
  return res.json();
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

export async function getCurrentUser(): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>('/me');
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

export async function getUserPlaylists(limit = 50): Promise<SpotifyPlaylist[]> {
  const data = await spotifyFetch<{ items: SpotifyPlaylist[] }>(
    '/me/playlists?limit=' + limit
  );
  return data.items.filter(Boolean);
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  preview_url: string | null;
}

export interface AudioFeatures {
  id: string;
  tempo: number;
  key: number;
  mode: number;
  energy: number;
  danceability: number;
  valence: number;
  loudness: number;
  time_signature: number;
}

export interface EnrichedTrack extends SpotifyTrack {
  features?: AudioFeatures;
  keyName?: string;
  bpm?: number;
}

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export async function getPlaylistTracks(playlistId: string): Promise<EnrichedTrack[]> {
  const data = await spotifyFetch<{ items: { track: SpotifyTrack | null }[] }>(
    '/playlists/' + playlistId + '/tracks?limit=100'
  );
  const tracks = data.items
    .map((i) => i.track)
    .filter((t): t is SpotifyTrack => !!t?.id);
  if (tracks.length === 0) return [];
  const ids = tracks.map((t) => t.id).join(',');
  let featuresMap: Record<string, AudioFeatures> = {};
  try {
    const featData = await spotifyFetch<{ audio_features: (AudioFeatures | null)[] }>(
      '/audio-features?ids=' + ids
    );
    featuresMap = Object.fromEntries(
      (featData.audio_features ?? [])
        .filter((f): f is AudioFeatures => !!f)
        .map((f) => [f.id, f])
    );
  } catch {
    // continue without audio features
  }
  return tracks.map((track) => {
    const f = featuresMap[track.id];
    return {
      ...track,
      features: f,
      keyName: f && f.key >= 0 ? KEY_NAMES[f.key] + (f.mode === 1 ? ' maj' : ' min') : undefined,
      bpm: f ? Math.round(f.tempo) : undefined,
    };
  });
}
