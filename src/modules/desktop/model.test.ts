import {
  bytes,
  joinPath,
  keySequence,
  parentPath,
} from "@/modules/desktop/model";
import { describe, expect, it } from "vitest";

describe("desktop controls", () => {
  it("keeps navigation at filesystem roots and preserves path text", () => {
    expect(parentPath("/")).toBe("/");
    expect(parentPath("C:\\")).toBe("C:/");
    expect(parentPath("C:/Users")).toBe("C:/");
    expect(parentPath("/Users/Ada's work/")).toBe("/Users");
    expect(joinPath("/", "file")).toBe("/file");
    expect(bytes(1024)).toBe("1.0 K");
    expect(bytes(undefined)).toBe("--");
  });
  it("encodes terminal controls, modifiers and shifted punctuation", () => {
    expect(keySequence("ENTER", false, false, false)).toBe("\r");
    expect(keySequence("c", false, true, false)).toBe("\x03");
    expect(keySequence("1", true, false, false)).toBe("!");
    expect(keySequence("x", false, false, true)).toBe("\x1bx");
    expect(keySequence("a", true, false, false, true)).toBe("a");
    expect(keySequence("LEFT", false, false, false)).toBe("\x1b[D");
    expect(keySequence("SHIFT", false, false, false)).toBe("");
  });
});
