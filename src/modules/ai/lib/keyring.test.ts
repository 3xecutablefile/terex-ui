import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { clearCredentialCache, getCustomEndpointKey } from "@/modules/ai/lib/keyring";
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
describe("on-demand credentials", () => {
  beforeEach(() => { vi.clearAllMocks(); clearCredentialCache(); });
  it("does not read on import and coalesces repeated reads in memory", async () => {
    expect(invoke).not.toHaveBeenCalled();
    vi.mocked(invoke).mockResolvedValue("test-key");
    expect(await Promise.all([getCustomEndpointKey("one"), getCustomEndpointKey("one")])).toEqual(["test-key", "test-key"]);
    expect(invoke).toHaveBeenCalledTimes(1);
    clearCredentialCache();
    await getCustomEndpointKey("one");
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
