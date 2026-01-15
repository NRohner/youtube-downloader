Below is a polished, modern **React + TypeScript + Tailwind + shadcn/ui + Framer Motion** GUI that matches your plan (single video + playlist flows, bitrate, queue/progress, history, drag/drop, paste detection, toasts, dark/light toggle). It’s designed as a **clean state machine UI** you can wire to your React Query hooks (`useVideoInfo`, `useDownload`, `useProgress`) later.

---

## 1) Install the UI building blocks (shadcn/ui)

From `frontend/`:

```bash
npx shadcn-ui@latest add button card input badge tabs separator scroll-area checkbox radio-group toast tooltip skeleton
```

Also ensure you have the toaster mounted (included below).

---

## 2) Drop-in UI Code

### `src/App.tsx`

```tsx
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

import UrlInput from "@/components/UrlInput";
import VideoPreview from "@/components/VideoPreview";
import PlaylistPreview from "@/components/PlaylistPreview";
import BitrateSelector from "@/components/BitrateSelector";
import ProgressBar from "@/components/ProgressBar";
import DownloadQueue from "@/components/DownloadQueue";
import DownloadComplete from "@/components/DownloadComplete";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Moon, Sun, Sparkles, History, Trash2 } from "lucide-react";
import type { Bitrate, DownloadProgress, PlaylistInfo, VideoInfo } from "@/types";

// --- UI-only mock helpers (replace with your hooks later) ---
type Info = VideoInfo | PlaylistInfo;

type DownloadHistoryItem = {
  id: string;
  title: string;
  type: "video" | "playlist";
  createdAt: number;
  bitrate: Bitrate;
  url: string;
};

const LS_KEY = "yae:history";

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

function safeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const { toast } = useToast();

  // theme toggle (no extra deps)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("yae:theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("yae:theme", theme);
  }, [theme]);

  // UI state
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<Info | null>(null);
  const [bitrate, setBitrate] = useState<Bitrate>("320");
  const [loadingInfo, setLoadingInfo] = useState(false);

  // “download session” UI state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  // session-based history (persisted)
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as DownloadHistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(history.slice(0, 30)));
  }, [history]);

  const selectedVideoIds = useMemo(() => {
    if (!info || info.type !== "playlist") return undefined;
    return info.videos.filter(v => v.selected).map(v => v.id);
  }, [info]);

  // --- Replace this with useVideoInfo() later ---
  async function handleFetchInfo(nextUrl: string) {
    setLoadingInfo(true);
    setInfo(null);
    setProgress(null);
    setSessionId(null);

    try {
      // Mock: detect playlist via "list=" in URL
      await new Promise(r => setTimeout(r, 650));

      const isPlaylist = /[?&]list=/.test(nextUrl);

      if (!/^https?:\/\//.test(nextUrl)) {
        throw new Error("Please enter a valid URL (must start with http/https).");
      }

      if (isPlaylist) {
        const mock: PlaylistInfo = {
          type: "playlist",
          id: "PL_" + safeId(),
          title: "Deep Focus Coding Mix — Playlist",
          videoCount: 23,
          thumbnail:
            "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
          videos: Array.from({ length: 23 }).map((_, i) => ({
            id: "VID_" + i,
            title: `Track ${i + 1} • Focus Session`,
            duration: 60 * (3 + ((i * 7) % 9)),
            durationFormatted: `${3 + ((i * 7) % 9)}:${String((i * 13) % 60).padStart(2, "0")}`,
            selected: i < 10, // preselect first 10
          })),
        };
        setInfo(mock);
      } else {
        const mock: VideoInfo = {
          type: "video",
          id: "V_" + safeId(),
          title: "3-Hour Ambient Study Session (No Ads)",
          duration: 3 * 60 * 60 + 12,
          durationFormatted: "3:00:12",
          thumbnail:
            "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
          channel: "Chill Beats Radio",
        };
        setInfo(mock);
      }
    } catch (e: any) {
      toast({
        title: "Couldn’t fetch info",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingInfo(false);
    }
  }

  // --- Replace this with useDownload() + useProgress(SSE) later ---
  async function handleStartDownload() {
    if (!info) return;

    // Validate selection for playlists
    if (info.type === "playlist") {
      const count = info.videos.filter(v => v.selected).length;
      if (count === 0) {
        toast({
          title: "No videos selected",
          description: "Select at least one video to download.",
          variant: "destructive",
        });
        return;
      }
    }

    const sid = "S_" + safeId();
    setSessionId(sid);

    // push to history
    setHistory(prev => [
      {
        id: sid,
        title: info.title,
        type: info.type,
        createdAt: Date.now(),
        bitrate,
        url,
      },
      ...prev,
    ]);

    toast({
      title: "Download started",
      description:
        info.type === "playlist"
          ? "Queue is preparing…"
          : "Preparing download…",
    });

    // Mock progress stream
    const totalVideos = info.type === "playlist" ? info.videos.filter(v => v.selected).length : 1;

    let currentVideo = 1;
    let percent = 0;

    const tick = async () => {
      const title =
        info.type === "playlist"
          ? info.videos.filter(v => v.selected)[currentVideo - 1]?.title ?? "…"
          : info.title;

      // downloading
      for (percent = 0; percent <= 100; percent += 2 + Math.random() * 7) {
        setProgress({
          status: "downloading",
          percent: Math.min(100, Math.round(percent)),
          speed: `${(1.2 + Math.random() * 4.8).toFixed(1)} MB/s`,
          eta: `${Math.max(1, Math.round((100 - percent) / 6))}s`,
          currentVideo,
          totalVideos,
          currentTitle: title,
        });
        await new Promise(r => setTimeout(r, 180));
      }

      // processing
      setProgress({
        status: "processing",
        percent: 100,
        currentVideo,
        totalVideos,
        currentTitle: title,
      });
      await new Promise(r => setTimeout(r, 900));

      if (currentVideo < totalVideos) {
        // mark one file complete in list
        setProgress(p => ({
          ...(p ?? {
            status: "downloading",
            percent: 0,
          }),
          status: "downloading",
          percent: 0,
          currentVideo: currentVideo + 1,
          totalVideos,
          currentTitle:
            info.type === "playlist"
              ? info.videos.filter(v => v.selected)[currentVideo]?.title ?? "…"
              : info.title,
        }));
        currentVideo += 1;
        return tick();
      }

      // complete
      setProgress({
        status: "complete",
        percent: 100,
        currentVideo: totalVideos,
        totalVideos,
        currentTitle: title,
        filename:
          info.type === "video"
            ? "audio.mp3"
            : undefined,
        files:
          info.type === "playlist"
            ? info.videos
                .filter(v => v.selected)
                .map(v => ({ title: v.title, filename: `${v.id}.mp3` }))
            : [{ title: info.title, filename: "audio.mp3" }],
      });

      toast({
        title: "Download complete",
        description:
          info.type === "playlist"
            ? "Your playlist is ready."
            : "Your MP3 is ready.",
      });
    };

    tick().catch(() => {
      setProgress({
        status: "error",
        percent: 0,
        error: "Download failed unexpectedly.",
      });
    });
  }

  function handleReset() {
    setInfo(null);
    setProgress(null);
    setSessionId(null);
    setUrl("");
  }

  function clearHistory() {
    setHistory([]);
    toast({ title: "History cleared" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold leading-none">
                  YouTube Audio Extractor
                </h1>
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  Local Web App
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Paste a YouTube video or playlist URL to extract high-quality audio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!info && !url && !progress}
            >
              Reset
            </Button>
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3">
              <UrlInput
                value={url}
                onChange={setUrl}
                onFetch={handleFetchInfo}
                isLoading={loadingInfo}
                onDropUrl={(droppedUrl) => {
                  setUrl(droppedUrl);
                  handleFetchInfo(droppedUrl);
                }}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <BitrateSelector value={bitrate} onChange={setBitrate} />

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleStartDownload}
                    disabled={!info || loadingInfo || progress?.status === "downloading" || progress?.status === "processing"}
                    className="w-full sm:w-auto"
                  >
                    🎵 Download Audio
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <AnimatePresence mode="popLayout">
                {loadingInfo && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-2xl border bg-card p-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      Fetching metadata…
                    </p>
                  </motion.div>
                )}

                {!loadingInfo && info?.type === "video" && (
                  <motion.div
                    key="video"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <VideoPreview info={info} />
                  </motion.div>
                )}

                {!loadingInfo && info?.type === "playlist" && (
                  <motion.div
                    key="playlist"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <PlaylistPreview
                      info={info}
                      onChange={(next) => setInfo(next)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {progress && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-4"
                  >
                    <ProgressBar progress={progress} />

                    {info?.type === "playlist" && progress && (
                      <DownloadQueue
                        playlist={info}
                        progress={progress}
                      />
                    )}

                    {progress.status === "complete" && sessionId && (
                      <DownloadComplete
                        sessionId={sessionId}
                        progress={progress}
                        isPlaylist={info?.type === "playlist"}
                      />
                    )}

                    {progress.status === "error" && (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                        <p className="font-medium text-destructive">Error</p>
                        <p className="text-sm text-muted-foreground">
                          {progress.error ?? "Something went wrong."}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* History */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Download history</h2>
              <Badge variant="secondary" className="ml-1">
                {history.length}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              disabled={history.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No downloads yet.
                </div>
              ) : (
                <div className="divide-y">
                  {history.slice(0, 10).map(item => (
                    <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.type === "playlist" ? "secondary" : "outline"}>
                            {item.type}
                          </Badge>
                          <span className="truncate font-medium">
                            {item.title}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(item.createdAt)} • {item.bitrate} kbps
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUrl(item.url);
                            handleFetchInfo(item.url);
                          }}
                        >
                          Reopen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <div className="p-4 text-xs text-muted-foreground">
                Tip: history is stored locally (session-based feel, persisted for convenience).
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Built with React • Tailwind • shadcn/ui • Framer Motion
        </footer>
      </div>
    </div>
  );
}
```

