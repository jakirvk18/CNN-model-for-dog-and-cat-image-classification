import { useState, useRef, useCallback, useEffect } from "react";

const API = "ip:port"; // Change this to your FastAPI server address

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,400&family=DM+Sans:wght@400;500;600&display=swap');`;

/* ── Confidence Arc (radial progress) ─────────────────────── */
function ConfArc({ value, color, label, emoji }) {
  const r = 28, cx = 36, cy = 36;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (value / 100) * circ), 120);
    return () => clearTimeout(t);
  }, [value, circ]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={5} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{ marginTop: -58, height: 72, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'DM Sans', sans-serif", letterSpacing: 0 , marginTop : 20 }}>{value}%</span>
      </div>
      <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ── Result Card ───────────────────────────────────────────── */
function ResultCard({ result }) {
  const isDog = result.prediction === "Dog";
  const bg = isDog ? "var(--dog-bg)" : "var(--cat-bg)";
  const accent = isDog ? "var(--dog)" : "var(--cat)";
  const tier = result.confidence_tier;

  return (
    <div className="result-card" style={{ background: bg }}>
      <div className="result-hero">
        <div className="result-emoji">{result.emoji}</div>
        <div>
          <div className="result-label">It&apos;s a</div>
          <div className="result-name" style={{ color: accent }}>{result.prediction}</div>
          <span className="confidence-pill" style={{ background: accent }}>
            {tier} Confidence
          </span>
        </div>
      </div>

      <div className="arc-row">
        <ConfArc value={result.probabilities.Cat} color="var(--cat)" label="Cat" emoji="🐱" />
        <div className="arc-divider" />
        <ConfArc value={result.probabilities.Dog} color="var(--dog)" label="Dog" emoji="🐶" />
      </div>

      <div className="meta-row">
        <div className="meta-chip">
          <span className="meta-val">{result.confidence}%</span>
          <span className="meta-key">Confidence</span>
        </div>
        <div className="meta-chip">
          <span className="meta-val">{result.inference_ms}ms</span>
          <span className="meta-key">Inference</span>
        </div>
        <div className="meta-chip">
          <span className="meta-val">{result.source === "camera" ? "📷" : "📁"}</span>
          <span className="meta-key">{result.source === "camera" ? "Camera" : "Upload"}</span>
        </div>
      </div>

      {!result.model_loaded && (
        <p className="demo-note">⚠ Demo mode — save dogcat_model.pth for real predictions</p>
      )}
    </div>
  );
}

/* ── Camera Panel ──────────────────────────────────────────── */
function CameraPanel({ onCapture, loading }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreaming(true);
    } catch {
      setError("Camera access denied — please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capture = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (blob) onCapture(new File([blob], "capture.jpg", { type: "image/jpeg" }), "camera");
    }, "image/jpeg", 0.92);
  }, [onCapture]);

  return (
    <div className="panel-body">
      <div className="viewfinder">
        <video ref={videoRef} className={streaming ? "active" : ""} muted playsInline />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {!streaming && !error && (
          <div className="viewfinder-idle">
            <div className="cam-icon">📷</div>
            <p>Tap to start camera</p>
          </div>
        )}
        {streaming && (
          <>
            <div className="vf-corner vf-tl" /><div className="vf-corner vf-tr" />
            <div className="vf-corner vf-bl" /><div className="vf-corner vf-br" />
            <div className="scan-line" />
          </>
        )}
        {error && <div className="viewfinder-error">{error}</div>}
      </div>

      {!streaming ? (
        <button className="btn btn-primary" onClick={startCamera}>Start Camera</button>
      ) : (
        <div className="btn-row">
          <button className="btn btn-capture" onClick={capture} disabled={loading}>
            {loading ? <span className="spinner-sm" /> : <span className="shutter" />}
          </button>
          <button className="btn btn-ghost" onClick={stopCamera}>Stop</button>
        </div>
      )}
    </div>
  );
}

