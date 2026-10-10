import { CustomPrompt } from "@/modules/terminal/block/CustomPrompt";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

it("renders distinct OS logos and boundary-aware home paths", () => {
  const prompt = (os: string | null, cwd: string, home: string) =>
    renderToStaticMarkup(<CustomPrompt os={os} cwd={cwd} home={home} />);
  const mac = prompt("macOS", "/Users/sam/", "/Users/sam/");
  const windows = prompt("Windows", "C:\\Users\\Sam\\src", "c:/users/sam/");
  const linux = prompt("Linux", "/home/sam-other", "/home/sam");
  expect(mac).toContain("macOS terminal prompt, ~");
  expect(windows).toContain("Windows terminal prompt, ~/src");
  expect(linux).toContain("Linux terminal prompt, /home/sam-other");
  const icon = (html: string) => html.match(/<svg[\s\S]*?<\/svg>/)?.[0];
  expect(new Set([icon(mac), icon(windows), icon(linux)]).size).toBe(3);
  expect(prompt(null, "/", "/home/sam")).toContain('data-os="unknown"');
});
