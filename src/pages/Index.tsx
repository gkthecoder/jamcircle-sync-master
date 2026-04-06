import { useState, useEffect, useCallback, useRef } from 'react';

/* ══════════════════════════════════════════════════════════════
   ENV
   ══════════════════════════════════════════════════════════════ */
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI as string;
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

const SCOPES = 'playlist-read-private playlist-read-collaborative user-read-private user-read-email';
const TOKEN_KEY = 'jamcircle_token';
const VERIFIER_KEY = 'spotify_code_verifier';

/* ══════════════════════════════════════════════════════════════
   PKCE helpers
   ══════════════════════════════════════════════════════════════ */
function generateVerifier(len = 128): string {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, b => c[b % c.length]).join('');
}

async function generateChallenge(v: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ══════════════════════════════════════════════════════════════
   Spotify API types
   ══════════════════════════════════════════════════════════════ */
interface SpotifyUser { id: string; display_name: string; images: { url: string }[] }
interface SpotifyPlaylist { id: string; name: string; images: { url: string }[]; tracks: { total: number }; owner: { display_name: string } }
interface SpotifyTrack { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] }; duration_ms: number }
interface AudioFeatures { id: string; tempo: number; key: number; mode: number; energy: number }
interface EnrichedTrack extends SpotifyTrack { bpm?: number; keyName?: string; energyLevel?: number }

const KEY_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/* ══════════════════════════════════════════════════════════════
   Setlist types
   ══════════════════════════════════════════════════════════════ */
interface SetlistSong { position: number; title: string; artist: string; duration: string; bpm?: number; key?: string; energy: string; performanceNote: string; transitionNote?: string }
interface SetlistBlock { blockNumber: number; blockName: string; mood: string; songs: SetlistSong[] }
interface GeneratedSetlist { setlistName: string; theme: string; totalDuration: string; songCount: number; directorNotes: string; blocks: SetlistBlock[]; generatedAt: string }

/* ══════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════ */
function fmtDur(ms: number) { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

async function spotifyFetch<T>(endpoint: string, token: string): Promise<T> {
  const r = await fetch('https://api.spotify.com/v1' + endpoint, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) { localStorage.removeItem(TOKEN_KEY); throw new Error('Session expired – please reconnect.'); }
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any)?.error?.message || 'Spotify error ' + r.status); }
  return r.json();
}

function handleTryAgain() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(VERIFIER_KEY); window.location.reload(); }

/* ══════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════ */
type Step = 'connect' | 'playlist' | 'tracks' | 'configure' | 'setlist';

