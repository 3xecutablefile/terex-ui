import { subscribeWindowPresentation } from "@/modules/terminal/ghostty/windowPresentation";
import { useTheme } from "@/modules/theme";
import { invoke } from "@tauri-apps/api/core";
import { useEffect,useRef,useState } from "react";

export type PublicNetwork={ip:string;city:string;region:string;country:string;latitude:number;longitude:number};
export function usePublicNetwork(route:string){
  const [network,setNetwork]=useState<PublicNetwork|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let alive=true;let visible=false;let pending=false;let timer:ReturnType<typeof setTimeout>|undefined;
    const refresh=async()=>{if(!alive||!visible||pending)return;pending=true;try{const next=await invoke<PublicNetwork>("public_network");if(alive){setNetwork(next);setError("");}}catch(e){if(alive){setNetwork(null);setError(String(e));}}finally{pending=false;if(alive&&visible)timer=setTimeout(refresh,600_000);}};
    const off=subscribeWindowPresentation(state=>{visible=state.visible;clearTimeout(timer);if(visible)void refresh();});
    return()=>{alive=false;clearTimeout(timer);off();};
  },[route]);
  return {network,error};
}

let landPromise:Promise<number[][]>|null=null;
export function WorldView({network,error}:{network:PublicNetwork|null;error:string}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [points,setPoints]=useState<number[][]>([]);
  const {activeTheme,resolvedMode}=useTheme();
  useEffect(()=>{let alive=true;landPromise??=fetch('/world-points.json').then(r=>{if(!r.ok)throw new Error('Map unavailable');return r.json();});void landPromise.then(p=>{if(alive)setPoints(p);}).catch(()=>{});return()=>{alive=false;};},[]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    let frame=0;
    const draw=()=>{
      const box=el.getBoundingClientRect();if(!box.width||!box.height)return;
      const ratio=Math.min(devicePixelRatio||1,2);el.width=Math.round(box.width*ratio);el.height=Math.round(box.height*ratio);
      const context=el.getContext('2d');if(!context)return;context.scale(ratio,ratio);
      const style=getComputedStyle(el);const x=box.width/2,y=box.height/2,r=Math.min(x,y)*.86;
      const lat=(network?.latitude??15)*Math.PI/180,lon=(network?.longitude??0)*Math.PI/180;
      context.strokeStyle=style.color;context.globalAlpha=.2;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.stroke();context.fillStyle=style.color;
      for(const [longitude,latitude] of points){const a=latitude*Math.PI/180,b=longitude*Math.PI/180-lon;const z=Math.sin(lat)*Math.sin(a)+Math.cos(lat)*Math.cos(a)*Math.cos(b);if(z<=0)continue;const px=Math.cos(a)*Math.sin(b),py=Math.cos(lat)*Math.sin(a)-Math.sin(lat)*Math.cos(a)*Math.cos(b);context.globalAlpha=.25+.7*z;context.fillRect(x+r*px,y-r*py,1.2,1.2);}
      if(network){context.globalAlpha=1;context.strokeStyle=style.getPropertyValue('--ring').trim()||style.color;context.beginPath();context.arc(x,y,5,0,Math.PI*2);context.stroke();context.beginPath();context.moveTo(x-9,y);context.lineTo(x+9,y);context.moveTo(x,y-9);context.lineTo(x,y+9);context.stroke();}
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
    const observer=new ResizeObserver(schedule);observer.observe(el);schedule();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[points,network,activeTheme,resolvedMode]);
  return <div className="terex-globe-wrap"><span className="terex-graph-caption">{network?`${network.city}, ${network.country}`:error?"LOCATION UNAVAILABLE":"LOCATING PUBLIC ENDPOINT"}</span><canvas ref={canvas} className="terex-globe" role="img" aria-label={network?`IP location near ${network.city}, ${network.country}`:"World map"}/><span className="terex-globe-caption" title={error}>{network?`${network.latitude.toFixed(3)}°, ${network.longitude.toFixed(3)}° · IP-BASED LOCATION`:"IP-based approximate location"}</span></div>;
}
