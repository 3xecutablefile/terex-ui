import {describe,it,expect} from "vitest";
import {ShiftTap} from "@/modules/terminal/block/lib/shiftTap";
import {safeSuggestionPrefix} from "@/modules/terminal/block/lib/aiSuggest";
const down=(code:string)=>({code,ctrlKey:false,altKey:false,metaKey:false,repeat:false});
describe("terminal suggestions",()=>{
  it("distinguishes left/right taps and ignores capitalization chords",()=>{const tap=new ShiftTap();tap.down(down("ShiftLeft"));expect(tap.up("ShiftLeft")).toBe("accept");tap.down(down("ShiftRight"));expect(tap.up("ShiftRight")).toBe("submit");tap.down(down("ShiftRight"));tap.down(down("KeyA"));expect(tap.up("ShiftRight")).toBeNull();});
  it("does not send multiline or credential assignments for completion",()=>{expect(safeSuggestionPrefix("git sta")).toBe(true);expect(safeSuggestionPrefix("export API_KEY=secret")).toBe(false);expect(safeSuggestionPrefix("echo a\nrm b")).toBe(false);});
});