export default function Index() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [step, setStep] = useState<Step>('connect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<EnrichedTrack[]>([]);

  const [bandName, setBandName] = useState('');
  const [venue, setVenue] = useState('');
  const [showLength, setShowLength] = useState('90 min');
  const [setlist, setSetlist] = useState<GeneratedSetlist | null>(null);

  const processingRef = useRef(false);

  /* ── Auth: login ── */
  const login = useCallback(async () => {
    console.log('[JamCircle] 🚀 Initiating Spotify login...');
    const v = generateVerifier();
    const ch = await generateChallenge(v);
    localStorage.setItem(VERIFIER_KEY, v);
    const p = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI, scope: SCOPES, code_challenge_method: 'S256', code_challenge: ch, show_dialog: 'false' });
    window.location.href = 'https://accounts.spotify.com/authorize?' + p;
  }, []);

  /* ── Auth: exchange code ── */
  const exchangeCode = useCallback(async (code: string) => {
    console.log('[JamCircle] 🔑 Auth code received, exchanging...');
    const v = localStorage.getItem(VERIFIER_KEY);
    if (!v) throw new Error('Code verifier missing – please try again.');
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: v }),
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error_description || 'Token exchange failed'); }
    const d = await r.json();
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.setItem(TOKEN_KEY, d.access_token);
    console.log('[JamCircle] ✅ Token stored');
    return d.access_token as string;
  }, []);

  /* ── Load playlists ── */
  const loadPlaylists = useCallback(async (t: string) => {
    setLoading(true); setError(null);
    console.log('[JamCircle] 📋 Fetching playlists...');
    try {
      const d = await spotifyFetch<{ items: SpotifyPlaylist[] }>('/me/playlists?limit=50', t);
      console.log('[JamCircle] ✅ Loaded', d.items.length, 'playlists');
      setPlaylists(d.items.filter(Boolean));
      setStep('playlist');
    } catch (e: any) { console.error('[JamCircle] ❌', e); setError(e.message); }
    finally { setLoading(false); }
  }, []);

  /* ── Boot: handle redirect or existing token ── */
  useEffect(() => {
    if (processingRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const err = params.get('error');

    if (code || err) window.history.replaceState({}, '', window.location.pathname);

    if (err) { setError('Spotify login was cancelled or denied.'); return; }

    if (code) {
      processingRef.current = true;
      exchangeCode(code).then(async (t) => {
        setToken(t);
        console.log('[JamCircle] Fetching user profile...');
        const u = await spotifyFetch<SpotifyUser>('/me', t);
        console.log('[JamCircle] ✅ User:', u.display_name);
        setUser(u);
        await loadPlaylists(t);
      }).catch((e: any) => { console.error('[JamCircle] ❌', e); setError(e.message); processingRef.current = false; });
      return;
    }

    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) {
      console.log('[JamCircle] 🔄 Existing token found, verifying...');
      setToken(existing);
      spotifyFetch<SpotifyUser>('/me', existing).then(async (u) => {
        console.log('[JamCircle] ✅ User:', u.display_name);
        setUser(u);
        await loadPlaylists(existing);
      }).catch((e: any) => { console.error('[JamCircle] ❌', e); localStorage.removeItem(TOKEN_KEY); setError(e.message); });
    } else {
      console.log('[JamCircle] No token found, showing connect screen');
    }
  }, [exchangeCode, loadPlaylists]);

  /* ── Select playlist ── */
  const handleSelectPlaylist = async (pl: SpotifyPlaylist) => {
    if (!token) return;
    setSelectedPlaylist(pl); setLoading(true); setError(null);
    try {
      const d = await spotifyFetch<{ items: { track: SpotifyTrack | null }[] }>('/playlists/' + pl.id + '/tracks?limit=100', token);
      const raw = d.items.map(i => i.track).filter((t): t is SpotifyTrack => !!t?.id);
      // try audio features
      let featMap: Record<string, AudioFeatures> = {};
      try {
        const ids = raw.map(t => t.id).join(',');
        const fd = await spotifyFetch<{ audio_features: (AudioFeatures | null)[] }>('/audio-features?ids=' + ids, token);
        featMap = Object.fromEntries((fd.audio_features ?? []).filter((f): f is AudioFeatures => !!f).map(f => [f.id, f]));
      } catch { /* ignore */ }
      const enriched: EnrichedTrack[] = raw.map(t => {
        const f = featMap[t.id];
        return { ...t, bpm: f ? Math.round(f.tempo) : undefined, keyName: f && f.key >= 0 ? KEY_NAMES[f.key] + (f.mode === 1 ? ' maj' : ' min') : undefined, energyLevel: f?.energy };
      });
      setTracks(enriched);
      setStep('tracks');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  /* ── Generate setlist via Anthropic ── */
  const handleGenerate = async () => {
    setLoading(true); setError(null);
    const ctx = [bandName && 'Band: ' + bandName, venue && 'Venue: ' + venue, 'Show length: ' + showLength].filter(Boolean).join('\n');
    const trackList = tracks.map((t, i) => (i + 1) + '. ' + t.name + ' by ' + t.artists.map(a => a.name).join(', ') + ' | ' + fmtDur(t.duration_ms) + ' | BPM: ' + (t.bpm ?? '?') + ' | Key: ' + (t.keyName ?? '?') + ' | Energy: ' + (t.energyLevel?.toFixed(2) ?? '?')).join('\n');
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 4096,
          system: 'You are an expert live music director. Respond with valid JSON only, no markdown, no backticks.',
          messages: [{ role: 'user', content: 'Create a professional setlist from these tracks.\n\nCONTEXT:\n' + ctx + '\n\nTRACKS (' + tracks.length + '):\n' + trackList + '\n\nReturn ONLY this JSON:\n{"setlistName":"string","theme":"string","totalDuration":"string","songCount":0,"directorNotes":"string","blocks":[{"blockNumber":1,"blockName":"string","mood":"string","songs":[{"position":1,"title":"string","artist":"string","duration":"string","bpm":0,"key":"string","energy":"high|medium|low","performanceNote":"string","transitionNote":"string"}]}],"generatedAt":"' + new Date().toISOString() + '"}' }],
        }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any)?.error?.message || 'Anthropic error ' + r.status); }
      const d = await r.json();
      const raw = (d.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
      const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      const parsed = JSON.parse(cleaned) as GeneratedSetlist;
      setSetlist(parsed);
      setStep('setlist');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  /* ── Download setlist ── */
  const downloadSetlist = () => {
    if (!setlist) return;
    const lines = ['=== ' + setlist.setlistName.toUpperCase() + ' ===', 'Theme: ' + setlist.theme, 'Duration: ' + setlist.totalDuration + ' | Songs: ' + setlist.songCount, '', 'NOTES: ' + setlist.directorNotes, ''];
    setlist.blocks.forEach(b => {
      lines.push('BLOCK ' + b.blockNumber + ': ' + b.blockName + ' (' + b.mood + ')');
      b.songs.forEach(s => { lines.push('  ' + s.position + '. ' + s.title + ' - ' + s.artist + ' [' + s.duration + (s.bpm ? ' | ' + s.bpm + 'bpm' : '') + (s.key ? ' | ' + s.key : '') + ' | ' + s.energy + ']'); if (s.performanceNote) lines.push('     ' + s.performanceNote); });
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = setlist.setlistName.replace(/[^a-z0-9]/gi, '_') + '.txt'; a.click();
  };

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); setStep('connect'); setPlaylists([]); setTracks([]); setSetlist(null); };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  const stepIndex = ['connect', 'playlist', 'tracks', 'configure', 'setlist'].indexOf(step);

  // Loading screen during auth
  if (!token && !error && step === 'connect' && new URLSearchParams(window.location.search).get('code')) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-400">Connecting to Spotify…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight"><span className="text-[#22c55e]">Jam</span>Circle</h1>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">{user.display_name}</span>
            <button onClick={logout} className="text-xs text-neutral-500 hover:text-white transition">Logout</button>
          </div>
        )}
      </header>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center gap-1">
          {['Connect', 'Playlist', 'Tracks', 'Configure', 'Setlist'].map((l, i) => (
            <div key={l} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-colors ${i <= stepIndex ? 'bg-[#22c55e]' : 'bg-neutral-800'}`} />
              <span className={`text-xs ${i <= stepIndex ? 'text-[#22c55e]' : 'text-neutral-600'}`}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={handleTryAgain} className="shrink-0 text-xs font-semibold text-red-300 border border-red-700 rounded-lg px-3 py-1.5 hover:bg-red-900/40 transition">Try Again</button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {/* ── Connect ── */}
        {step === 'connect' && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#22c55e]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </div>
            <h2 className="text-2xl font-bold">Connect Spotify</h2>
            <p className="text-neutral-400 text-center max-w-md">Link your Spotify account to import playlists and generate AI-powered setlists.</p>
            <button onClick={login} disabled={loading} className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-semibold px-8 py-3 rounded-full transition">
              {loading ? 'Connecting…' : 'Connect with Spotify'}
            </button>
          </div>
        )}

        {/* ── Playlists ── */}
        {step === 'playlist' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold mb-2">Choose a Playlist</h2>
            <p className="text-neutral-400 mb-6">Select a playlist to build your setlist from.</p>
            {loading ? (
              <div className="flex flex-col items-center py-12 gap-3"><div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" /><p className="text-sm text-neutral-500">Loading playlists…</p></div>
            ) : (
              <div className="space-y-2">
                {playlists.map(pl => (
                  <button key={pl.id} onClick={() => handleSelectPlaylist(pl)} className="w-full flex items-center gap-4 p-4 rounded-lg border border-neutral-800 hover:border-[#22c55e]/50 hover:bg-neutral-900 transition text-left">
                    {pl.images?.[0]?.url ? <img src={pl.images[0].url} alt="" className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center text-neutral-600">♪</div>}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{pl.name}</div>
                      <div className="text-sm text-neutral-500">{pl.tracks.total} tracks · {pl.owner.display_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tracks ── */}
        {step === 'tracks' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold mb-2">{selectedPlaylist?.name}</h2>
            <p className="text-neutral-400 mb-6">{tracks.length} tracks loaded</p>
            <div className="space-y-1 mb-8 max-h-[400px] overflow-y-auto pr-2">
              {tracks.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                  <span className="text-neutral-600 text-sm w-6 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-neutral-500 truncate">{t.artists.map(a => a.name).join(', ')}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500">
                    {t.bpm && <span>{t.bpm} BPM</span>}
                    {t.keyName && <span>{t.keyName}</span>}
                    <span>{fmtDur(t.duration_ms)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('playlist')} className="px-6 py-3 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-900 transition">Back</button>
              <button onClick={() => setStep('configure')} className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold px-8 py-3 rounded-full transition">Configure Setlist</button>
            </div>
          </div>
        )}

        {/* ── Configure ── */}
        {step === 'configure' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold mb-2">Configure Setlist</h2>
            <p className="text-neutral-400 mb-6">{selectedPlaylist?.name} · {tracks.length} tracks</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Band / Artist Name</label>
                <input value={bandName} onChange={e => setBandName(e.target.value)} placeholder="e.g. The Midnight Groove" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#22c55e] transition" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Venue</label>
                <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Blue Note Jazz Club" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#22c55e] transition" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Show Length</label>
                <select value={showLength} onChange={e => setShowLength(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition">
                  <option value="30 min">30 minutes</option>
                  <option value="45 min">45 minutes</option>
                  <option value="60 min">60 minutes</option>
                  <option value="90 min">90 minutes</option>
                  <option value="120 min">2 hours</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep('tracks')} className="px-6 py-3 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-900 transition">Back</button>
              <button onClick={handleGenerate} disabled={loading} className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-semibold px-8 py-3 rounded-full transition">
                {loading ? 'Generating…' : 'Generate Setlist'}
              </button>
            </div>
          </div>
        )}

        {/* ── Setlist ── */}
        {step === 'setlist' && setlist && (
          <div className="py-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{setlist.setlistName}</h2>
                <p className="text-neutral-400 text-sm mt-1">{setlist.theme} · {setlist.totalDuration} · {setlist.songCount} songs</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadSetlist} className="px-4 py-2 rounded-lg border border-neutral-700 text-sm hover:bg-neutral-900 transition">Download</button>
                <button onClick={() => { setStep('playlist'); setSetlist(null); }} className="px-4 py-2 rounded-lg border border-[#22c55e]/50 text-[#22c55e] text-sm hover:bg-[#22c55e]/10 transition">New Setlist</button>
              </div>
            </div>
            {setlist.directorNotes && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-[#22c55e] mb-1">Director&apos;s Notes</h3>
                <p className="text-sm text-neutral-300">{setlist.directorNotes}</p>
              </div>
            )}
            <div className="space-y-6">
              {setlist.blocks.map(block => (
                <div key={block.blockNumber}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold bg-[#22c55e]/10 text-[#22c55e] px-2 py-1 rounded">BLOCK {block.blockNumber}</span>
                    <span className="font-semibold">{block.blockName}</span>
                    <span className="text-xs text-neutral-500 ml-auto">{block.mood}</span>
                  </div>
                  <div className="space-y-1">
                    {block.songs.map(song => (
                      <div key={song.position} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50 hover:border-neutral-700 transition">
                        <span className="text-neutral-600 text-sm w-6 text-right">{song.position}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{song.title}</div>
                          <div className="text-xs text-neutral-500 truncate">{song.artist}</div>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500">
                          {song.bpm && <span>{song.bpm} BPM</span>}
                          {song.key && <span>{song.key}</span>}
                          <span>{song.duration}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${song.energy === 'high' ? 'bg-red-900/30 text-red-400' : song.energy === 'medium' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-blue-900/30 text-blue-400'}`}>{song.energy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
