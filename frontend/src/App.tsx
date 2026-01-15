import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Moon,
  Sun,
  Link2,
  ClipboardPaste,
  Wand2,
  Loader2,
  Play,
  CheckCircle2,
  Download,
  Package,
  History,
  Trash2,
} from "lucide-react";

type Bitrate = "128" | "192" | "256" | "320";

type VideoInfo = {
  type: "video";
  id: string;
  title: string;
  durationFormatted: string;
  thumbnail: string;
  channel: string;
};

type PlaylistVideo = {
  id: string;
  title: string;
  durationFormatted: string;
  selected: boolean;
};

type PlaylistInfo = {
  type: "playlist";
  id: string;
  title: string;
  videoCount: number;
  thumbnail: string;
  videos: PlaylistVideo[];
};

type CompletedFile = { title: string; filename?: string; error?: string };

type DownloadProgress = {
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
};

type Info = VideoInfo | PlaylistInfo;

type HistoryItem = {
  id: string;
  title: string;
  type: "video" | "playlist";
  createdAt: number;
  bitrate: Bitrate;
  url: string;
};

function clsx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function validateUrl(valueRaw: string): { kind: "empty" | "bad" | "good"; label: string } {
  const value = valueRaw.trim();

  if (!value) return { kind: "empty", label: "Paste a YouTube URL" };

  if (!/^https?:\/\//.test(value)) {
    return { kind: "bad", label: "URL must start with http:// or https://" };
  }

  if (!/(?:^https?:\/\/)(?:www\.)?(?:youtube\.com|youtu\.be)/i.test(value)) {
    return { kind: "bad", label: "Only YouTube URLs are supported" };
  }

  return { kind: "good", label: "Valid YouTube URL" };
}

function Badge({
  children,
  variant = "secondary",
}: {
  children: React.ReactNode;
  variant?: "secondary" | "outline" | "destructive" | "default";
}) {
  const map: Record<string, string> = {
    secondary: "bg-slate-900/5 text-slate-700 dark:bg-slate-100/10 dark:text-slate-100",
    outline: "border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-100",
    destructive: "bg-rose-600 text-white",
    default: "bg-rose-600 text-white",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", map[variant])}>
      {children}
    </span>
  );
}

function Button({
  children,
  variant = "default",
  size = "md",
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "md" | "sm" | "icon";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const v =
    variant === "default"
      ? "bg-rose-600 text-white hover:bg-rose-600/90"
      : variant === "outline"
      ? "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900/70 dark:text-slate-100"
      : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200";
  const s = size === "icon" ? "h-10 w-10" : size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4";
  return (
    <button onClick={onClick} disabled={disabled} className={clsx(base, v, s, className)}>
      {children}
    </button>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950",
        className
      )}
    >
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none",
        "placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500/30",
        "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
        props.className
      )}
    />
  );
}

function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("max-h-72 overflow-auto", className)}>{children}</div>;
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={clsx(
        "h-5 w-5 rounded border flex items-center justify-center",
        checked ? "border-rose-600 bg-rose-600" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
      )}
      aria-checked={checked}
      role="checkbox"
    >
      {checked ? <CheckCircle2 className="h-4 w-4 text-white" /> : null}
    </button>
  );
}

