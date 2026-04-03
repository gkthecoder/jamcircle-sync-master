import { useState, useCallback } from “react”;
import { useQuery } from “@tanstack/react-query”;
import { motion, AnimatePresence } from “framer-motion”;
import { Music2, LogOut, Zap, Download, ChevronRight, Loader2, AlertCircle, ListMusic, Mic2 } from “lucide-react”;
import { Button } from “@/components/ui/button”;
import { Input } from “@/components/ui/input”;
import { Textarea } from “@/components/ui/textarea”;
import { Badge } from “@/components/ui/badge”;
import { useToast } from “@/hooks/use-toast”;
import { useSpotifyAuth } from “@/hooks/useSpotifyAuth”;
import {
getUserPlaylists,
getPlaylistTracks,
type SpotifyPlaylist,
type EnrichedTrack,
} from “@/lib/spotify”;
import {
generateSetlist,
saveSetlist,
downloadSetlist,
type GeneratedSetlist,
type SetlistBlock,
} from “@/lib/setlist”;

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
hidden: { opacity: 0, y: 24 },
show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: “easeOut” } },
};

const stagger = {
show: { transition: { staggerChildren: 0.07 } },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function EnergyBar({ value }: { value: number }) {
const pct = Math.round(value * 100);
const color = pct > 66 ? “#f97316” : pct > 33 ? “#eab308” : “#22c55e”;
return (
<div className="flex items-center gap-2">
<div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
<div style={{ width: `${pct}%`, background: color }} className=“h-full rounded-full transition-all” />
</div>
<span className="text-xs text-white/40">{pct}%</span>
</div>
);
}

function TrackRow({ track, index }: { track: EnrichedTrack; index: number }) {
const dur = `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}`;
return (
<motion.div
variants={fadeUp}
className=“flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors”
>
<span className="text-white/20 text-sm w-5 text-right shrink-0">{index + 1}</span>
{track.album.images[0]?.url && (
<img src={track.album.images[0].url} alt="" className="w-9 h-9 rounded shrink-0 object-cover" />
)}
<div className="min-w-0 flex-1">
<p className="text-sm font-medium text-white truncate">{track.name}</p>
<p className="text-xs text-white/40 truncate">{track.artists.map((a) => a.name).join(”, “)}</p>
</div>
<div className="hidden sm:flex items-center gap-4 shrink-0 text-right">
{track.bpm && <span className="text-xs text-white/30">{track.bpm} BPM</span>}
{track.keyName && <span className="text-xs text-white/30">{track.keyName}</span>}
{track.features && <EnergyBar value={track.features.energy} />}
<span className="text-xs text-white/30 w-9">{dur}</span>
</div>
</motion.div>
);
}

function SetlistView({ setlist, onBack }: { setlist: GeneratedSetlist; onBack: () => void }) {
const energyColor = { high: “text-orange-400”, medium: “text-yellow-400”, low: “text-green-400” };
const energyDot = { high: “bg-orange-400”, medium: “bg-yellow-400”, low: “bg-green-400” };

return (
<motion.div initial=“hidden” animate=“show” variants={stagger} className=“space-y-8”>
{/* Header */}
<motion.div variants={fadeUp} className=“border-b border-white/10 pb-6”>
<div className="flex items-start justify-between gap-4 flex-wrap">
<div>
<p className="text-xs tracking-widest text-white/30 uppercase mb-1">Generated Setlist</p>
<h2 className="text-3xl font-bold text-white">{setlist.setlistName}</h2>
<p className="text-white/50 mt-1 max-w-lg">{setlist.theme}</p>
</div>
<div className="flex gap-2 flex-wrap">
<Button variant=“outline” size=“sm” onClick={() => downloadSetlist(setlist)}
className=“border-white/20 text-white/70 hover:text-white hover:bg-white/10”>
<Download className="w-3.5 h-3.5 mr-1.5" /> Export
</Button>
<Button variant="outline" size="sm" onClick={onBack}
className="border-white/20 text-white/70 hover:text-white hover:bg-white/10">
← New Setlist
</Button>
</div>
</div>

```
    <div className="flex gap-4 mt-4 flex-wrap">
      <Badge variant="secondary" className="bg-white/10 text-white/60">
        <Music2 className="w-3 h-3 mr-1" />{setlist.songCount} songs
      </Badge>
      <Badge variant="secondary" className="bg-white/10 text-white/60">
        ⏱ {setlist.totalDuration}
      </Badge>
    </div>
  </motion.div>

  {/* Director Notes */}
  <motion.div variants={fadeUp} className="rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20 p-5">
    <p className="text-xs tracking-widest text-[#1DB954] uppercase mb-2 flex items-center gap-1.5">
      <Mic2 className="w-3 h-3" /> Director's Notes
    </p>
    <p className="text-white/70 text-sm leading-relaxed">{setlist.directorNotes}</p>
  </motion.div>

  {/* Blocks */}
  {setlist.blocks.map((block: SetlistBlock) => (
    <motion.div key={block.blockNumber} variants={fadeUp} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center text-black text-xs font-bold shrink-0">
          {block.blockNumber}
        </div>
        <div>
          <h3 className="text-white font-semibold">{block.blockName}</h3>
          <p className="text-white/40 text-xs">{block.mood}</p>
        </div>
      </div>

      <div className="ml-9 space-y-2">
        {block.songs.map((song) => (
          <div key={song.position} className="rounded-lg border border-white/8 bg-white/3 p-4">
            <div className="flex items-start gap-3 flex-wrap">
              <span className="text-[#1DB954] font-bold text-lg w-7 shrink-0">{song.position}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white">{song.title}</p>
                  <span className="text-white/30 text-sm">—</span>
                  <p className="text-white/50 text-sm">{song.artist}</p>
                </div>
                <div className="flex gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-white/30">{song.duration}</span>
                  {song.bpm && <span className="text-xs text-white/30">{song.bpm} BPM</span>}
                  {song.key && <span className="text-xs text-white/30">{song.key}</span>}
                  <span className={`text-xs font-medium flex items-center gap-1 ${energyColor[song.energy]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${energyDot[song.energy]}`} />
                    {song.energy}
                  </span>
                </div>
                <p className="text-white/50 text-xs mt-2 leading-relaxed">📝 {song.performanceNote}</p>
                {song.transitionNote && (
                  <p className="text-[#1DB954]/60 text-xs mt-1.5">➜ {song.transitionNote}</p>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
type Step = “playlists” | “tracks” | “configure” | “result”;

export default function Index() {
const { status, user, error: authError, login, logout } = useSpotifyAuth();
const { toast } = useToast();
const [step, setStep] = useState<Step>(“playlists”);
const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
const [tracks, setTracks] = useState<EnrichedTrack[]>([]);
const [bandContext, setBandContext] = useState(””);
const [venueName, setVenueName] = useState(””);
const [showLength, setShowLength] = useState(“60 minutes”);
const [generating, setGenerating] = useState(false);
const [setlist, setSetlist] = useState<GeneratedSetlist | null>(null);
const [loadingTracks, setLoadingTracks] = useState(false);

const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
queryKey: [“playlists”],
queryFn: getUserPlaylists,
enabled: status === “authenticated”,
});

const handleSelectPlaylist = useCallback(async (playlist: SpotifyPlaylist) => {
setSelectedPlaylist(playlist);
setLoadingTracks(true);
try {
const t = await getPlaylistTracks(playlist.id);
setTracks(t);
setStep(“tracks”);
} catch (e) {
toast({ title: “Failed to load tracks”, description: e instanceof Error ? e.message : “Unknown error”, variant: “destructive” });
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
setStep(“result”);
} catch (e) {
toast({ title: “Generation failed”, description: e instanceof Error ? e.message : “Unknown error”, variant: “destructive” });
} finally {
setGenerating(false);
}
}, [tracks, bandContext, venueName, showLength, toast]);

// ── Unauthenticated Landing ───────────────────────────────────────────────
if (status === “loading”) {
return (
<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
<Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
</div>
);
}

if (status !== “authenticated”) {
return (
<div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 text-center">
{/* Background glow */}
<div className="absolute inset-0 overflow-hidden pointer-events-none">
<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1DB954]/5 rounded-full blur-3xl" />
</div>

```
    <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      className="relative z-10 max-w-md space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center">
            <Music2 className="w-5 h-5 text-black" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Jam Circle</span>
        </div>
        <h1 className="text-5xl font-bold text-white leading-tight">
          Turn playlists into<br />
          <span className="text-[#1DB954]">setlists.</span>
        </h1>
        <p className="text-white/50 text-lg leading-relaxed">
          Connect your Spotify, pick a playlist, and let AI craft the perfect live set — ordered by energy, key, and flow.
        </p>
      </div>

      {authError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-left">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{authError}</p>
        </div>
      )}

      <Button onClick={login} size="lg"
        className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-base h-12 rounded-full">
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Connect with Spotify
      </Button>

      <p className="text-white/20 text-xs">
        Uses Spotify's official API. We never store your music data.
      </p>
    </motion.div>
  </div>
);
```

}

// ── Authenticated App ─────────────────────────────────────────────────────
return (
<div className="min-h-screen bg-[#0a0a0a] text-white">
{/* Nav */}
<nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/80 backdrop-blur-md">
<div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center">
<Music2 className="w-3.5 h-3.5 text-black" />
</div>
<span className="font-bold text-white">Jam Circle</span>
</div>
<div className="flex items-center gap-3">
{user?.images?.[0]?.url && (
<img src={user.images[0].url} alt="" className="w-7 h-7 rounded-full" />
)}
<span className="text-white/50 text-sm hidden sm:block">{user?.display_name}</span>
<Button variant="ghost" size="sm" onClick={logout}
className="text-white/40 hover:text-white h-8 px-2">
<LogOut className="w-3.5 h-3.5" />
</Button>
</div>
</div>
</nav>

```
  <main className="max-w-4xl mx-auto px-6 py-10">
    {/* Breadcrumb */}
    {step !== "playlists" && (
      <div className="flex items-center gap-1.5 text-xs text-white/30 mb-8">
        <button onClick={() => setStep("playlists")} className="hover:text-white/60 transition-colors">
          Playlists
        </button>
        {step !== "playlists" && <ChevronRight className="w-3 h-3" />}
        {(step === "tracks" || step === "configure" || step === "result") && (
          <button onClick={() => setStep("tracks")} className="hover:text-white/60 transition-colors truncate max-w-[140px]">
            {selectedPlaylist?.name}
          </button>
        )}
        {(step === "configure" || step === "result") && <ChevronRight className="w-3 h-3" />}
        {(step === "configure" || step === "result") && (
          <button onClick={() => step === "result" ? setStep("configure") : null}
            className="hover:text-white/60 transition-colors">
            {step === "result" ? "Configure" : "Configure"}
          </button>
        )}
        {step === "result" && <ChevronRight className="w-3 h-3" />}
        {step === "result" && <span className="text-white/60">Setlist</span>}
      </div>
    )}

    <AnimatePresence mode="wait">

      {/* ── STEP 1: Playlists ── */}
      {step === "playlists" && (
        <motion.div key="playlists" initial="hidden" animate="show" exit={{ opacity: 0 }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Choose a Playlist</h1>
            <p className="text-white/40">Select the playlist you want to transform into a setlist.</p>
          </motion.div>

          {playlistsLoading || loadingTracks ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
            </div>
          ) : (
            <motion.div variants={stagger} className="grid gap-3">
              {playlists.map((pl) => (
                <motion.button
                  key={pl.id}
                  variants={fadeUp}
                  onClick={() => handleSelectPlaylist(pl)}
                  className="flex items-center gap-4 w-full rounded-xl p-4 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-[#1DB954]/40 transition-all text-left group"
                >
                  {pl.images?.[0]?.url ? (
                    <img src={pl.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <ListMusic className="w-5 h-5 text-white/30" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">{pl.name}</p>
                    <p className="text-sm text-white/40">{pl.tracks.total} tracks · {pl.owner.display_name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#1DB954] transition-colors shrink-0" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── STEP 2: Tracks ── */}
      {step === "tracks" && (
        <motion.div key="tracks" initial="hidden" animate="show" exit={{ opacity: 0 }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedPlaylist?.name}</h1>
              <p className="text-white/40 text-sm">{tracks.length} tracks loaded with audio analysis</p>
            </div>
            <Button onClick={() => setStep("configure")}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold">
              <Zap className="w-4 h-4 mr-1.5" /> Generate Setlist
            </Button>
          </motion.div>

          <motion.div variants={stagger} className="space-y-2">
            {tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex justify-center">
            <Button onClick={() => setStep("configure")}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold px-8">
              <Zap className="w-4 h-4 mr-1.5" /> Generate Setlist →
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* ── STEP 3: Configure ── */}
      {step === "configure" && (
        <motion.div key="configure" initial="hidden" animate="show" exit={{ opacity: 0 }} variants={stagger}
          className="max-w-lg mx-auto">
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Configure Your Set</h1>
            <p className="text-white/40 text-sm">
              Give the AI some context to craft the perfect setlist from {tracks.length} tracks.
            </p>
          </motion.div>

          <motion.div variants={stagger} className="space-y-6">
            <motion.div variants={fadeUp} className="space-y-2">
              <label className="text-sm text-white/60 block">Band / Artist Name</label>
              <Input value={bandContext} onChange={(e) => setBandContext(e.target.value)}
                placeholder="e.g. The Midnight Trio, DJ Kira..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#1DB954]/50" />
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-2">
              <label className="text-sm text-white/60 block">Venue Name (optional)</label>
              <Input value={venueName} onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. The Fillmore, Brooklyn Bowl..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#1DB954]/50" />
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-2">
              <label className="text-sm text-white/60 block">Target Show Length</label>
              <div className="grid grid-cols-4 gap-2">
                {["45 minutes", "60 minutes", "90 minutes", "120 minutes"].map((opt) => (
                  <button key={opt} onClick={() => setShowLength(opt)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      showLength === opt
                        ? "bg-[#1DB954]/20 border-[#1DB954]/60 text-[#1DB954]"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Button onClick={handleGenerate} disabled={generating}
                className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold h-12 text-base rounded-full">
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Crafting your setlist...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Generate Setlist</>
                )}
              </Button>
              {generating && (
                <p className="text-center text-white/30 text-xs mt-3">
                  Analyzing {tracks.length} tracks for energy, key & flow...
                </p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* ── STEP 4: Result ── */}
      {step === "result" && setlist && (
        <motion.div key="result" initial="hidden" animate="show" exit={{ opacity: 0 }}>
          <SetlistView setlist={setlist} onBack={() => setStep("playlists")} />
        </motion.div>
      )}

    </AnimatePresence>
  </main>
</div>
```

);
}
