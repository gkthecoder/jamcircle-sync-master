
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, LogOut, Zap, Download, ChevronRight, Loader2, AlertCircle, ListMusic, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import {
getUserPlaylists,
getPlaylistTracks,
type SpotifyPlaylist,
type EnrichedTrack,
} from '@/lib/spotify';
import {
generateSetlist,
saveSetlist,
downloadSetlist,
type GeneratedSetlist,
type SetlistBlock,
} from '@/lib/setlist';

const fadeUp = {
hidden: { opacity: 0, y: 24 },
show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const stagger = {
show: { transition: { staggerChildren: 0.07 } },
};

function EnergyBar({ value }: { value: number }) {
const pct = Math.round(value * 100);
const color = pct > 66 ? '#f97316' : pct > 33 ? '#eab308' : '#22c55e';
return (
<div className='flex items-center gap-2'>
<div className='h-1.5 w-16 rounded-full bg-white/10 overflow-hidden'>
<div style={{ width: `${pct}%`, background: color }} className='h-full rounded-full transition-all' />
</div>
<span className='text-xs text-white/40'>{pct}%</span>
</div>
);
}

function TrackRow({ track, index }: { track: EnrichedTrack; index: number }) {
const dur = `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`;
return (
<motion.div
variants={fadeUp}
className='flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors'
>
<span className='text-white/20 text-sm w-5 text-right shrink-0'>{index + 1}</span>
{track.album.images[0]?.url && (
<img src={track.album.images[0].url} alt='' className='w-9 h-9 rounded shrink-0 object-cover' />
)}
<div className='min-w-0 flex-1'>
<p className='text-sm font-medium text-white truncate'>{track.name}</p>
<p className='text-xs text-white/40 truncate'>{track.artists.map((a) => a.name).join(', ')}</p>
</div>
<div className='hidden sm:flex items-center gap-4 shrink-0 text-right'>
{track.bpm && <span className='text-xs text-white/30'>{track.bpm} BPM</span>}
{track.keyName && <span className='text-xs text-white/30'>{track.keyName}</span>}
{track.features && <EnergyBar value={track.features.energy} />}
<span className='text-xs text-white/30 w-9'>{dur}</span>
</div>
</motion.div>
);
}

function SetlistView({ setlist, onBack }: { setlist: GeneratedSetlist; onBack: () => void }) {
const energyColor = { high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400' };
const energyDot = { high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-green-400' };

return (
<motion.div initial='hidden' animate='show' variants={stagger} className='space-y-8'>
<motion.div variants={fadeUp} className='border-b border-white/10 pb-6'>
<div className='flex items-start justify-between gap-4 flex-wrap'>
<div>
<p className='text-xs tracking-widest text-white/30 uppercase mb-1'>Generated Setlist</p>
<h2 className='text-3xl font-bold text-white'>{setlist.setlistName}</h2>
<p className='text-white/50 mt-1 max-w-lg'>{setlist.theme}</p>
</div>
<div className='flex gap-2 flex-wrap'>
<Button variant='outline' size='sm' onClick={() => downloadSetlist(setlist)}
className='border-white/20 text-white/70 hover:text-white hover:bg-white/10'>
<Download className='w-3.5 h-3.5 mr-1.5' /> Export
</Button>
<Button variant='outline' size='sm' onClick={onBack}
className='border-white/20 text-white/70 hover:text-white hover:bg-white/10'>
Back
</Button>
</div>
</div>
</motion.div>

```
  <motion.div variants={fadeUp} className='rounded-xl bg-green-500/10 border border-green-500/20 p-5'>
    <p className='text-xs tracking-widest text-green-400 uppercase mb-2 flex items-center gap-1.5'>
      <Mic2 className='w-3 h-3' /> Directors Notes
    </p>
    <p className='text-white/70 text-sm leading-relaxed'>{setlist.directorNotes}</p>
  </motion.div>

  {setlist.blocks.map((block: SetlistBlock) => (
    <motion.div key={block.blockNumber} variants={fadeUp} className='space-y-3'>
      <div className='flex items-center gap-3'>
        <div className='w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs font-bold shrink-0'>
          {block.blockNumber}
        </div>
        <div>
          <h3 className='text-white font-semibold'>{block.blockName}</h3>
          <p className='text-white/40 text-xs'>{block.mood}</p>
        </div>
      </div>
      <div className='ml-9 space-y-2'>
        {block.songs.map((song) => (
          <div key={song.position} className='rounded-lg border border-white/8 bg-white/3 p-4'>
            <div className='flex items-start gap-3 flex-wrap'>
              <span className='text-green-400 font-bold text-lg w-7 shrink-0'>{song.position}</span>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <p className='font-semibold text-white'>{song.title}</p>
                  <p className='text-white/50 text-sm'>{song.artist}</p>
                </div>
                <div className='flex gap-3 mt-1 flex-wrap'>
                  <span className='text-xs text-white/30'>{song.duration}</span>
                  {song.bpm && <span className='text-xs text-white/30'>{song.bpm} BPM</span>}
                  {song.key && <span className='text-xs text-white/30'>{song.key}</span>}
                  <span className={`text-xs font-medium flex items-center gap-1 ${energyColor[song.energy]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${energyDot[song.energy]}`} />
                    {song.energy}
                  </span>
                </div>
                <p className='text-white/50 text-xs mt-2 leading-relaxed'>{song.performanceNote}</p>
                {song.transitionNote && (
                  <p className='text-green-400/60 text-xs mt-1.5'>{song.transitionNote}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  ))}
</motion.div>
```

);
}

type Step = 'playlists' | 'tracks' | 'configure' | 'result';

export default function Index() {
const { status, user, error: authError, login, logout } = useSpotifyAuth();
const { toast } = useToast();
const [step, setStep] = useState<Step>('playlists');
const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
const [tracks, setTracks] = useState<EnrichedTrack[]>([]);
const [bandContext, setBandContext] = useState('');
const [venueName, setVenueName] = useState('');
const [showLength, setShowLength] = useState('60 minutes');
const [generating, setGenerating] = useState(false);
const [setlist, setSetlist] = useState<GeneratedSetlist | null>(null);
const [loadingTracks, setLoadingTracks] = useState(false);

const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
queryKey: ['playlists'],
queryFn: getUserPlaylists,
enabled: status === 'authenticated',
});

const handleSelectPlaylist = useCallback(async (playlist: SpotifyPlaylist) => {
setSelectedPlaylist(playlist);
setLoadingTracks(true);
try {
const t = await getPlaylistTracks(playlist.id);
setTracks(t);
setStep('tracks');
} catch (e) {
toast({ title: 'Failed to load tracks', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
} finally {
setLoadingTracks(false);
}
}, [toast]);

const handleGenerate = useCallback(async () => {
setGenerating(true);
try {
const result = await generateSetlist(tracks, { bandContext, venueName, showLength });
saveSetlist(result);
setSetlist(result);
setStep('result');
} catch (e) {
toast({ title: 'Generation failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
} finally {
setGenerating(false);
}
}, [tracks, bandContext, venueName, showLength, toast]);

if (status === 'loading') {
return (
<div className='min-h-screen bg-black flex items-center justify-center'>
<Loader2 className='w-8 h-8 animate-spin text-green-500' />
</div>
);
}

if (status !== 'authenticated') {
return (
<div className='min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center'>
<motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
className='max-w-md space-y-8'>
<div className='flex items-center justify-center gap-2'>
<div className='w-10 h-10 rounded-full bg-green-500 flex items-center justify-center'>
<Music2 className='w-5 h-5 text-black' />
</div>
<span className='text-2xl font-bold text-white'>Jam Circle</span>
</div>
<h1 className='text-5xl font-bold text-white leading-tight'>
Turn playlists into setlists.
</h1>
<p className='text-white/50 text-lg'>
Connect Spotify and let AI build your perfect live set.
</p>
{authError && (
<div className='flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-left'>
<AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
<p className='text-red-300 text-sm'>{authError}</p>
</div>
)}
<Button onClick={login} size='lg'
className='w-full bg-green-500 hover:bg-green-400 text-black font-bold h-12 rounded-full'>
Connect with Spotify
</Button>
</motion.div>
</div>
);
}

return (
<div className='min-h-screen bg-black text-white'>
<nav className='sticky top-0 z-50 border-b border-white/8 bg-black/80 backdrop-blur-md'>
<div className='max-w-4xl mx-auto px-6 h-14 flex items-center justify-between'>
<div className='flex items-center gap-2'>
<div className='w-7 h-7 rounded-full bg-green-500 flex items-center justify-center'>
<Music2 className='w-3.5 h-3.5 text-black' />
</div>
<span className='font-bold text-white'>Jam Circle</span>
</div>
<div className='flex items-center gap-3'>
{user?.images?.[0]?.url && (
<img src={user.images[0].url} alt='' className='w-7 h-7 rounded-full' />
)}
<span className='text-white/50 text-sm hidden sm:block'>{user?.display_name}</span>
<Button variant='ghost' size='sm' onClick={logout}
className='text-white/40 hover:text-white h-8 px-2'>
<LogOut className='w-3.5 h-3.5' />
</Button>
</div>
</div>
</nav>


  <main className='max-w-4xl mx-auto px-6 py-10'>
    <AnimatePresence mode='wait'>

      {step === 'playlists' && (
        <motion.div key='playlists' initial='hidden' animate='show' exit={{ opacity: 0 }} variants={stagger}>
          <motion.div variants={fadeUp} className='mb-8'>
            <h1 className='text-3xl font-bold text-white mb-2'>Choose a Playlist</h1>
            <p className='text-white/40'>Select the playlist to transform into a setlist.</p>
          </motion.div>
          {playlistsLoading || loadingTracks ? (
            <div className='flex items-center justify-center py-24'>
              <Loader2 className='w-8 h-8 animate-spin text-green-500' />
            </div>
          ) : (
            <motion.div variants={stagger} className='grid gap-3'>
              {playlists.map((pl) => (
                <motion.button key={pl.id} variants={fadeUp} onClick={() => handleSelectPlaylist(pl)}
                  className='flex items-center gap-4 w-full rounded-xl p-4 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-green-500/40 transition-all text-left group'>
                  {pl.images?.[0]?.url ? (
                    <img src={pl.images[0].url} alt='' className='w-12 h-12 rounded-lg object-cover shrink-0' />
                  ) : (
                    <div className='w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0'>
                      <ListMusic className='w-5 h-5 text-white/30' />
                    </div>
                  )}
                  <div className='min-w-0 flex-1'>
                    <p className='font-semibold text-white truncate'>{pl.name}</p>
                    <p className='text-sm text-white/40'>{pl.tracks.total} tracks</p>
                  </div>
                  <ChevronRight className='w-4 h-4 text-white/20 group-hover:text-green-500 transition-colors shrink-0' />
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {step === 'tracks' && (
        <motion.div key='tracks' initial='hidden' animate='show' exit={{ opacity: 0 }} variants={stagger}>
          <motion.div variants={fadeUp} className='flex items-center justify-between mb-6 flex-wrap gap-4'>
            <div>
              <h1 className='text-2xl font-bold text-white'>{selectedPlaylist?.name}</h1>
              <p className='text-white/40 text-sm'>{tracks.length} tracks loaded</p>
            </div>
            <Button onClick={() => setStep('configure')}
              className='bg-green-500 hover:bg-green-400 text-black font-bold'>
              <Zap className='w-4 h-4 mr-1.5' /> Generate Setlist
            </Button>
          </motion.div>
          <motion.div variants={stagger} className='space-y-2'>
            {tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))}
          </motion.div>
        </motion.div>
      )}

      {step === 'configure' && (
        <motion.div key='configure' initial='hidden' animate='show' exit={{ opacity: 0 }} variants={stagger}
          className='max-w-lg mx-auto'>
          <motion.div variants={fadeUp} className='mb-8'>
            <h1 className='text-2xl font-bold text-white mb-2'>Configure Your Set</h1>
            <p className='text-white/40 text-sm'>{tracks.length} tracks ready to arrange.</p>
          </motion.div>
          <motion.div variants={stagger} className='space-y-6'>
            <motion.div variants={fadeUp} className='space-y-2'>
              <label className='text-sm text-white/60 block'>Band or Artist Name</label>
              <Input value={bandContext} onChange={(e) => setBandContext(e.target.value)}
                placeholder='e.g. The Midnight Trio'
                className='bg-white/5 border-white/10 text-white placeholder:text-white/20' />
            </motion.div>
            <motion.div variants={fadeUp} className='space-y-2'>
              <label className='text-sm text-white/60 block'>Venue Name (optional)</label>
              <Input value={venueName} onChange={(e) => setVenueName(e.target.value)}
                placeholder='e.g. The Fillmore'
                className='bg-white/5 border-white/10 text-white placeholder:text-white/20' />
            </motion.div>
            <motion.div variants={fadeUp} className='space-y-2'>
              <label className='text-sm text-white/60 block'>Target Show Length</label>
              <div className='grid grid-cols-4 gap-2'>
                {['45 minutes', '60 minutes', '90 minutes', '120 minutes'].map((opt) => (
                  <button key={opt} onClick={() => setShowLength(opt)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      showLength === opt
                        ? 'bg-green-500/20 border-green-500/60 text-green-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Button onClick={handleGenerate} disabled={generating}
                className='w-full bg-green-500 hover:bg-green-400 text-black font-bold h-12 text-base rounded-full'>
                {generating ? (
                  <><Loader2 className='w-4 h-4 mr-2 animate-spin' /> Crafting your setlist...</>
                ) : (
                  <><Zap className='w-4 h-4 mr-2' /> Generate Setlist</>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {step === 'result' && setlist && (
        <motion.div key='result' initial='hidden' animate='show' exit={{ opacity: 0 }}>
          <SetlistView setlist={setlist} onBack={() => setStep('playlists')} />
        </motion.div>
      )}

    </AnimatePresence>
  </main>
</div>


);
}
