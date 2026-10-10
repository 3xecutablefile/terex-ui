import { invoke, isTauri } from "@tauri-apps/api/core";
import { formatDroppedPaths } from "@/modules/terminal/lib/quoteShellPath";

type ClipboardContent =
  | { kind: "text"; text: string }
  | { kind: "image"; path: string };

export async function readTerminalPaste(): Promise<string> {
  if (!isTauri()) return readTerminalClipboard();
  const content = await invoke<ClipboardContent | null>(
    "terminal_clipboard_read",
  );
  if (!content) return "";
  return content.kind === "image"
    ? formatDroppedPaths([content.path])
    : content.text;
}

export async function readTerminalClipboard(): Promise<string> {
  try {
    if (isTauri()) {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      return await readText();
    }
    return (await navigator.clipboard?.readText()) ?? "";
  } catch {
    return "";
  }
}

export async function writeTerminalClipboard(text: string): Promise<void> {
  if (isTauri()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  }
  if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
  await navigator.clipboard.writeText(text);
}
