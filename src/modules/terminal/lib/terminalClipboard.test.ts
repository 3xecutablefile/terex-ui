import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readTerminalClipboard,
  readTerminalPaste,
  writeTerminalClipboard,
} from "./terminalClipboard";

const native = vi.hoisted(() => ({
  invoke: vi.fn(),
  readText: vi.fn<() => Promise<string>>(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}));
vi.mock("@tauri-apps/plugin-clipboard-manager", () => native);
vi.mock("@tauri-apps/api/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tauri-apps/api/core")>()),
  invoke: native.invoke,
}));
const web = { readText: vi.fn(), writeText: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("isTauri", true);
  vi.stubGlobal("navigator", { clipboard: web });
});
afterEach(() => vi.unstubAllGlobals());

describe("terminal clipboard", () => {
  it("pastes a safely quoted PNG path without losing text or submitting it", async () => {
    native.invoke.mockResolvedValueOnce({
      kind: "image",
      path: "/tmp/image paste/shot.png",
    });
    await expect(readTerminalPaste()).resolves.toBe(
      "'/tmp/image paste/shot.png' ",
    );
    expect(native.invoke).toHaveBeenCalledWith("terminal_clipboard_read");
    native.invoke.mockResolvedValueOnce({ kind: "text", text: "hello\nworld" });
    await expect(readTerminalPaste()).resolves.toBe("hello\nworld");
    native.invoke.mockResolvedValueOnce(null);
    await expect(readTerminalPaste()).resolves.toBe("");
    native.invoke.mockRejectedValueOnce(new Error("PNG write failed"));
    await expect(readTerminalPaste()).rejects.toThrow("PNG write failed");
    expect(web.readText).not.toHaveBeenCalled();
  });
  it.each(["Macintosh", "Windows NT", "X11; Linux"])(
    "uses native copy and paste in the %s application without WebKit prompts",
    async (userAgent) => {
      vi.stubGlobal("navigator", { userAgent, clipboard: web });
      native.readText.mockResolvedValue("external copy");
      await expect(readTerminalClipboard()).resolves.toBe("external copy");
      await writeTerminalClipboard("terminal selection");
      expect(native.writeText).toHaveBeenCalledWith("terminal selection");
      expect(web.readText).not.toHaveBeenCalled();
      expect(web.writeText).not.toHaveBeenCalled();
    },
  );

  it("does not fall back to permission-gated web reads after an IPC failure", async () => {
    native.readText.mockRejectedValue(new Error("clipboard busy"));
    await expect(readTerminalClipboard()).resolves.toBe("");
    expect(web.readText).not.toHaveBeenCalled();
    native.readText.mockResolvedValue("retry");
    await expect(readTerminalClipboard()).resolves.toBe("retry");
  });

  it("reports failed copies instead of signaling success", async () => {
    native.writeText.mockRejectedValue(new Error("clipboard busy"));
    await expect(writeTerminalClipboard("text")).rejects.toThrow(
      "clipboard busy",
    );
    expect(web.writeText).not.toHaveBeenCalled();
  });

  it("uses browser clipboard APIs in a browser preview", async () => {
    vi.stubGlobal("isTauri", false);
    web.readText.mockResolvedValue("web");
    await expect(readTerminalClipboard()).resolves.toBe("web");
    await writeTerminalClipboard("preview");
    expect(web.writeText).toHaveBeenCalledWith("preview");
    expect(native.readText).not.toHaveBeenCalled();
    expect(native.writeText).not.toHaveBeenCalled();
  });
});
