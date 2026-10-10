import { IS_MAC } from "@/lib/platform";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

export type VirtualKey = { code:string; key:string; text:string; shiftKey:boolean;ctrlKey:boolean;altKey:boolean;metaKey:boolean;altGraph:boolean };
type Layout={id:string;name:string;caps:boolean;keys:Record<string,{values:string[];dead:boolean[]}>};
const ROWS=[
  ["Escape","Backquote","Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal","Backspace"],
  ["Tab","KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP","BracketLeft","BracketRight","Backslash"],
  ["CapsLock","KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyK","KeyL","Semicolon","Quote","Enter"],
  ["ShiftLeft","KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Comma","Period","Slash","ShiftRight","ArrowUp"],
  IS_MAC?["ControlLeft","AltLeft","MetaLeft","Space","MetaRight","AltRight","ArrowLeft","ArrowDown","ArrowRight"]:["ControlLeft","AltLeft","Space","AltRight","ControlRight","ArrowLeft","ArrowDown","ArrowRight"],
];
const LABELS:Record<string,string>={Escape:"ESC",Backspace:"BACK",Tab:"TAB",CapsLock:"CAPS",Enter:"ENTER",ShiftLeft:"SHIFT",ShiftRight:"RSHIFT",ControlLeft:"CTRL",ControlRight:"RCTRL",MetaLeft:"CMD",MetaRight:"RCMD",AltLeft:IS_MAC?"OPTION":"ALT",AltRight:IS_MAC?"ROPTION":"ALT GR",Space:"",ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→"};
const ACCENTS:Record<string,string>={"`":"\u0300","´":"\u0301","^":"\u0302","~":"\u0303","¯":"\u0304","˘":"\u0306","˙":"\u0307","¨":"\u0308","˚":"\u030a","˝":"\u030b","ˇ":"\u030c","¸":"\u0327","˛":"\u0328"};

export function Keyboard({onKey,onAccept,disabled}:{onKey:(key:VirtualKey)=>void;onAccept:(run:boolean)=>boolean;disabled:boolean}){
  const [layout,setLayout]=useState<Layout|null>(null);
  const [error,setError]=useState("");
  const [shift,setShift]=useState(false);const [ctrl,setCtrl]=useState(false);const [alt,setAlt]=useState(false);const [meta,setMeta]=useState(false);const [altGraph,setAltGraph]=useState(false);const [caps,setCaps]=useState(false);const [pressed,setPressed]=useState("");
  const dead=useRef<string|null>(null);
  const current=useRef(layout);current.current=layout;
  useEffect(()=>{
    let disposed=false;let pending=false;let timer:ReturnType<typeof setTimeout>|undefined;
    const refresh=async()=>{if(pending||disposed)return;pending=true;try{const value=await invoke<Layout>("keyboard_layout");if(!disposed&&value?.keys){setLayout(value);setCaps(value.caps);setError("");dead.current=null;}}catch(e){if(!disposed)setError(String(e));}finally{pending=false;}};
    const queue=()=>{clearTimeout(timer);timer=setTimeout(()=>void refresh(),100);};
    const down=(e:KeyboardEvent)=>{setPressed(e.code);if(e.code==="CapsLock")setCaps(e.getModifierState("CapsLock"));const known=current.current?.keys[e.code];if(known&&e.key.length<=2&&!e.ctrlKey&&!e.metaKey&&!known.values.includes(e.key))queue();};
    const up=(e:KeyboardEvent)=>{setPressed("");if(!IS_MAC&&["Shift","Alt","Meta"].includes(e.key))queue();};
    void refresh();const unlisten=listen("terex:keyboard-layout-changed",queue);
    window.addEventListener("focus",queue);window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    return()=>{disposed=true;clearTimeout(timer);void unlisten.then(off=>off());window.removeEventListener("focus",queue);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  },[]);
  const mask=Number(shift)|(Number(caps)<<1)|(Number(IS_MAC?alt:altGraph)<<2);
  function press(code:string){
    if(code.startsWith("Shift")){if(!onAccept(code==="ShiftRight"))setShift(!shift);return;}
    if(code.startsWith("Control")){setCtrl(!ctrl);return;}
    if(code.startsWith("Meta")){setMeta(!meta);return;}
    if(code.startsWith("Alt")){if(!IS_MAC&&code==="AltRight")setAltGraph(!altGraph);else setAlt(!alt);return;}
    if(code==="CapsLock"){setCaps(!caps);return;}
    const legend=layout?.keys[code];let text=code==="Space"?" ":legend?.values[mask]??"";
    if(legend?.dead[mask]){if(dead.current===text){dead.current=null;}else{dead.current=text;setShift(false);setAlt(false);setAltGraph(false);return;}}
    else if(dead.current){text=text===" "?dead.current:(text+(ACCENTS[dead.current]??dead.current)).normalize("NFC");dead.current=null;}
    const key=(ctrl||meta)&&!altGraph&&/^Key[A-Z]$/.test(code)?code.slice(3).toLowerCase():text||code;
    onKey({code,key,text,shiftKey:shift,ctrlKey:ctrl||altGraph,altKey:alt||altGraph,metaKey:meta,altGraph});
    setShift(false);setCtrl(false);setAlt(false);setMeta(false);setAltGraph(false);
  }
  return <section className="terex-keyboard" aria-label="On-screen terminal keyboard">
    <div className="terex-rule"><span>KEYBOARD</span><span title={error}>{disabled?"SELECT A TERMINAL":layout?.name??(error?"LAYOUT UNAVAILABLE":"DETECTING LAYOUT")}</span></div>
    {ROWS.map(row=><div className="terex-key-row" key={row[0]}>{row.map(code=>{
      const legend=layout?.keys[code];const label=LABELS[code]??legend?.values[mask]??code.replace(/^Key|^Digit/,"");
      const active=(code.startsWith("Shift")&&shift)||(code.startsWith("Control")&&ctrl)||(code.startsWith("Meta")&&meta)||(code.startsWith("Alt")&&(alt||(code==="AltRight"&&altGraph)))||(code==="CapsLock"&&caps);
      return <button type="button" key={code} aria-label={code==="Space"?"Space":LABELS[code]??legend?.values[0]??code} title={code} aria-pressed={active||pressed===code} disabled={disabled||(!LABELS[code]&&code!=="Space"&&!legend)} className={`terex-key ${LABELS[code]!==undefined?"terex-key-wide":""} ${code==="Space"?"terex-key-space":""} ${code==="Enter"?"terex-key-enter":""}`} onMouseDown={e=>e.preventDefault()} onClick={()=>press(code)}>{label.toLocaleUpperCase()}</button>;
    })}</div>)}
  </section>;
}
