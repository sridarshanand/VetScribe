import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MAX_SECONDS = 900;

const extensionFor = (mime = "") => {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
};

const micError = (err) => {
  if (err?.name === "NotAllowedError") return "Microphone access was blocked. Click the lock icon in the address bar, allow the microphone, then try again.";
  if (err?.name === "NotFoundError") return "No microphone was found. Plug one in, or upload an audio file instead.";
  if (err?.name === "NotReadableError") return "The microphone is being used by another app. Close it and try again.";
  return err?.message || "Could not start recording.";
};

function useRecorder(onFinished, onError) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("This browser cannot record audio. Use the latest Chrome or Edge, or upload an audio file.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const type = recorder.mimeType || mimeType || "audio/webm";
        finishedRef.current(new Blob(chunks, { type }), `recording.${extensionFor(type)}`);
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      onError(micError(err));
    }
  };

  useEffect(() => () => { clearInterval(timerRef.current); stop(); }, []);
  return { recording, seconds, start, stop };
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function InputPanel({ text, setText, source, setSource, onExtracted, setAlert }) {
  const [busy, setBusy] = useState(null); // "transcribing" | "extracting" | null
  const [autoExtract, setAutoExtract] = useState(true);
  const [samples, setSamples] = useState([]);
  const textRef = useRef(text);
  textRef.current = text;
  const fileRef = useRef(null);

  useEffect(() => {
    api.samples().then(setSamples).catch(() => {});
  }, []);

  const runExtract = async (value, src) => {
    setBusy("extracting");
    try {
      const result = await api.extract(value, src);
      onExtracted(result, value, src);
      const n = result.flagged_fields.length;
      setAlert({
        type: n ? "warning" : "success",
        message: n
          ? `Fields extracted. ${n} field${n > 1 ? "s need" : " needs"} your review (highlighted below).`
          : "Fields extracted. Please still read through them before saving.",
      });
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const transcribe = async (blob, filename) => {
    setBusy("transcribing");
    setAlert(null);
    try {
      const { text: heard } = await api.transcribe(blob, filename);
      const merged = textRef.current.trim() ? `${textRef.current.trim()}\n\n${heard}` : heard;
      setText(merged);
      setSource("voice");
      if (autoExtract) {
        await runExtract(merged, "voice");
      } else {
        setAlert({ type: "success", message: "Transcription added below. Fix any mistakes, then press Extract fields." });
        setBusy(null);
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message });
      setBusy(null);
    }
  };

  const { recording, seconds, start, stop } = useRecorder(transcribe, (message) => setAlert({ type: "error", message }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) transcribe(file, file.name);
  };

  const loadSample = (id) => {
    const sample = samples.find((s) => s.id === id);
    if (sample) {
      setText(sample.text);
      setSource("text");
      setAlert(null);
    }
  };

  const disabled = busy !== null || recording;

  return (
    <section className="card">
      <div className="card-head">
        <h2>1. Add the visit note</h2>
        <select aria-label="Load a sample note" defaultValue="" onChange={(e) => { loadSample(e.target.value); e.target.value = ""; }} disabled={disabled}>
          <option value="" disabled>Try a sample note</option>
          {samples.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <div className="recorder">
        {!recording ? (
          <button className="btn record" onClick={start} disabled={disabled}>
            <span className="dot" /> Record voice
          </button>
        ) : (
          <button className="btn record live" onClick={stop}>
            <span className="dot" /> Stop recording {fmt(seconds)}
          </button>
        )}
        <button className="btn ghost" onClick={() => fileRef.current?.click()} disabled={disabled}>Upload audio file</button>
        <input ref={fileRef} type="file" hidden accept="audio/*,.webm,.m4a,.mp3,.wav,.ogg,.mp4,.flac" onChange={onFile} />
        <label className="check">
          <input type="checkbox" checked={autoExtract} onChange={(e) => setAutoExtract(e.target.checked)} />
          Extract fields right after transcribing
        </label>
      </div>

      {recording && <p className="hint live-hint">Recording... speak clearly, then press Stop. Maximum 15 minutes.</p>}
      {busy === "transcribing" && <p className="hint"><span className="spinner" /> Converting your voice to text...</p>}

      <label htmlFor="note" className="sr">Visit note text</label>
      <textarea
        id="note"
        rows={9}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste the visit note here, or record your voice. Example: Bella, 3 year old spayed Labrador, 28 kg, vomiting for two days..."
        disabled={busy === "transcribing"}
      />

      <div className="row-end">
        <button className="btn ghost" onClick={() => { setText(""); setSource("text"); }} disabled={disabled || !text}>Clear text</button>
        <button className="btn primary" onClick={() => runExtract(text, source)} disabled={disabled || text.trim().length < 15}>
          {busy === "extracting" ? <><span className="spinner light" /> Extracting...</> : "Extract fields"}
        </button>
      </div>
    </section>
  );
}
