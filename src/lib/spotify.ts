const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI as string;

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-private',
  'user-read-email',
].join(' ');

/* ── Implicit Grant Auth ── */

export function initiateSpotifyLogin(): void {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'token',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    show_dialog: 'false',
  });
  window.location.href = 'https://accounts.spotify.com/authorize?' + params;
}

/**
 * Parse the hash fragment returned by Spotify's Implicit Grant flow.
 * Returns the access token and expiry, or null if not present.
 */
export function parseHashToken(): { accessToken: string; expiresAt: number } | null {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  if (!accessToken) return null;
  return {
    accessToken,
    expiresAt: Date.now() + (expiresIn ? parseInt(expiresIn, 10) * 1000 : 3600_000),
  };
}

export function getHashError(): string | null {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get('error');
}

/* ── Token Storage ── */

export interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

const TOKEN_KEY = 'jamcircle_spotify_token';

export function persistToken(token: StoredToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function loadToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token: StoredToken = JSON.parse(raw);
    // Treat expired tokens as absent
    if (Date.now() > token.expiresAt - 60_000) {
      clearToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* ── Spotify API helpers ── */

async function spotifyFetch<T>(endpoint: string): Promise<T> {
  const token = loadToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch('https://api.spotify.com/v1' + endpoint, {
    headers: { Authorization: 'Bearer ' + token.accessToken },
  });
  if (res.status === 401) {
    clearToken();
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