---

### `src/components/UrlInput.tsx`

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardPaste, Link2, Loader2, Wand2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onFetch: (url: string) => void;
  isLoading?: boolean;
  onDropUrl?: (url: string) => void;
};

function isLikelyYouTubeUrl(v: string) {
  return /youtu\.be|youtube\.com/.test(v);
}

export default function UrlInput({
  value,
  onChange,
  onFetch,
  isLoading,
  onDropUrl,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [justPasted, setJustPasted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validity = useMemo(() => {
    if (!value.trim()) return { kind: "empty" as const, label: "Paste a URL" };
    if (!/^https?:\/\//.test(value.trim()))
      return { kind: "bad" as const, label: "Missing http/https" };
    if (!isLikelyYouTubeUrl(value.trim()))
      return { kind: "warn" as const, label: "Not a YouTube domain?" };
    return { kind: "good" as const, label: "Looks good" };
  }, [value]);

  useEffect(() => {
    const onPaste = async () => {
      // clipboard paste detection (global)
      try {
        const text = await navigator.clipboard.readText();
        if (text && /^https?:\/\//.test(text) && isLikelyYouTubeUrl(text)) {
          setJustPasted(true);
          setTimeout(() => setJustPasted(false), 900);
          onChange(text);
        }
      } catch {
        // ignore (permissions)
      }
    };

    window.addEventListener("focus", onPaste);
    return () => window.removeEventListener("focus", onPaste);
  }, [onChange]);

  function fetchNow() {
    const v = value.trim();
    if (!v) return;
    onFetch(v);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
      inputRef.current?.focus();
    } catch {
      // ignore
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const text = e.dataTransfer.getData("text/plain");
    if (text && /^https?:\/\//.test(text)) {
      onChange(text);
      onDropUrl?.(text);
    }
  }

  return (
    <motion.div
      className={[
        "rounded-2xl border bg-card p-3 transition-colors",
        dragOver ? "border-primary/60 bg-primary/5" : "",
      ].join(" ")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                YouTube URL (drag & drop supported)
              </label>

              <Badge
                variant={
                  validity.kind === "good"
                    ? "secondary"
                    : validity.kind === "bad"
                    ? "destructive"
                    : "outline"
                }
                className={justPasted ? "animate-pulse" : ""}
              >
                {validity.label}
              </Badge>
            </div>

            <div className="mt-1 flex gap-2">
              <Input
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or …&list=…"
                className="h-11"
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchNow();
                }}
              />
              <Button
                variant="outline"
                className="h-11"
                onClick={pasteFromClipboard}
                title="Paste"
              >
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Paste
              </Button>
              <Button
                className="h-11"
                onClick={fetchNow}
                disabled={isLoading || !value.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Fetch
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {dragOver && (
        <div className="mt-2 text-xs text-muted-foreground">
          Drop a URL here to auto-fetch.
        </div>
      )}
    </motion.div>
  );
}
```

---

### `src/components/VideoPreview.tsx`

```tsx
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VideoInfo } from "@/types";

export default function VideoPreview({ info }: { info: VideoInfo }) {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <motion.img
          src={info.thumbnail}
          alt={info.title}
          className="h-40 w-full rounded-xl object-cover sm:h-28 sm:w-48"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">video</Badge>
            <p className="truncate text-sm text-muted-foreground">
              {info.channel}
            </p>
          </div>

          <h3 className="mt-2 line-clamp-2 text-base font-semibold">
            {info.title}
          </h3>

          <div className="mt-2 text-sm text-muted-foreground">
            Duration: <span className="font-medium text-foreground">{info.durationFormatted}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

---

### `src/components/PlaylistPreview.tsx`

```tsx
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlaylistInfo } from "@/types";

type Props = {
  info: PlaylistInfo;
  onChange: (next: PlaylistInfo) => void;
};

export default function PlaylistPreview({ info, onChange }: Props) {
  const selectedCount = info.videos.filter(v => v.selected).length;

  function setAll(selected: boolean) {
    onChange({
      ...info,
      videos: info.videos.map(v => ({ ...v, selected })),
    });
  }

  function toggle(id: string, selected: boolean) {
    onChange({
      ...info,
      videos: info.videos.map(v => (v.id === id ? { ...v, selected } : v)),
    });
  }

  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <motion.img
          src={info.thumbnail}
          alt={info.title}
          className="h-40 w-full rounded-xl object-cover sm:h-28 sm:w-48"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">playlist</Badge>
            <p className="text-sm text-muted-foreground">
              {info.videoCount} videos
            </p>
            <Badge variant="outline">{selectedCount} selected</Badge>
          </div>

          <h3 className="mt-2 line-clamp-2 text-base font-semibold">
            {info.title}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setAll(true)}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAll(false)}>
              Deselect all
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t p-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Videos
        </div>

        <ScrollArea className="h-72 rounded-xl border">
          <div className="divide-y">
            {info.videos.map((v, idx) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.01 }}
                className="flex items-center gap-3 p-3"
              >
                <Checkbox
                  checked={v.selected}
                  onCheckedChange={(checked) => toggle(v.id, Boolean(checked))}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {v.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v.durationFormatted}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {v.durationFormatted}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
```

---

### `src/components/BitrateSelector.tsx`

```tsx
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Bitrate } from "@/types";

const options: { v: Bitrate; label: string; hint: string }[] = [
  { v: "128", label: "128 kbps", hint: "Smallest" },
  { v: "192", label: "192 kbps", hint: "Balanced" },
  { v: "256", label: "256 kbps", hint: "High" },
  { v: "320", label: "320 kbps", hint: "Best" },
];

export default function BitrateSelector({
  value,
  onChange,
}: {
  value: Bitrate;
  onChange: (b: Bitrate) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Bitrate
        </span>
        <Badge variant="outline">{value} kbps</Badge>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as Bitrate)}
        className="flex flex-wrap gap-2"
      >
        {options.map(o => (
          <label
            key={o.v}
            className={[
              "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              value === o.v ? "border-primary/60 bg-primary/5" : "hover:bg-muted/60",
            ].join(" ")}
          >
            <RadioGroupItem value={o.v} />
            <div className="flex items-center gap-2">
              <span className="font-medium">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.hint}</span>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
```

---

### `src/components/ProgressBar.tsx`

```tsx
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DownloadProgress } from "@/types";

export default function ProgressBar({ progress }: { progress: DownloadProgress }) {
  const isProcessing = progress.status === "processing";
  const isDownloading = progress.status === "downloading";
  const isComplete = progress.status === "complete";

  return (
    <Card className="rounded-2xl p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  isComplete ? "secondary" : isProcessing ? "outline" : "default"
                }
              >
                {progress.status}
              </Badge>
              {typeof progress.currentVideo === "number" &&
                typeof progress.totalVideos === "number" && (
                  <span className="text-xs text-muted-foreground">
                    {progress.currentVideo} of {progress.totalVideos}
                  </span>
                )}
            </div>

            <div className="mt-2 truncate text-sm font-medium">
              {progress.currentTitle ? `Downloading: ${progress.currentTitle}` : "Working…"}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {isDownloading && progress.speed && <span>{progress.speed}</span>}
            {isDownloading && progress.eta && <span>ETA {progress.eta}</span>}
            <span className="font-medium text-foreground">
              {Math.max(0, Math.min(100, progress.percent))}%
            </span>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={[
              "h-full rounded-full",
              isComplete ? "bg-emerald-500" : "bg-primary",
            ].join(" ")}
            initial={{ width: 0 }}
            animate={{
              width: `${Math.max(0, Math.min(100, progress.percent))}%`,
              opacity: isProcessing ? [0.6, 1, 0.6] : 1,
            }}
            transition={{
              width: { type: "spring", stiffness: 120, damping: 20 },
              opacity: isProcessing ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 },
            }}
          />
        </div>

        {isProcessing && (
          <div className="text-xs text-muted-foreground">
            Processing audio (FFmpeg)… this can take a moment for long videos.
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

### `src/components/DownloadQueue.tsx`

```tsx
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DownloadProgress, PlaylistInfo } from "@/types";
import { CheckCircle2, AlertTriangle, Play } from "lucide-react";

export default function DownloadQueue({
  playlist,
  progress,
}: {
  playlist: PlaylistInfo;
  progress: DownloadProgress;
}) {
  const selected = playlist.videos.filter(v => v.selected);
  const currentIndex = (progress.currentVideo ?? 1) - 1;

  return (
    <Card className="rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Queue</span>
          <Badge variant="outline">{selected.length} items</Badge>
        </div>
        {typeof progress.currentVideo === "number" && typeof progress.totalVideos === "number" && (
          <div className="text-xs text-muted-foreground">
            Progress: {Math.min(progress.currentVideo, progress.totalVideos)} of {progress.totalVideos} complete
          </div>
        )}
      </div>

      <div className="space-y-2">
        {selected.slice(0, 12).map((v, i) => {
          const isCurrent = i === currentIndex && (progress.status === "downloading" || progress.status === "processing");
          const isDone = i < currentIndex || progress.status === "complete";

          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                isCurrent ? "border-primary/60 bg-primary/5" : "bg-card",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{v.title}</div>
                <div className="text-xs text-muted-foreground">{v.durationFormatted}</div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : isCurrent ? (
                  <Play className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 opacity-40" />
                )}
              </div>
            </motion.div>
          );
        })}

        {selected.length > 12 && (
          <div className="text-xs text-muted-foreground">
            Showing first 12 items. (Hook up virtualization for large playlists.)
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

### `src/components/DownloadComplete.tsx`

```tsx
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DownloadProgress } from "@/types";
import { Download, Package } from "lucide-react";

export default function DownloadComplete({
  sessionId,
  progress,
  isPlaylist,
}: {
  sessionId: string;
  progress: DownloadProgress;
  isPlaylist?: boolean;
}) {
  // Replace these hrefs with your real backend routes:
  // /api/download/{session_id}/{filename}
  // /api/download/{session_id}/zip
  const files = progress.files ?? [];

  return (
    <Card className="rounded-2xl p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">complete</Badge>
            <span className="text-sm font-medium">Ready to download</span>
          </div>

          <motion.div
            className="mt-2 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Session: <span className="font-mono">{sessionId}</span>
          </motion.div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {isPlaylist && (
            <Button asChild variant="outline">
              <a href={`/api/download/${sessionId}/zip`}>
                <Package className="mr-2 h-4 w-4" />
                Download ZIP
              </a>
            </Button>
          )}

          {!isPlaylist && progress.filename && (
            <Button asChild>
              <a href={`/api/download/${sessionId}/${encodeURIComponent(progress.filename)}`}>
                <Download className="mr-2 h-4 w-4" />
                Download MP3
              </a>
            </Button>
          )}
        </div>
      </div>

      {files.length > 1 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Files
          </div>

          <div className="space-y-2">
            {files.slice(0, 12).map((f) => (
              <div
                key={f.title}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{f.title}</div>
                  {f.error ? (
                    <div className="text-xs text-destructive">{f.error}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {f.filename}
                    </div>
                  )}
                </div>

                {f.filename && (
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`/api/download/${sessionId}/${encodeURIComponent(f.filename)}`}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      MP3
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>

          {files.length > 12 && (
            <div className="text-xs text-muted-foreground">
              Showing first 12. Add pagination/virtualization for large lists.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

---

### `src/types/index.ts`

```ts
export interface VideoInfo {
  type: "video";
  id: string;
  title: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  channel: string;
}

export interface PlaylistVideo {
  id: string;
  title: string;
  duration: number;
  durationFormatted: string;
  selected: boolean;
}

export interface PlaylistInfo {
  type: "playlist";
  id: string;
  title: string;
  videoCount: number;
  thumbnail: string;
  videos: PlaylistVideo[];
}

export interface CompletedFile {
  title: string;
  filename?: string;
  error?: string;
}

export interface DownloadProgress {
  status: "starting" | "downloading" | "processing" | "complete" | "error";
  percent: number;
  speed?: string;
  eta?: string;
  currentVideo?: number;
  totalVideos?: number;
  currentTitle?: string;
  filename?: string;
  files?: CompletedFile[];
  error?: string;
}

export type Bitrate = "128" | "192" | "256" | "320";
```

---

## 3) Tailwind + dark mode quick check

In `src/index.css`, make sure you have Tailwind base and dark mode:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

In `tailwind.config.js`, ensure:

```js
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

---

## 4) Where your real hooks plug in (clean mapping)

Replace the mock functions in `App.tsx`:

* `handleFetchInfo(url)` → `useVideoInfo().refetch({ url })` (or query keyed by `url`)
* `handleStartDownload()` → `useDownload().mutate({ url, bitrate, video_ids })`
* `setProgress(...)` mock → `useProgress(sessionId)` (SSE stream updates)

The UI already expects the exact shapes from your plan (`VideoInfo | PlaylistInfo`, `DownloadProgress`).

---

If you want, I can also provide:

* `useProgress` SSE hook with auto-reconnect + exponential backoff,
* a “processing” shimmer + skeleton layout while fetching info,
* and a “ZIP ready / individual file ready” layout that adapts to backend filenames exactly.
