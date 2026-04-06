import type { EnrichedTrack } from './spotify';

export interface SetlistSong {
  position: number;
  spotifyId: string;
  title: string;
  artist: string;
  duration: string;
  bpm?: number;
  key?: string;
  energy: 'high' | 'medium' | 'low';
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
  showLength?: string;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function buildTrackList(tracks: EnrichedTrack[]): string {
  return tracks.map((t, i) => {
    const artist = t.artists.map((a) => a.name).join(', ');
    const dur = formatDuration(t.duration_ms);
    const energy = t.features?.energy?.toFixed(2) ?? '?';
    const bpm = t.bpm ?? '?';
    const key = t.keyName ?? '?';
    return (i + 1) + '. ' + t.name + ' by ' + artist + ' | ' + dur + ' | BPM: ' + bpm + ' | Key: ' + key + ' | Energy: ' + energy;
  }).join('\n');
}

export async function generateSetlist(
  tracks: EnrichedTrack[],
  options: SetlistGenerationOptions = {}
): Promise<GeneratedSetlist> {
  const { bandContext, genre, venueName, showLength } = options;
  const contextParts = [
    bandContext ? 'Band/Artist: ' + bandContext : '',
    genre ? 'Genre: ' + genre : '',
    venueName ? 'Venue: ' + venueName : '',
    showLength ? 'Target show length: ' + showLength : '',
  ].filter(Boolean);
  const contextBlock = contextParts.length ? contextParts.join('\n') : 'A versatile live band';
  const trackList = buildTrackList(tracks);

  const systemPrompt = 'You are an expert live music director. You ALWAYS respond with valid JSON only, no markdown, no backticks, no explanation.';

  const userPrompt = 'Create a professional live performance setlist from these Spotify tracks.\n\nCONTEXT:\n' + contextBlock + '\n\nTRACKS (' + tracks.length + ' total):\n' + trackList + '\n\nReturn ONLY this JSON structure:\n{"setlistName":"string","theme":"string","totalDuration":"string","songCount":0,"directorNotes":"string","blocks":[{"blockNumber":1,"blockName":"string","mood":"string","songs":[{"position":1,"spotifyId":"string","title":"string","artist":"string","duration":"string","bpm":0,"key":"string","energy":"high","performanceNote":"string","transitionNote":"string"}]}],"generatedAt":"' + new Date().toISOString() + '"}';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || 'Claude API error ' + response.status);
  }

  const data = await response.json();
  const raw = (data.content ?? [])
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text: string }) => c.text)
    .join('');

  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  try {
    return JSON.parse(cleaned) as GeneratedSetlist;
  } catch {
    throw new Error('Failed to parse setlist from AI response. Please try again.');
  }
}

const SETLISTS_KEY = 'jamcircle_setlists';

export function saveSetlist(setlist: GeneratedSetlist): void {
  const existing = loadAllSetlists();
  const updated = [setlist, ...existing].slice(0, 20);
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

export function exportSetlistAsText(setlist: GeneratedSetlist): string {
  const lines: string[] = [
    '===================================',
    '  ' + setlist.setlistName.toUpperCase(),
    '===================================',
    'Theme: ' + setlist.theme,
    'Duration: ' + setlist.totalDuration + ' | Songs: ' + setlist.songCount,
    '',
    'DIRECTORS NOTES',
    '----------------',
    setlist.directorNotes,
    '',
  ];
  setlist.blocks.forEach((block) => {
    lines.push('BLOCK ' + block.blockNumber + ': ' + block.blockName.toUpperCase());
    lines.push('  ' + block.mood);
    block.songs.forEach((song) => {
      lines.push('  ' + song.position + '. ' + song.title + ' - ' + song.artist);
      lines.push('     ' + song.duration + (song.bpm ? ' | ' + song.bpm + ' BPM' : '') + (song.key ? ' | ' + song.key : '') + ' | Energy: ' + song.energy);
      lines.push('     ' + song.performanceNote);
      if (song.transitionNote) lines.push('     -> ' + song.transitionNote);
      lines.push('');
    });
  });
  lines.push('Generated by Jam Circle - ' + new Date(setlist.generatedAt).toLocaleDateString());
  return lines.join('\n');
}

export function downloadSetlist(setlist: GeneratedSetlist): void {
  const text = exportSetlistAsText(setlist);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = setlist.setlistName.replace(/[^a-z0-9]/gi, '_') + '_setlist.txt';
  a.click();
  URL.revokeObjectURL(url);
}
