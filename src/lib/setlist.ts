import type { EnrichedTrack } from "./spotify";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SetlistSong {
  position: number;
  spotifyId: string;
  title: string;
  artist: string;
  duration: string;
  bpm?: number;
  key?: string;
  energy: "high" | "medium" | "low";
  performanceNote: string;
  transitionNote?: string;
}

export interface SetlistBlock {
  blockNumber: number;
  blockName: string;
  mood: string;
  songs: SetlistSong[];
}

export interface GeneratedSetlist {
  setlistName: string;
  theme: string;
  totalDuration: string;
  songCount: number;
  directorNotes: string;
  blocks: SetlistBlock[];
  generatedAt: string;
}

export interface SetlistGenerationOptions {
  bandContext?: string;
  genre?: string;
  venueName?: string;
  showLength?: string; // e.g. "90 minutes", "45 minutes"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildTrackList(tracks: EnrichedTrack[]): string {
  return tracks
    .map((t, i) => {
      const artist = t.artists.map((a) => a.name).join(", ");
      const dur = formatDuration(t.duration_ms);
      const energy = t.features?.energy?.toFixed(2) ?? "?";
      const bpm = t.bpm ?? "?";
      const key = t.keyName ?? "?";
      const valence = t.features?.valence?.toFixed(2) ?? "?";
      return `${i + 1}. "${t.name}" — ${artist} | ${dur} | BPM: ${bpm} | Key: ${key} | Energy: ${energy} | Valence: ${valence}`;
    })
    .join("\n");
}

// ─── Main Generation Function ─────────────────────────────────────────────────
export async function generateSetlist(
  tracks: EnrichedTrack[],
  options: SetlistGenerationOptions = {}
): Promise<GeneratedSetlist> {
  const { bandContext, genre, venueName, showLength } = options;

  const contextParts = [
    bandContext && `Band/Artist: ${bandContext}`,
    genre && `Genre: ${genre}`,
    venueName && `Venue: ${venueName}`,
    showLength && `Target show length: ${showLength}`,
  ].filter(Boolean);

  const contextBlock = contextParts.length
    ? contextParts.join("\n")
    : "A versatile live band performing a general set";

  const trackList = buildTrackList(tracks);

  const systemPrompt = `You are an expert live music director and setlist curator with 20 years of experience. 
You understand music theory, crowd psychology, energy management, and the art of building a memorable live show.
You ALWAYS respond with valid JSON only — no markdown, no explanation, no preamble.`;

  const userPrompt = `Create a professional live performance setlist from these Spotify tracks.

CONTEXT:
${contextBlock}

TRACKS (${tracks.length} total):
${trackList}

INSTRUCTIONS:
- Order songs to create a compelling energy arc: warm opener → build → peak → breather → climax → memorable closer
- Group into 3-5 "blocks" separated by natural breaks (e.g. banter, tuning, wardrobe)
- Consider key/BPM transitions — avoid jarring jumps
- Each song gets a short performance note (what to do, how to play it, crowd cue)
- Every transition between songs gets a brief note
- Write a director's overview with strategic highlights

Return ONLY this JSON (no markdown fences):
{
  "setlistName": "string — evocative name for this setlist",
  "theme": "string — one sentence describing the show's vibe/arc",
  "totalDuration": "string — estimated total show time e.g. '1hr 12min'",
  "songCount": number,
  "directorNotes": "string — 2-3 sentence strategic overview for the bandleader",
  "blocks": [
    {
      "blockNumber": 1,
      "blockName": "string — name for this block e.g. 'The Opening Salvo'",
      "mood": "string — e.g. 'High energy, crowd warm-up'",
      "songs": [
        {
          "position": 1,
          "spotifyId": "string — exact spotify track ID from the list",
          "title": "string — exact song title",
          "artist": "string — artist name",
          "duration": "string — e.g. '3:42'",
          "bpm": number or null,
          "key": "string or null — e.g. 'G maj'",
          "energy": "high" | "medium" | "low",
          "performanceNote": "string — specific guidance for performing this song live",
          "transitionNote": "string or null — how to transition TO the next song (null for last song in block)"
        }
      ]
    }
  ],
  "generatedAt": "${new Date().toISOString()}"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content
    ?.filter((c: { type: string }) => c.type === "text")
    .map((c: { text: string }) => c.text)
    .join("") ?? "";

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();

  try {
    return JSON.parse(cleaned) as GeneratedSetlist;
  } catch {
    throw new Error("Failed to parse setlist from AI response. Please try again.");
  }
}

// ─── Setlist Persistence ──────────────────────────────────────────────────────
const SETLISTS_KEY = "jamcircle_setlists";

export function saveSetlist(setlist: GeneratedSetlist): void {
  const existing = loadAllSetlists();
  const updated = [setlist, ...existing].slice(0, 20); // keep last 20
  localStorage.setItem(SETLISTS_KEY, JSON.stringify(updated));
}

export function loadAllSetlists(): GeneratedSetlist[] {
  try {
    const raw = localStorage.getItem(SETLISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteSetlist(generatedAt: string): void {
  const filtered = loadAllSetlists().filter((s) => s.generatedAt !== generatedAt);
  localStorage.setItem(SETLISTS_KEY, JSON.stringify(filtered));
}

// ─── Export Utilities ─────────────────────────────────────────────────────────
export function exportSetlistAsText(setlist: GeneratedSetlist): string {
  const lines: string[] = [
    `═══════════════════════════════════════`,
    `  ${setlist.setlistName.toUpperCase()}`,
    `═══════════════════════════════════════`,
    `Theme: ${setlist.theme}`,
    `Duration: ${setlist.totalDuration} | Songs: ${setlist.songCount}`,
    ``,
    `DIRECTOR'S NOTES`,
    `────────────────`,
    setlist.directorNotes,
    ``,
  ];

  setlist.blocks.forEach((block) => {
    lines.push(`▶ BLOCK ${block.blockNumber}: ${block.blockName.toUpperCase()}`);
    lines.push(`  ${block.mood}`);
    lines.push(`  ${"─".repeat(40)}`);
    block.songs.forEach((song) => {
      lines.push(`  ${song.position}. ${song.title} — ${song.artist}`);
      lines.push(`     ${song.duration}${song.bpm ? ` | ${song.bpm} BPM` : ""}${song.key ? ` | ${song.key}` : ""} | Energy: ${song.energy}`);
      lines.push(`     📝 ${song.performanceNote}`);
      if (song.transitionNote) {
        lines.push(`     ➜  ${song.transitionNote}`);
      }
      lines.push(``);
    });
  });

  lines.push(`Generated by Jam Circle — ${new Date(setlist.generatedAt).toLocaleDateString()}`);
  return lines.join("\n");
}

export function downloadSetlist(setlist: GeneratedSetlist): void {
  const text = exportSetlistAsText(setlist);
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${setlist.setlistName.replace(/[^a-z0-9]/gi, "_")}_setlist.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