/* ── Upload Panel ──────────────────────────────────────────── */
function UploadPanel({ onUpload, loading }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file?.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    onUpload(file, "upload");
  }, [onUpload]);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  return (
    <div className="panel-body">
      <div
        className={`dropzone ${dragging ? "dragover" : ""} ${preview ? "has-preview" : ""}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img src={preview} alt="preview" className="preview-img" />
        ) : (
          <div className="drop-idle">
            <div className="drop-icon">🖼️</div>
            <p className="drop-title">Drop your photo here</p>
            <p className="drop-sub">JPG · PNG · WEBP</p>
          </div>
        )}
        {loading && <div className="drop-overlay"><div className="spinner" /></div>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />
      <button className="btn btn-primary" onClick={() => inputRef.current.click()}>
        {loading ? "Analysing…" : preview ? "Choose Another" : "Browse Photos"}
      </button>
    </div>
  );
}

/* ── History Row ───────────────────────────────────────────── */
function HistoryRow({ item }) {
  const isDog = item.prediction === "Dog";
  return (
    <div className="history-item">
      <div className="h-emoji">{item.emoji}</div>
      <div className="h-info">
        <span className="h-name">{item.prediction}</span>
        <span className="h-sub">{item.confidence_tier} · {item.source}</span>
      </div>
      <div className="h-conf" style={{ color: isDog ? "var(--dog)" : "var(--cat)" }}>
        {item.confidence}%
      </div>
    </div>
  );
}

/* ── App ───────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("upload");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const classify = useCallback(async (file, source) => {
    setLoading(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}${source === "camera" ? "/predict/camera" : "/predict/upload"}`, {
        method: "POST", body: fd,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
      setHistory((h) => [{ ...data, id: Date.now() }, ...h].slice(0, 6));
    } catch {
      setError("Can't reach the server — make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #F5F0E8;
          --surface:  #FDFAF4;
          --border:   rgba(0,0,0,0.08);
          --text:     #1A1410;
          --muted:    #8A8078;
          --dog:      #C8603A;
          --cat:      #3A7FC8;
          --dog-bg:   linear-gradient(135deg, #FFF0EA 0%, #FFE4D8 100%);
          --cat-bg:   linear-gradient(135deg, #EAF2FF 0%, #D8E8FF 100%);
          --radius:   20px;
          --shadow:   0 4px 24px rgba(0,0,0,0.08);
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          min-height: 100dvh;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Layout ── */
        .app {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 0 env(safe-area-inset-bottom, 24px);
        }

        /* ── Header ── */
        .header {
          padding: 52px 24px 28px;
          text-align: center;
        }
        .header-paw {
          font-size: 44px;
          line-height: 1;
          margin-bottom: 12px;
          display: block;
          animation: float 3s ease-in-out infinite;
        }
        .header-title {
          font-family: 'Fraunces', serif;
          font-size: 40px;
          font-weight: 900;
          letter-spacing: -1.5px;
          color: var(--text);
          line-height: 1;
        }
        .header-title em {
          font-style: italic;
          color: var(--dog);
        }
        .header-sub {
          margin-top: 8px;
          font-size: 13px;
          color: var(--muted);
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        /* ── Card ── */
        .card {
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          overflow: hidden;
          margin: 0 16px 16px;
        }

        /* ── Tab ── */
        .tab-bar {
          display: flex;
          padding: 6px;
          gap: 4px;
          background: rgba(0,0,0,0.04);
          margin: 16px 16px 0;
          border-radius: 14px;
        }
        .tab-btn {
          flex: 1;
          padding: 10px 0;
          border: none;
          background: none;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .tab-btn.active {
          background: var(--surface);
          color: var(--text);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        /* ── Panel ── */
        .panel-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ── Viewfinder ── */
        .viewfinder {
          position: relative;
          aspect-ratio: 4/3;
          background: #1A1410;
          border-radius: 14px;
          overflow: hidden;
        }
        .viewfinder video {
          width: 100%; height: 100%; object-fit: cover;
          opacity: 0; transition: opacity 0.3s;
        }
        .viewfinder video.active { opacity: 1; }
        .viewfinder-idle, .viewfinder-error {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; color: rgba(255,255,255,0.5);
          font-size: 13px; font-weight: 500;
        }
        .cam-icon { font-size: 40px; }
        .viewfinder-error { color: #F87171; text-align: center; padding: 20px; }

        /* Corners */
        .vf-corner {
          position: absolute; width: 20px; height: 20px;
          border-color: white; border-style: solid;
          opacity: 0.7;
        }
        .vf-tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
        .vf-tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
        .vf-bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
        .vf-br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }

        /* Scan line */
        .scan-line {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: scan 2s ease-in-out infinite;
        }
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 90%; }
        }

        /* ── Dropzone ── */
        .dropzone {
          aspect-ratio: 4/3;
          border-radius: 14px;
          border: 2px dashed var(--border);
          background: rgba(0,0,0,0.02);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s, background 0.2s;
          display: flex;
          align-items: center; justify-content: center;
        }
        .dropzone.dragover {
          border-color: var(--cat);
          background: rgba(58,127,200,0.06);
        }
        .dropzone.has-preview { border-style: solid; border-color: var(--border); }
        .drop-idle { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .drop-icon { font-size: 40px; }
        .drop-title { font-size: 14px; font-weight: 600; color: var(--text); }
        .drop-sub { font-size: 12px; color: var(--muted); }
        .preview-img { width: 100%; height: 100%; object-fit: contain; }
        .drop-overlay {
          position: absolute; inset: 0;
          background: rgba(253,250,244,0.8);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }

        /* ── Buttons ── */
        .btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.5; pointer-events: none; }
        .btn-primary { background: var(--text); color: #F5F0E8; }
        .btn-ghost {
          width: auto; padding: 15px 22px;
          background: rgba(0,0,0,0.06);
          color: var(--text);
        }
        .btn-row { display: flex; gap: 12px; align-items: center; }
        .btn-capture {
          width: 68px; height: 68px; padding: 0;
          border-radius: 50%;
          background: var(--dog);
          flex-shrink: 0;
        }
        .shutter {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: white;
          display: block;
        }

        /* ── Spinner ── */
        .spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(0,0,0,0.1);
          border-top-color: var(--dog);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .spinner-sm {
          width: 22px; height: 22px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          display: block;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Error ── */
        .error-box {
          margin: 0 16px 16px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          color: #991B1B;
          font-weight: 500;
        }

        /* ── Loading placeholder ── */
        .loading-card {
          margin: 0 16px 16px;
          background: var(--surface);
          border-radius: var(--radius);
          padding: 44px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          border: 1px solid var(--border);
        }
        .loading-paw {
          font-size: 44px;
          animation: pulse-paw 1.4s ease-in-out infinite;
        }
        @keyframes pulse-paw {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.7; }
        }
        .loading-text {
          font-size: 14px; color: var(--muted); font-weight: 500;
        }

        /* ── Empty state ── */
        .empty-card {
          margin: 0 16px 16px;
          background: var(--surface);
          border-radius: var(--radius);
          padding: 44px 24px;
          text-align: center;
          border: 1px dashed var(--border);
        }
        .empty-art { font-size: 52px; margin-bottom: 12px; opacity: 0.4; }
        .empty-text { font-size: 14px; color: var(--muted); font-weight: 500; }

        /* ── Result Card ── */
        .result-card {
          margin: 0 16px 16px;
          border-radius: var(--radius);
          padding: 24px;
          border: 1px solid var(--border);
          animation: slide-up 0.4s cubic-bezier(.4,0,.2,1) both;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: none; }
        }

        .result-hero {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .result-emoji {
          font-size: 64px;
          line-height: 1;
          animation: float 2.8s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
        .result-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 2px;
        }
        .result-name {
          font-family: 'Fraunces', serif;
          font-size: 42px;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 8px;
        }
        .confidence-pill {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          color: white;
          letter-spacing: 0.5px;
        }

        .arc-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          background: white;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .arc-divider {
          width: 1px;
          height: 48px;
          background: var(--border);
          margin: 0 28px;
        }

        .meta-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
        .meta-chip {
          background: white;
          border-radius: 12px;
          padding: 10px 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .meta-val {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
        }
        .meta-key {
          font-size: 10px;
          color: var(--muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .demo-note {
          margin-top: 12px;
          font-size: 11px;
          color: #B45309;
          text-align: center;
          background: #FFFBEB;
          border-radius: 8px;
          padding: 8px;
        }

        /* ── History ── */
        .history-card {
          margin: 0 16px 16px;
          background: var(--surface);
          border-radius: var(--radius);
          padding: 16px;
          border: 1px solid var(--border);
        }
        .history-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--muted);
          margin-bottom: 12px;
        }
        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .history-item:last-child { border-bottom: none; }
        .h-emoji { font-size: 26px; flex-shrink: 0; }
        .h-info { flex: 1; }
        .h-name { display: block; font-size: 14px; font-weight: 600; color: var(--text); }
        .h-sub  { font-size: 11px; color: var(--muted); font-weight: 500; }
        .h-conf { font-size: 15px; font-weight: 700; }

        /* ── Footer ── */
        .footer {
          text-align: center;
          padding: 8px 24px 32px;
          font-size: 12px;
          color: var(--muted);
        }
        .footer a { color: var(--muted); text-decoration: none; border-bottom: 1px solid var(--border); }
      `}</style>

      <div className="app">
        {/* Header */}
        <div className="header">
          <span className="header-paw">🐾</span>
          <h1 className="header-title">Pet<em>Lens</em></h1>
          <p className="header-sub">Dogs vs Cats · PyTorch CNN · FastAPI</p>
        </div>

        {/* Tab bar */}
        <div className="tab-bar">
          {[
            { id: "upload", icon: "📁", label: "Upload" },
            { id: "camera", icon: "📷", label: "Camera" },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={`tab-btn ${tab === id ? "active" : ""}`}
              onClick={() => { setTab(id); setResult(null); setError(""); }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Input card */}
        <div className="card" style={{ marginTop: 12 }}>
          {tab === "upload"
            ? <UploadPanel onUpload={classify} loading={loading} />
            : <CameraPanel onCapture={classify} loading={loading} />}
        </div>

        {/* Error */}
        {error && <div className="error-box">{error}</div>}

        {/* Loading */}
        {loading && (
          <div className="loading-card">
            <div className="loading-paw">🔍</div>
            <p className="loading-text">Running inference…</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && <ResultCard result={result} />}

        {/* Empty */}
        {!result && !loading && (
          <div className="empty-card">
            <div className="empty-art">🐱🐶</div>
            <p className="empty-text">Upload a photo or use your camera<br />to classify the animal</p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="history-card">
            <p className="history-title">Recent</p>
            {history.map((h) => <HistoryRow key={h.id} item={h} />)}
          </div>
        )}

        <p className="footer">
          Made with ❤️ by <a href="https://github.com/jakirvk18">Jakir Hussain</a>
        </p>
      </div>
    </>
  );
}