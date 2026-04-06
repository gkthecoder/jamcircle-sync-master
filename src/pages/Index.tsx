import { useState, useEffect, useCallback } from 'react';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { getUserPlaylists, getPlaylistTracks, type SpotifyPlaylist, type EnrichedTrack } from '@/lib/spotify';
import { generateSetlist, saveSetlist, downloadSetlist, type GeneratedSetlist, type SetlistGenerationOptions } from '@/lib/setlist';

type Step = 'connect' | 'playlist' | 'configure' | 'setlist';

export default function Index() {
  const { status, user, error: authError, login, logout } = useSpotifyAuth();

  const [step, setStep] = useState<Step>('connect');
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<EnrichedTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bandName, setBandName] = useState('');
  const [venue, setVenue] = useState('');
  const [showLength, setShowLength] = useState('90 min');

  const [setlist, setSetlist] = useState<GeneratedSetlist | null>(null);

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getUserPlaylists();
      setPlaylists(p);
      setStep('playlist');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConnect = async () => {
    if (status === 'authenticated') {
      await loadPlaylists();
    } else {
      await login();
    }
  };

  const handleSelectPlaylist = async (pl: SpotifyPlaylist) => {
    setSelectedPlaylist(pl);
    setLoading(true);
    setError(null);
    try {
      const t = await getPlaylistTracks(pl.id);
      setTracks(t);
      setStep('configure');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const options: SetlistGenerationOptions = {
        bandContext: bandName || undefined,
        venueName: venue || undefined,
        showLength: showLength || undefined,
      };
      const result = await generateSetlist(tracks, options);
      setSetlist(result);
      saveSetlist(result);
      setStep('setlist');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate setlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && step === 'connect' && !loading && playlists.length === 0) {
      loadPlaylists();
    }
  }, [status, step, loading, playlists.length, loadPlaylists]);

  // Show a full-screen loading state while processing OAuth callback
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-400">Connecting to Spotify...</p>
      </div>
    );
  }

  const stepIndex = ['connect', 'playlist', 'configure', 'setlist'].indexOf(step);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-[#22c55e]">Jam</span>Circle
        </h1>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">{user.display_name}</span>
            <button onClick={logout} className="text-xs text-neutral-500 hover:text-white transition">
              Logout
            </button>
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center gap-1">
          {['Connect', 'Playlist', 'Configure', 'Setlist'].map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-colors ${i <= stepIndex ? 'bg-[#22c55e]' : 'bg-neutral-800'}`} />
              <span className={`text-xs ${i <= stepIndex ? 'text-[#22c55e]' : 'text-neutral-600'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {(error || authError) && (
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error || authError}
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {step === 'connect' && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#22c55e]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Connect Spotify</h2>
            <p className="text-neutral-400 text-center max-w-md">
              Link your Spotify account to import playlists and generate AI-powered setlists.
            </p>
            <button
              onClick={handleConnect}
              disabled={loading || status === 'loading'}
              className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-semibold px-8 py-3 rounded-full transition"
            >
              {loading || status === 'loading' ? 'Connecting...' : 'Connect with Spotify'}
            </button>
          </div>
        )}

        {step === 'playlist' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold mb-2">Choose a Playlist</h2>
            <p className="text-neutral-400 mb-6">Select a playlist to build your setlist from.</p>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl)}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-neutral-800 hover:border-[#22c55e]/50 hover:bg-neutral-900 transition text-left"
                  >
                    {pl.images?.[0]?.url ? (
                      <img src={pl.images[0].url} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center text-neutral-600">&#9834;</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{pl.name}</div>
                      <div className="text-sm text-neutral-500">{pl.tracks.total} tracks &middot; {pl.owner.display_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'configure' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold mb-2">Configure Setlist</h2>
            <p className="text-neutral-400 mb-6">
              {selectedPlaylist?.name} &middot; {tracks.length} tracks loaded
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Band / Artist Name</label>
                <input
                  value={bandName}
                  onChange={(e) => setBandName(e.target.value)}
                  placeholder="e.g. The Midnight Groove"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#22c55e] transition"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Venue</label>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Blue Note Jazz Club"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#22c55e] transition"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Show Length</label>
                <select
                  value={showLength}
                  onChange={(e) => setShowLength(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition"
                >
                  <option value="30 min">30 minutes</option>
                  <option value="45 min">45 minutes</option>
                  <option value="60 min">60 minutes</option>
                  <option value="90 min">90 minutes</option>
                  <option value="120 min">2 hours</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('playlist')}
                className="px-6 py-3 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-900 transition"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-semibold px-8 py-3 rounded-full transition"
              >
                {loading ? 'Generating...' : 'Generate Setlist'}
              </button>
            </div>
          </div>
        )}

        {step === 'setlist' && setlist && (
          <div className="py-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{setlist.setlistName}</h2>
                <p className="text-neutral-400 text-sm mt-1">
                  {setlist.theme} &middot; {setlist.totalDuration} &middot; {setlist.songCount} songs
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadSetlist(setlist)}
                  className="px-4 py-2 rounded-lg border border-neutral-700 text-sm hover:bg-neutral-900 transition"
                >
                  Download
                </button>
                <button
                  onClick={() => { setStep('playlist'); setSetlist(null); }}
                  className="px-4 py-2 rounded-lg border border-[#22c55e]/50 text-[#22c55e] text-sm hover:bg-[#22c55e]/10 transition"
                >
                  New Setlist
                </button>
              </div>
            </div>

            {setlist.directorNotes && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-[#22c55e] mb-1">Director&apos;s Notes</h3>
                <p className="text-sm text-neutral-300">{setlist.directorNotes}</p>
              </div>
            )}

            <div className="space-y-6">
              {setlist.blocks.map((block) => (
                <div key={block.blockNumber}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold bg-[#22c55e]/10 text-[#22c55e] px-2 py-1 rounded">
                      BLOCK {block.blockNumber}
                    </span>
                    <span className="font-semibold">{block.blockName}</span>
                    <span className="text-xs text-neutral-500 ml-auto">{block.mood}</span>
                  </div>
                  <div className="space-y-1">
                    {block.songs.map((song) => (
                      <div
                        key={song.position}
                        className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50 hover:border-neutral-700 transition"
                      >
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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            song.energy === 'high'
                              ? 'bg-red-900/30 text-red-400'
                              : song.energy === 'medium'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-blue-900/30 text-blue-400'
                          }`}
                        >
                          {song.energy}
                        </span>
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