function UrlInput({
  value,
  setValue,
  onFetch,
  loading,
}: {
  value: string;
  setValue: (v: string) => void;
  onFetch: (u: string) => void;
  loading: boolean;
}) {
  const validity = useMemo(() => validateUrl(value), [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">
          <Link2 className="h-4 w-4 text-slate-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">YouTube URL (drag & drop supported)</div>
            <Badge variant={validity.kind === "good" ? "secondary" : validity.kind === "bad" ? "destructive" : "outline"}>
              {validity.label}
            </Badge>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or ...&list=..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && validity.kind === "good") onFetch(value.trim());
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText();
                    if (t) setValue(t);
                  } catch {
                    // ignore
                  }
                }}
              >
                <ClipboardPaste className="mr-2 h-4 w-4" /> Paste
              </Button>
              <Button onClick={() => onFetch(value.trim())} disabled={loading || validity.kind !== "good"}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Fetch
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BitrateSelector({ value, setValue }: { value: Bitrate; setValue: (b: Bitrate) => void }) {
  const options: Array<{ v: Bitrate; label: string; hint: string }> = [
    { v: "128", label: "128 kbps", hint: "Smallest" },
    { v: "192", label: "192 kbps", hint: "Balanced" },
    { v: "256", label: "256 kbps", hint: "High" },
    { v: "320", label: "320 kbps", hint: "Best" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Bitrate</div>
        <Badge variant="outline">{value} kbps</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => setValue(o.v)}
            className={clsx(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
              value === o.v
                ? "border-rose-500/60 bg-rose-500/10 dark:bg-rose-500/10"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            )}
          >
            <span
              className={clsx(
                "h-3 w-3 rounded-full border",
                value === o.v ? "border-rose-600 bg-rose-600" : "border-slate-300 dark:border-slate-700"
              )}
            />
            <span className="font-medium text-slate-900 dark:text-slate-100">{o.label}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VideoPreview({ info }: { info: VideoInfo }) {
  return (
    <Card className="overflow-hidden">
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
            <Badge>video</Badge>
            <div className="truncate text-sm text-slate-500 dark:text-slate-400">{info.channel}</div>
          </div>
          <div className="mt-2 line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">{info.title}</div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Duration: <span className="font-medium text-slate-900 dark:text-slate-100">{info.durationFormatted}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PlaylistPreview({ info, setInfo }: { info: PlaylistInfo; setInfo: (p: PlaylistInfo) => void }) {
  const selectedCount = info.videos.filter((v) => v.selected).length;
  const setAll = (selected: boolean) => setInfo({ ...info, videos: info.videos.map((v) => ({ ...v, selected })) });
  const toggle = (id: string, selected: boolean) =>
    setInfo({ ...info, videos: info.videos.map((v) => (v.id === id ? { ...v, selected } : v)) });

  return (
    <Card className="overflow-hidden">
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
            <Badge>playlist</Badge>
            <div className="text-sm text-slate-500 dark:text-slate-400">{info.videoCount} videos</div>
            <Badge variant="outline">{selectedCount} selected</Badge>
          </div>
          <div className="mt-2 line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">{info.title}</div>
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

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Videos</div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800">
          <ScrollArea>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {info.videos.map((v, idx) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.01 }}
                  className="flex items-center gap-3 p-3"
                >
                  <Checkbox checked={v.selected} onChange={(c) => toggle(v.id, c)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{v.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{v.durationFormatted}</div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{v.durationFormatted}</div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}

function ProgressCard({ progress }: { progress: DownloadProgress }) {
  const isProcessing = progress.status === "processing";
  const isComplete = progress.status === "complete";

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={isComplete ? "secondary" : isProcessing ? "outline" : "default"}>{progress.status}</Badge>
              {typeof progress.currentVideo === "number" && typeof progress.totalVideos === "number" ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {progress.currentVideo} of {progress.totalVideos}
                </div>
              ) : null}
            </div>
            <div className="mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {progress.currentTitle ? `Downloading: ${progress.currentTitle}` : "Working..."}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {progress.status === "downloading" && progress.speed ? <span>{progress.speed}</span> : null}
            {progress.status === "downloading" && progress.eta ? <span>ETA {progress.eta}</span> : null}
            <span className="font-medium text-slate-900 dark:text-slate-100">{Math.max(0, Math.min(100, progress.percent))}%</span>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
          <motion.div
            className={clsx("h-full rounded-full", isComplete ? "bg-emerald-500" : "bg-rose-600")}
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

        {isProcessing ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">Processing audio (FFmpeg)... this can take a moment for long videos.</div>
        ) : null}
      </div>
    </Card>
  );
}

function QueueCard({ playlist, progress }: { playlist: PlaylistInfo; progress: DownloadProgress }) {
  const selected = playlist.videos.filter((v) => v.selected);
  const currentIndex = (progress.currentVideo ?? 1) - 1;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Queue</div>
          <Badge variant="outline">{selected.length} items</Badge>
        </div>
        {typeof progress.currentVideo === "number" && typeof progress.totalVideos === "number" ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Progress: {Math.min(progress.currentVideo, progress.totalVideos)} of {progress.totalVideos} complete
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {selected.slice(0, 10).map((v, i) => {
          const isCurrent = i === currentIndex && (progress.status === "downloading" || progress.status === "processing");
          const isDone = i < currentIndex || progress.status === "complete";
          return (
            <div
              key={v.id}
              className={clsx(
                "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                isCurrent ? "border-rose-500/60 bg-rose-500/10" : "border-slate-200 dark:border-slate-800"
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{v.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{v.durationFormatted}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : isCurrent ? (
                  <Play className="h-4 w-4 text-rose-600" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CompleteCard({ sessionId, progress, isPlaylist }: { sessionId: string; progress: DownloadProgress; isPlaylist: boolean }) {
  const files = progress.files ?? [];
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">complete</Badge>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Ready to download</div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Session: <span className="font-mono">{sessionId}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isPlaylist ? (
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" /> Download ZIP
            </Button>
          ) : (
            <Button>
              <Download className="mr-2 h-4 w-4" /> Download MP3
            </Button>
          )}
        </div>
      </div>

      {files.length > 1 ? (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Files</div>
          <div className="space-y-2">
            {files.slice(0, 8).map((f) => (
              <div
                key={f.title}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{f.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{f.filename}</div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> MP3
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function safeId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeVideo(): VideoInfo {
  return {
    type: "video",
    id: "V_demo",
    title: "3-Hour Ambient Study Session (No Ads)",
    durationFormatted: "3:00:12",
    thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    channel: "Chill Beats Radio",
  };
}

function makePlaylist(): PlaylistInfo {
  return {
    type: "playlist",
    id: "PL_demo",
    title: "Deep Focus Coding Mix - Playlist",
    videoCount: 18,
    thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
    videos: Array.from({ length: 18 }).map((_, i) => ({
      id: `VID_${i}`,
      title: `Track ${i + 1} - Focus Session`,
      durationFormatted: `${3 + ((i * 7) % 9)}:${String((i * 13) % 60).padStart(2, "0")}`,
      selected: i < 10,
    })),
  };
}

const LS_HISTORY_KEY = "yae:history";
const LS_THEME_KEY = "yae:theme";

export default function App() {
  // Theme
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(LS_THEME_KEY);
    return saved !== "light";
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(LS_THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  // State
  const [url, setUrl] = useState("");
  const [bitrate, setBitrate] = useState<Bitrate>("320");
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  // History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
  }, [history]);

  // Handlers
  async function handleFetch(inputUrl: string) {
    if (!inputUrl) return;

    setLoading(true);
    setInfo(null);
    setProgress(null);
    setSessionId(null);

    try {
      // Simulate API call - replace with real API later
      await new Promise((r) => setTimeout(r, 800));

      const isPlaylist = /[?&]list=/.test(inputUrl);

      if (isPlaylist) {
        setInfo(makePlaylist());
      } else {
        setInfo(makeVideo());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!info) return;

    if (info.type === "playlist") {
      const count = info.videos.filter((v) => v.selected).length;
      if (count === 0) {
        alert("Please select at least one video to download.");
        return;
      }
    }

    const sid = "S_" + safeId();
    setSessionId(sid);

    // Add to history
    setHistory((prev) => [
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

    // Simulate download progress
    const totalVideos = info.type === "playlist" ? info.videos.filter((v) => v.selected).length : 1;
    let currentVideo = 1;

    const tick = async () => {
      const title =
        info.type === "playlist"
          ? info.videos.filter((v) => v.selected)[currentVideo - 1]?.title ?? "..."
          : info.title;

      // Downloading phase
      for (let percent = 0; percent <= 100; percent += 2 + Math.random() * 7) {
        setProgress({
          status: "downloading",
          percent: Math.min(100, Math.round(percent)),
          speed: `${(1.2 + Math.random() * 4.8).toFixed(1)} MB/s`,
          eta: `${Math.max(1, Math.round((100 - percent) / 6))}s`,
          currentVideo,
          totalVideos,
          currentTitle: title,
        });
        await new Promise((r) => setTimeout(r, 150));
      }

      // Processing phase
      setProgress({
        status: "processing",
        percent: 100,
        currentVideo,
        totalVideos,
        currentTitle: title,
      });
      await new Promise((r) => setTimeout(r, 700));

      if (currentVideo < totalVideos) {
        currentVideo += 1;
        return tick();
      }

      // Complete
      setProgress({
        status: "complete",
        percent: 100,
        currentVideo: totalVideos,
        totalVideos,
        currentTitle: title,
        filename: info.type === "video" ? "audio.mp3" : undefined,
        files:
          info.type === "playlist"
            ? info.videos.filter((v) => v.selected).map((v) => ({ title: v.title, filename: `${v.id}.mp3` }))
            : [{ title: info.title, filename: "audio.mp3" }],
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
    setUrl("");
    setInfo(null);
    setProgress(null);
    setSessionId(null);
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <div className={clsx("min-h-screen transition-colors", dark ? "dark bg-slate-900" : "bg-slate-50")}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15">
              <Sparkles className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold leading-none text-slate-900 dark:text-slate-100">YouTube Audio Extractor</h1>
                <span className="hidden sm:inline-flex">
                  <Badge variant="secondary">Local Web App</Badge>
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Paste a YouTube video or playlist URL to extract high-quality audio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={!url && !info && !progress}>
              Reset
            </Button>
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
          <Card className="overflow-hidden">
            <div className="space-y-3 p-4">
              <UrlInput value={url} setValue={setUrl} onFetch={handleFetch} loading={loading} />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <BitrateSelector value={bitrate} setValue={setBitrate} />
                <Button
                  onClick={handleDownload}
                  disabled={!info || loading || progress?.status === "downloading" || progress?.status === "processing"}
                  className="w-full sm:w-auto"
                >
                  Download Audio
                </Button>
              </div>
            </div>

            <div className="space-y-6 p-4 pt-0">
              <AnimatePresence mode="popLayout">
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching metadata...
                    </div>
                  </motion.div>
                )}

                {!loading && info?.type === "video" && (
                  <motion.div key="video" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <VideoPreview info={info} />
                  </motion.div>
                )}

                {!loading && info?.type === "playlist" && (
                  <motion.div key="playlist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <PlaylistPreview info={info} setInfo={(p) => setInfo(p)} />
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
                    <ProgressCard progress={progress} />

                    {info?.type === "playlist" && <QueueCard playlist={info} progress={progress} />}

                    {progress.status === "complete" && sessionId && (
                      <CompleteCard sessionId={sessionId} progress={progress} isPlaylist={info?.type === "playlist"} />
                    )}

                    {progress.status === "error" && (
                      <Card className="border-rose-500/30 bg-rose-500/10 p-4">
                        <div className="font-medium text-rose-600">Error</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{progress.error ?? "Something went wrong."}</div>
                      </Card>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>

        {/* History */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Download history</div>
              <Badge variant="outline">{history.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={clearHistory} disabled={history.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>

          <Card>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {history.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No downloads yet.</div>
              ) : (
                history.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.type === "playlist" ? "secondary" : "outline"}>{item.type}</Badge>
                        <div className="truncate font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(item.createdAt).toLocaleString()} - {item.bitrate} kbps
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUrl(item.url);
                        handleFetch(item.url);
                      }}
                    >
                      Reopen
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Tip: history is stored locally (session-based feel, persisted for convenience).
            </div>
          </Card>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Built with React - Tailwind - Framer Motion
        </div>
      </div>
    </div>
  );
}
