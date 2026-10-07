import {
  directoryCommand,
  directorySyncState,
} from "@/modules/terminal/lib/directorySync";
import { describe, expect, it } from "vitest";

describe("directory synchronization", () => {
  it("only permits submission after a complete empty prompt", () => {
    expect(directorySyncState("unknown", "prompt-start")).toBe("busy");
    expect(directorySyncState("busy", "prompt-end")).toBe("ready");
    expect(directorySyncState("ready", "input")).toBe("input");
    expect(directorySyncState("input", "end-of-input")).toBe("busy");
    expect(directorySyncState("busy", "end-of-command")).toBe("busy");
    expect(directorySyncState("unknown", "pwd")).toBe("unknown");
    expect(directorySyncState("input", "prompt-continuation")).toBe(
      "continuation",
    );
    expect(directorySyncState("continuation", "prompt-end")).toBe(
      "continuation",
    );
  });
  it("quotes native shell paths and rejects terminal control characters", () => {
    expect(directoryCommand("/Ada's files", false)).toBe(
      "cd '/Ada'\\''s files'",
    );
    expect(directoryCommand("C:\\Ada's files", true)).toBe(
      "cd 'C:\\Ada''s files'",
    );
    expect(() => directoryCommand("relative/path", false)).toThrow();
    expect(() => directoryCommand("/bad\ncommand", false)).toThrow();
  });
});
