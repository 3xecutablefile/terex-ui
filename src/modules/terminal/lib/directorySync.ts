import { quoteShellArg } from "@/lib/shellQuote";

export type DirectorySyncState =
  | "unknown"
  | "ready"
  | "input"
  | "busy"
  | "continuation";

export function directorySyncState(
  state: DirectorySyncState,
  event: string,
): DirectorySyncState {
  if (event === "prompt-continuation") return "continuation";
  if (event === "prompt-end") return state === "continuation" ? state : "ready";
  if (event === "input") return state === "ready" ? "input" : state;
  if (["prompt-start", "end-of-input", "end-of-command"].includes(event))
    return "busy";
  return state;
}

export function directoryCommand(path: string, windows: boolean): string {
  if (
    !/^(?:\/|[A-Za-z]:[\\/]|\\\\)/.test(path) ||
    /[\x00-\x1f\x7f-\x9f]/.test(path)
  ) {
    throw new Error("Cannot sync an invalid directory path to the terminal.");
  }
  return `cd ${quoteShellArg(path, windows)}`;
}
