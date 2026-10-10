import {
  setTerminalBusy,
  subscribeTerminalBusy,
} from "@/modules/terminal/lib/terminalActivity";
import { expect, it, vi } from "vitest";

it("notifies only the affected leaf when foreground ownership changes", () => {
  const changed = vi.fn();
  const off = subscribeTerminalBusy(10, changed);
  setTerminalBusy(10, true);
  setTerminalBusy(10, true);
  setTerminalBusy(11, true);
  expect(changed).toHaveBeenCalledTimes(1);
  setTerminalBusy(10, false);
  expect(changed).toHaveBeenCalledTimes(2);
  off();
  setTerminalBusy(10, true);
  expect(changed).toHaveBeenCalledTimes(2);
  setTerminalBusy(10, false);
  setTerminalBusy(11, false);
});
