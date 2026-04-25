import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import * as topojson from "topojson-client";

interface LiveGlobeProps {
  visitors: { session_id: string; latitude?: number | null; longitude?: number | null }[];
  className?: string;
}

function project(lat: number, lng: number, w: number, h: number): [number, number] {
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return [x, y];
}

const MAP_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const W = 960;
const H = 480;

export default function LiveGlobe({ visitors, className }: LiveGlobeProps) {
  const [landPath, setLandPath] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & zoom state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    let cancelled = false;
    fetch(MAP_URL)
      .then(r => r.json())
      .then(topo => {
        if (cancelled) return;
        const land = topojson.feature(topo, topo.objects.countries) as any;
        const pathStr = land.features.map((f: any) => geoToPath(f.geometry, W, H)).join(" ");
        setLandPath(pathStr);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const realVisitors = useMemo(() => {
    return visitors.filter(
      v => v.latitude != null && v.longitude != null && (v.latitude !== 0 || v.longitude !== 0)
    );
  }, [visitors]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 1), 10);

    // Zoom toward cursor
    const newTx = mx - (mx - translate.x) * (newScale / scale);
    const newTy = my - (my - translate.y) * (newScale / scale);

    setScale(newScale);
    setTranslate(clampTranslate(newTx, newTy, newScale, rect.width, rect.height));
  }, [scale, translate]);

  // Pan start
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scale, translate]);

  // Pan move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTranslate(clampTranslate(panStart.current.tx + dx, panStart.current.ty + dy, scale, rect.width, rect.height));
  }, [isPanning, scale]);

  // Pan end
  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset on double-click
  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  return (
    <div className={className} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div
        ref={containerRef}
        className="absolute inset-0 bg-[#0c0a1a] rounded-xl overflow-hidden"
        style={{ cursor: scale > 1 ? (isPanning ? "grabbing" : "grab") : "default", touchAction: "none" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: "0 0" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid */}
          {Array.from({ length: 17 }, (_, i) => {
            const x = ((i + 1) / 18) * W;
            return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#8b5cf6" strokeWidth="0.3" opacity="0.15" />;
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const y = ((i + 1) / 9) * H;
            return <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#8b5cf6" strokeWidth="0.3" opacity="0.15" />;
          })}

          {landPath && (
            <path d={landPath} fill="rgba(139,92,246,0.18)" stroke="rgba(139,92,246,0.45)" strokeWidth="0.5" />
          )}

          <defs>
            <radialGradient id="pulseGrad">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
            </radialGradient>
          </defs>

          {realVisitors.map(v => {
            const [cx, cy] = project(v.latitude!, v.longitude!, W, H);
            return (
              <g key={v.session_id}>
                <circle cx={cx} cy={cy} r="8" fill="url(#pulseGrad)">
                  <animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.15;0.7" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r="3" fill="#4ADE80" stroke="#0c0a1a" strokeWidth="1" />
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-violet-950/30 pointer-events-none" />

        {realVisitors.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground/50">Aguardando visitantes com geolocalização…</span>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
          <button
            onClick={() => {
              const container = containerRef.current;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const ns = Math.min(scale * 1.3, 10);
              const cx = rect.width / 2, cy = rect.height / 2;
              setTranslate(clampTranslate(cx - (cx - translate.x) * (ns / scale), cy - (cy - translate.y) * (ns / scale), ns, rect.width, rect.height));
              setScale(ns);
            }}
            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center transition-colors"
          >+</button>
          <button
            onClick={() => {
              const container = containerRef.current;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const ns = Math.max(scale / 1.3, 1);
              const cx = rect.width / 2, cy = rect.height / 2;
              const newT = clampTranslate(cx - (cx - translate.x) * (ns / scale), cy - (cy - translate.y) * (ns / scale), ns, rect.width, rect.height);
              setTranslate(ns <= 1 ? { x: 0, y: 0 } : newT);
              setScale(ns);
            }}
            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center transition-colors"
          >−</button>
        </div>
      </div>
    </div>
  );
}

function clampTranslate(tx: number, ty: number, scale: number, cw: number, ch: number) {
  const maxTx = 0;
  const minTx = cw - cw * scale;
  const maxTy = 0;
  const minTy = ch - ch * scale;
  return {
    x: Math.min(maxTx, Math.max(minTx, tx)),
    y: Math.min(maxTy, Math.max(minTy, ty)),
  };
}

function geoToPath(geometry: any, w: number, h: number): string {
  if (!geometry) return "";
  const parts: string[] = [];

  const ring = (coords: number[][]) => {
    const segments: string[] = [];
    let cmd = "M";
    for (let i = 0; i < coords.length; i++) {
      const [x, y] = project(coords[i][1], coords[i][0], w, h);
      // If the longitude jump between consecutive points is > 180°, it crosses the antimeridian
      if (i > 0 && Math.abs(coords[i][0] - coords[i - 1][0]) > 180) {
        segments.push("Z");
        cmd = "M";
      }
      segments.push(`${cmd}${x.toFixed(1)},${y.toFixed(1)}`);
      cmd = "L";
    }
    segments.push("Z");
    return segments.join("");
  };

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((r: number[][]) => parts.push(ring(r)));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly: number[][][]) =>
      poly.forEach((r: number[][]) => parts.push(ring(r)))
    );
  }
  return parts.join(" ");
}
