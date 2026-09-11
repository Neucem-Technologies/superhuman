import { useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, Mic, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { askSuperhuman } from "@/lib/ask";
import { transcribeAudio } from "@/lib/stt";
import { blobToWav16k } from "@/lib/wav";
import { preprocessMic } from "@/lib/denoise";
import { parseCommands } from "@/spine/commands";
import { correctTranscript, sttKeyterms } from "@/spine/correct";
import { TAB_FOLDER } from "@/spine/classify";
import { TAB_LABELS, type ExchangeChannel, type PendingFile } from "@/spine/types";
import { formatBytes, readLocalFile } from "@/spine/vault";
import { useAppStore } from "@/spine/store";

const MAX_REC_MS = 60_000;

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      const i = s.indexOf("base64,");
      resolve(i >= 0 ? s.slice(i + 7) : s);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function UniversalChatBar() {
  const act = useAppStore((s) => s.act);
  const setTab = useAppStore((s) => s.setTab);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [voice, setVoice] = useState<"idle" | "recording" | "transcribing">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const usedVoiceRef = useRef(false);
  const filesRef = useRef<PendingFile[]>([]);
  const textRef = useRef("");
  const mediaRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: Blob[];
    mime: string;
    stopCapture: () => void;
  } | null>(null);
  const startedAt = useRef(0);
  const tickRef = useRef<number | null>(null);
  const limitRef = useRef<number | null>(null);
  const stopPromise = useRef<((blob: Blob) => void) | null>(null);
  filesRef.current = files;
  textRef.current = text;

  function clearTimers() {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (limitRef.current) window.clearTimeout(limitRef.current);
    tickRef.current = null;
    limitRef.current = null;
  }

  function releaseStream() {
    mediaRef.current?.stopCapture();
    mediaRef.current = null;
  }

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      setDragging(true);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files);
    };
    const onLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragging(false);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragleave", onLeave);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragleave", onLeave);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (mediaRef.current?.recorder.state === "recording") mediaRef.current.recorder.stop();
      releaseStream();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      taRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function transcribeBlob(blob: Blob) {
    let send = blob;
    let mime = blob.type || "audio/webm";
    let filename = "voice.webm";
    try {
      send = await blobToWav16k(blob);
      mime = "audio/wav";
      filename = "voice.wav";
    } catch {
      filename = `voice.${mime.includes("wav") ? "wav" : mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("mpeg") || mime.includes("mp3") ? "mp3" : "webm"}`;
    }
    const base64 = await blobToBase64(send);
    return transcribeAudio({
      data: {
        base64,
        mime,
        filename,
        keyterms: sttKeyterms(useAppStore.getState()),
      },
    });
  }

  async function handleUtterance(query: string, channel: ExchangeChannel, attached: PendingFile[]) {
    const trimmed = query.trim();
    if ((!trimmed && attached.length === 0) || busy) return;
    setBusy(true);
    try {
      const cmds = trimmed ? parseCommands(trimmed, useAppStore.getState()) : [];
      if (cmds.length) {
        for (const c of cmds) {
          const r = act(c.type, c.payload);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
        }
        const primary = cmds[0]!;
        const reply = cmds.map((c) => c.reply).join(" ");
        let filed = act("chat.ask", {
          tab: primary.tab,
          channel,
          title: primary.title,
          query: trimmed,
          response: reply,
          folderName: TAB_FOLDER[primary.tab],
          files: attached,
        });
        if (!filed.ok) {
          filed = act("chat.ask", {
            tab: "notes",
            channel,
            title: primary.title,
            query: trimmed,
            response: reply,
            files: attached,
          });
        }
        if (!filed.ok) {
          toast.error(filed.error);
          return;
        }
        setText("");
        setFiles([]);
        usedVoiceRef.current = false;
        if (primary.navigate) setTab(primary.tab);
        toast(reply, {
          action: { label: "Open", onClick: () => setTab(primary.tab) },
        });
        return;
      }

      const result = await askSuperhuman({ data: { query: trimmed, channel, files: attached } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      let filed = act("chat.ask", {
        tab: result.tab,
        channel,
        title: result.title,
        query: trimmed,
        response: result.response,
        folderName: result.folderName,
        sideEffectKind: result.sideEffectKind,
        sideEffectTitle: result.sideEffectTitle,
        files: attached,
      });
      if (!filed.ok) {
        filed = act("chat.ask", {
          tab: "notes",
          channel,
          title: result.title,
          query: trimmed,
          response: result.response,
          folderName: result.folderName,
          files: attached,
        });
      }
      if (!filed.ok) {
        toast.error(filed.error);
        return;
      }
      setText("");
      setFiles([]);
      usedVoiceRef.current = false;
      toast(`Filed to ${TAB_LABELS[result.tab]}`, {
        action: {
          label: "Open",
          onClick: () => setTab(result.tab),
        },
      });
    } catch {
      toast.error("Couldn’t reach LivinSync.");
    } finally {
      setBusy(false);
    }
  }

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).slice(0, 4);
    const read = await Promise.all(incoming.map((f) => readLocalFile(f)));
    const nextFiles = [...filesRef.current, ...read].slice(0, 4);
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    const audio = incoming.find((f) => f.type.startsWith("audio/"));
    if (audio) {
      setVoice("transcribing");
      try {
        const result = await transcribeBlob(audio);
        if (result.ok) {
          usedVoiceRef.current = true;
          const heard = correctTranscript(result.text, useAppStore.getState());
          const query = `${textRef.current} ${heard}`.replace(/\s+/g, " ").trim();
          textRef.current = query;
          setText(query);
          await handleUtterance(query, "voice", nextFiles);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Couldn’t transcribe that file.");
      } finally {
        setVoice("idle");
      }
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("This browser can’t record audio. Attach a voice file instead.");
      return;
    }
    const mime = pickRecorderMime();
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 16000 },
          // Chromium extra: stronger NS than the default APM
          ...({ voiceIsolation: true } as MediaTrackConstraints),
        },
      });
    } catch {
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast.error("Mic permission is needed to transcribe.");
        return;
      }
    }
    const capture = preprocessMic(mic);
    const stream = capture.stream;
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
      stopPromise.current?.(blob);
      stopPromise.current = null;
    };
    mediaRef.current = { recorder, stream, chunks, mime: recorder.mimeType || mime, stopCapture: capture.stop };
    startedAt.current = Date.now();
    setElapsed(0);
    setVoice("recording");
    recorder.start(250);
    tickRef.current = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    limitRef.current = window.setTimeout(() => {
      void finishRecording();
    }, MAX_REC_MS);
  }

  function collectRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const media = mediaRef.current;
      if (!media) {
        reject(new Error("No recording"));
        return;
      }
      const finish = (blob: Blob) => {
        if (!stopPromise.current) return;
        stopPromise.current = null;
        resolve(blob);
      };
      stopPromise.current = finish;
      const watchdog = window.setTimeout(() => {
        finish(new Blob(media.chunks, { type: media.mime || "audio/webm" }));
      }, 1500);
      const inner = finish;
      stopPromise.current = (blob) => {
        window.clearTimeout(watchdog);
        inner(blob);
      };
      clearTimers();
      if (media.recorder.state === "recording") media.recorder.stop();
      else finish(new Blob(media.chunks, { type: media.mime || "audio/webm" }));
    });
  }

  async function finishRecording() {
    if (!mediaRef.current) return;
    setVoice("transcribing");
    let blob: Blob;
    try {
      blob = await collectRecording();
    } catch {
      releaseStream();
      setVoice("idle");
      toast.error("Recording failed.");
      return;
    }
    releaseStream();
    if (blob.size < 256) {
      setVoice("idle");
      toast.error("No speech captured.");
      return;
    }
    try {
      const result = await transcribeBlob(blob);
      if (!result.ok) {
        toast.error(result.error);
        const pending = await readLocalFile(new File([blob], "voice-memo.webm", { type: blob.type || "audio/webm" }));
        setFiles((prev) => [...prev, pending].slice(0, 4));
        setVoice("idle");
        return;
      }
      usedVoiceRef.current = true;
      const heard = correctTranscript(result.text, useAppStore.getState());
      const query = `${textRef.current} ${heard}`.replace(/\s+/g, " ").trim();
      textRef.current = query;
      setText(query);
      setVoice("idle");
      await handleUtterance(query, "voice", filesRef.current);
      return;
    } catch {
      toast.error("Couldn’t transcribe.");
    } finally {
      setVoice("idle");
    }
  }

  function toggleVoice() {
    if (voice === "transcribing" || busy) return;
    if (voice === "recording") void finishRecording();
    else void startRecording();
  }

  async function submit() {
    if (voice === "recording") {
      await finishRecording();
      return;
    }
    if (voice === "transcribing") return;
    const query = textRef.current.trim();
    const attached = filesRef.current;
    if ((!query && attached.length === 0) || busy) return;
    const usedVoice = usedVoiceRef.current;
    const channel: ExchangeChannel = usedVoice && query ? "voice" : attached.length && !query ? "file" : "text";
    await handleUtterance(query, channel, attached);
  }

  const canSend = (text.trim().length > 0 || files.length > 0) && !busy && voice !== "transcribing";
  const recording = voice === "recording";
  const transcribing = voice === "transcribing";

  return (
    <div className="relative z-20 shrink-0 px-6 py-2 md:px-12 md:pb-4">
      <div className="mx-auto w-full max-w-3xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className={cn(
            "glass rounded-xl p-2 text-foreground transition-[box-shadow] duration-150",
            dragging ? "shadow-border-hover" : "focus-within:shadow-border-hover",
          )}
        >
          {files.length > 0 && (
            <ul className="mb-1.5 flex flex-wrap gap-1.5 px-1">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-sm bg-accent-foreground/10 px-2 py-1 text-xs"
                >
                  <span className="max-w-40 truncate">{f.name}</span>
                  <span className="text-accent-foreground/55">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    className="relative size-5 after:absolute after:top-1/2 after:left-1/2 after:size-8 after:-translate-x-1/2 after:-translate-y-1/2"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {recording && (
            <p className="px-2 pb-1 font-mono text-xs tabular-nums text-bad">
              Recording {formatElapsed(elapsed)} — tap mic to run
            </p>
          )}
          {transcribing && <p className="px-2 pb-1 text-xs text-accent-foreground/60">Transcribing…</p>}
          <div className="flex items-end gap-1">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              aria-label="Attach files"
              className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:text-foreground"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </button>
            <textarea
              ref={taRef}
              rows={1}
              value={text}
              disabled={busy || transcribing}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={
                transcribing
                  ? "Transcribing…"
                  : recording
                    ? "Speak a command…"
                    : busy
                      ? "Running…"
                      : "Type, speak, or attach — try taken or nidra"
              }
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-subtle focus-visible:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              aria-label={recording ? "Stop and transcribe" : transcribing ? "Transcribing" : "Record voice"}
              aria-pressed={recording}
              disabled={transcribing || busy}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-md",
                recording ? "bg-bad/20 text-bad" : "text-accent-foreground/65 hover:text-accent-foreground",
              )}
              onClick={toggleVoice}
            >
              {transcribing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : recording ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <Mic className="size-4" />
              )}
            </button>
            <button
              type="submit"
              aria-label="Send"
              disabled={!canSend}
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground disabled:opacity-40"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
