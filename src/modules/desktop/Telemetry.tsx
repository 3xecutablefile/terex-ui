// biome-ignore-all lint/suspicious/noArrayIndexKey: Hardware core indexes and fixed memory cells never reorder.
import { bytes, type SystemSnapshot } from "@/modules/desktop/model";
import { subscribeWindowPresentation } from "@/modules/terminal/ghostty/windowPresentation";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

type Sample = { cpu: number; received: number; transmitted: number };

export function useTelemetry(enabled = true) {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [history, setHistory] = useState<Sample[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let pending = false;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sample = async () => {
      if (disposed || pending || !visible) return;
      pending = true;
      try {
        const next = await invoke<SystemSnapshot>("dashboard_snapshot");
        if (!disposed && visible) {
          setSnapshot(next);
          setError("");
          const cpu =
            next.cpu.reduce((sum, value) => sum + value, 0) /
            Math.max(1, next.cpu.length);
          setHistory((previous) => [
            ...previous.slice(-59),
            { cpu, received: next.received, transmitted: next.transmitted },
          ]);
        }
      } catch (e) {
        if (!disposed && visible) setError(String(e));
      } finally {
        pending = false;
        if (!disposed && visible) timer = setTimeout(sample, 5000);
      }
    };
    const unsubscribe = subscribeWindowPresentation((state) => {
      visible = state.visible;
      clearTimeout(timer);
      if (visible) void sample();
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled]);
  return { snapshot, history, error };
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const unsubscribe = subscribeWindowPresentation(({ visible }) => {
      clearInterval(timer);
      if (visible) {
        setNow(new Date());
        timer = setInterval(() => setNow(new Date()), 1000);
      }
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);
  return (
    <>
      <time className="terex-clock" dateTime={now.toISOString()}>
        {now.toLocaleTimeString("en-GB")}
      </time>
      <div className="terex-date">
        {now
          .toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            weekday: "short",
          })
          .toUpperCase()}
      </div>
    </>
  );
}

