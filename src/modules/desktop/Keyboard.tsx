import { keySequence } from "@/modules/desktop/model";
import { useEffect, useState } from "react";

const ROWS = [
  [
    "ESC",
    "`",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
    "-",
    "=",
    "BACK",
  ],
  ["TAB", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["CAPS", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "ENTER"],
  ["SHIFT", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "UP"],
  ["CTRL", "ALT", "SPACE", "ALT GR", "LEFT", "DOWN", "RIGHT"],
];
const LABELS: Record<string, string> = {
  SPACE: "",
  LEFT: "←",
  RIGHT: "→",
  UP: "↑",
  DOWN: "↓",
};

export function Keyboard({
  onInput,
  disabled,
}: {
  onInput: (value: string) => void;
  disabled: boolean;
}) {
  const [shift, setShift] = useState(false);
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const [caps, setCaps] = useState(false);
  const [pressed, setPressed] = useState("");
  useEffect(() => {
    const down = (e: KeyboardEvent) =>
      setPressed(
        (
          {
            Escape: "ESC",
            Backspace: "BACK",
            Enter: "ENTER",
            " ": "SPACE",
            ArrowUp: "UP",
            ArrowDown: "DOWN",
            ArrowLeft: "LEFT",
            ArrowRight: "RIGHT",
            Shift: "SHIFT",
            Control: "CTRL",
            Alt: "ALT",
            Tab: "TAB",
          } as Record<string, string>
        )[e.key] ?? e.key.toLowerCase(),
      );
    const up = () => setPressed("");
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", up);
    };
  }, []);
  function press(key: string) {
    if (key === "SHIFT") {
      setShift(!shift);
      return;
    }
    if (key === "CTRL") {
      setCtrl(!ctrl);
      return;
    }
    if (key === "ALT" || key === "ALT GR") {
      setAlt(!alt);
      return;
    }
    if (key === "CAPS") {
      setCaps(!caps);
      return;
    }
    const sequence = keySequence(key, shift, ctrl, alt, caps);
    if (sequence) onInput(sequence);
    setShift(false);
    setCtrl(false);
    setAlt(false);
  }
  return (
    <section
      className="terex-keyboard"
      aria-label="On-screen terminal keyboard"
    >
      <div className="terex-rule">
        <span>KEYBOARD</span>
        <span>{disabled ? "SELECT A TERMINAL" : "PTY INPUT / US"}</span>
      </div>
      {ROWS.map((row) => (
        <div className="terex-key-row" key={row[0]}>
          {row.map((key) => {
            const latched =
              (key === "SHIFT" && shift) ||
              (key === "CTRL" && ctrl) ||
              (key.startsWith("ALT") && alt) ||
              (key === "CAPS" && caps);
            return (
              <button
                type="button"
                key={key}
                aria-label={key === "SPACE" ? "Space" : key}
                aria-pressed={latched || pressed === key}
                disabled={disabled}
                className={`terex-key ${key.length > 1 ? "terex-key-wide" : ""} ${key === "SPACE" ? "terex-key-space" : ""} ${key === "ENTER" ? "terex-key-enter" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => press(key)}
              >
                {LABELS[key] ?? key.toUpperCase()}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}