function Chart({
  values,
  second,
  max = 100,
  label,
}: {
  values: number[];
  second?: number[];
  max?: number;
  label: string;
}) {
  const line = (samples: number[]) =>
    samples
      .map(
        (value, index) =>
          `${200 - (samples.length - 1 - index) * (200 / 59)},${58 - (Math.min(max, Math.max(0, value)) / Math.max(1, max)) * 52}`,
      )
      .join(" ");
  return (
    <svg
      className="terex-chart"
      viewBox="0 0 200 60"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path
        className="terex-chart-grid"
        d="M0 0H200M0 15H200M0 30H200M0 45H200M0 59H200M0 0V60M40 0V60M80 0V60M120 0V60M160 0V60M200 0V60"
      />
      <polyline
        points={line(values)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        vectorEffect="non-scaling-stroke"
      />
      {second && (
        <polyline
          points={line(second)}
          fill="none"
          stroke="var(--terex-bright)"
          strokeWidth="1"
          opacity=".7"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

export function SystemRail({
  snapshot: s,
  history,
  error,
}: ReturnType<typeof useTelemetry>) {
  const average = s
    ? s.cpu.reduce((a, b) => a + b, 0) / Math.max(1, s.cpu.length)
    : 0;
  const memory = s?.memoryTotal ? s.memoryUsed / s.memoryTotal : 0;
  const uptime = s
    ? `${Math.floor(s.uptime / 86400)}D ${String(Math.floor(s.uptime / 3600) % 24).padStart(2, "0")}:${String(Math.floor(s.uptime / 60) % 60).padStart(2, "0")}`
    : "--";
  return (
    <aside className="terex-system-rail" aria-label="Live system monitor">
      <div className="terex-rule">
        <span>PANEL</span>
        <span>SYSTEM</span>
      </div>
      <Clock />
      <dl className="terex-machine-summary">
        <div>
          <dt>UPTIME</dt>
          <dd>{uptime}</dd>
        </div>
        <div>
          <dt>TYPE</dt>
          <dd>{s?.os ?? "--"}</dd>
        </div>
        <div>
          <dt>ARCH</dt>
          <dd>{s?.architecture ?? "--"}</dd>
        </div>
      </dl>
      <div className="terex-hardware">
        <span>HOST / KERNEL</span>
        <strong title={s?.hostname}>{s?.hostname ?? "CONNECTING"}</strong>
        <span>{s?.kernel ?? "NATIVE SYSTEM"}</span>
        <strong title={s?.cpuName}>{s?.cpuName ?? "--"}</strong>
      </div>
      <div className="terex-rule">
        <span>CPU USAGE</span>
        <span>{s ? `${average.toFixed(1)}%` : "--"}</span>
      </div>
      <div className="terex-graph-caption">
        <span>AVG. {s?.cpu.length ?? "--"} THREADS</span>
        <span>100%</span>
      </div>
      <Chart
        values={history.map((sample) => sample.cpu)}
        label={`CPU usage ${average.toFixed(1)} percent`}
      />
      <div className="terex-core-bars">
        {s?.cpu.map((value, index) => (
          <div
            key={`core-${index}`}
            title={`Core ${index + 1}: ${value.toFixed(1)}%`}
          >
            <i style={{ height: `${Math.max(2, value)}%` }} />
          </div>
        ))}
      </div>
      <dl className="terex-machine-summary">
        <div>
          <dt>CPU</dt>
          <dd>{s ? `${average.toFixed(0)}%` : "--"}</dd>
        </div>
        <div>
          <dt>CORES</dt>
          <dd>{s?.cpu.length ?? "--"}</dd>
        </div>
        <div>
          <dt>TASKS</dt>
          <dd>{s ? "TOP 5" : "--"}</dd>
        </div>
      </dl>
      <div className="terex-rule">
        <span>MEMORY</span>
        <span>
          {bytes(s?.memoryUsed)} / {bytes(s?.memoryTotal)}
        </span>
      </div>
      <div
        className="terex-memory-map"
        role="img"
        aria-label={`Memory ${(memory * 100).toFixed(0)} percent used`}
      >
        {Array.from({ length: 200 }, (_, index) => (
          <i
            key={`cell-${index}`}
            className={index < memory * 200 ? "used" : ""}
          />
        ))}
      </div>
      <div className="terex-rule">
        <span>SWAP</span>
        <span>
          {bytes(s?.swapUsed)} / {bytes(s?.swapTotal)}
        </span>
      </div>
      <div className="terex-meter">
        <i
          style={{
            width: `${s?.swapTotal ? (s.swapUsed / s.swapTotal) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="terex-rule">
        <span>TOP PROCESSES</span>
        <span>CPU / MEM</span>
      </div>
      <table className="terex-processes">
        <thead>
          <tr>
            <th>PID</th>
            <th>NAME</th>
            <th>CPU</th>
          </tr>
        </thead>
        <tbody>
          {s?.processes.map((process) => (
            <tr key={process.pid}>
              <td>{process.pid}</td>
              <td title={`${process.name} / ${bytes(process.memory)}`}>
                {process.name}
              </td>
              <td>{process.cpu.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && (
        <p role="status" className="terex-error" title={error}>
          SYSTEM DATA UNAVAILABLE
        </p>
      )}
    </aside>
  );
}

// Coarse continent outlines for the decorative world view, not a geolocation claim.
const LAND = [
  [
    [-165, 65],
    [-130, 70],
    [-110, 75],
    [-60, 50],
    [-80, 10],
    [-105, 20],
    [-120, 45],
  ],
  [
    [-80, 10],
    [-45, -5],
    [-35, -15],
    [-65, -55],
    [-80, -15],
  ],
  [
    [-15, 35],
    [10, 38],
    [40, 10],
    [45, -15],
    [20, -35],
    [0, -10],
    [-17, 15],
  ],
  [
    [-10, 35],
    [-10, 58],
    [20, 72],
    [50, 70],
    [85, 75],
    [140, 55],
    [155, 40],
    [110, 0],
    [80, 10],
    [55, 30],
    [30, 30],
  ],
  [
    [112, -12],
    [140, -10],
    [154, -25],
    [135, -40],
    [115, -30],
  ],
  [
    [-55, 60],
    [-20, 70],
    [-30, 82],
    [-65, 80],
  ],
];
function inPolygon(x: number, y: number, polygon: number[][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
const DOTS = (() => {
  const points: { x: number; y: number; opacity: number }[] = [];
  for (let lat = -78; lat <= 80; lat += 3)
    for (let lon = -180; lon < 180; lon += 3) {
      const a = (lat * Math.PI) / 180;
      const b = ((lon - 20) * Math.PI) / 180;
      const z = Math.cos(a) * Math.cos(b);
      if (z > 0 && LAND.some((outline) => inPolygon(lon, lat, outline)))
        points.push({
          x: 100 + 86 * Math.cos(a) * Math.sin(b),
          y: 100 - 86 * Math.sin(a),
          opacity: 0.25 + z * 0.7,
        });
    }
  return points;
})();

export function NetworkRail({
  snapshot: s,
  history,
}: ReturnType<typeof useTelemetry>) {
  const max = Math.max(
    1024,
    ...history.flatMap((sample) => [sample.received, sample.transmitted]),
  );
  return (
    <aside className="terex-network-rail" aria-label="Live network monitor">
      <div className="terex-rule">
        <span>PANEL</span>
        <span>NETWORK</span>
      </div>
      <div className="terex-rule">
        <span>NETWORK STATUS</span>
        <span>LOCAL</span>
      </div>
      <dl className="terex-network-status">
        <div>
          <dt>STATE</dt>
          <dd>{s ? (s.address ? "ONLINE" : "OFFLINE") : "--"}</dd>
        </div>
        <div>
          <dt>INTERFACE</dt>
          <dd>{s?.interface ?? "--"}</dd>
        </div>
        <div>
          <dt>LOCAL IPv4</dt>
          <dd>{s?.address ?? "--"}</dd>
        </div>
      </dl>
      <div className="terex-rule">
        <span>WORLD VIEW</span>
        <span>NETWORK MAP</span>
      </div>
      <div className="terex-globe-wrap">
        <span className="terex-graph-caption">ENDPOINT / LOCAL INTERFACE</span>
        <svg
          className="terex-globe"
          viewBox="0 0 200 200"
          role="img"
          aria-label="Decorative dotted globe"
        >
          <title>World view</title>
          <circle
            cx="100"
            cy="100"
            r="87"
            fill="none"
            stroke="currentColor"
            opacity=".12"
          />
          {DOTS.map((dot) => (
            <circle
              key={`${dot.x}-${dot.y}`}
              cx={dot.x}
              cy={dot.y}
              r=".75"
              fill="currentColor"
              opacity={dot.opacity}
            />
          ))}
          <path
            d="M4 100h12m168 0h12M100 4v12m0 168v12"
            stroke="currentColor"
            opacity=".4"
          />
        </svg>
        <span className="terex-globe-caption">
          TEREX UI / NATIVE NETWORK TELEMETRY
        </span>
      </div>
      <div className="terex-rule">
        <span>NETWORK TRAFFIC</span>
        <span>{bytes(max)}/s</span>
      </div>
      <div className="terex-traffic-summary">
        <span>↓ {bytes(s?.received)}/s</span>
        <span>↑ {bytes(s?.transmitted)}/s</span>
      </div>
      <Chart
        values={history.map((sample) => sample.received)}
        second={history.map((sample) => sample.transmitted)}
        max={max}
        label="Network receive and transmit rates over the last five minutes"
      />
      <div className="terex-transfer-total">
        <span>RECEIVED {bytes(s?.totalReceived)}</span>
        <span>TRANSMITTED {bytes(s?.totalTransmitted)}</span>
      </div>
    </aside>
  );
}
