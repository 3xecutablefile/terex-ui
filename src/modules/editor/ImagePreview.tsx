import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { IS_MAC, IS_WINDOWS } from "@/lib/platform";
import { currentWorkspaceEnv } from "@/modules/workspace";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { Image } from "@tauri-apps/api/image";
import { writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function ImagePreview({path}:{path:string}) {
  const image=useRef<HTMLImageElement>(null);
  const [scale,setScale]=useState<number|null>(null);
  const name=path.split(/[\\/]/).pop()??"image";
  const run=(f:()=>Promise<unknown>)=>{void f().catch(e=>toast.error(String(e)));};
  const copy=async()=>{
    try {await writeImage(path);return;}catch{}
    const img=image.current;
    if(!img?.naturalWidth)throw new Error("Image is not loaded");
    if(img.naturalWidth*img.naturalHeight>16_000_000)throw new Error("This image is too large to rasterize for the clipboard. Use Save Copy.");
    const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const context=canvas.getContext("2d");if(!context)throw new Error("Image conversion unavailable");
    context.drawImage(img,0,0);
    const native=await Image.new(new Uint8Array(context.getImageData(0,0,canvas.width,canvas.height).data.buffer),canvas.width,canvas.height);
    try{await writeImage(native);}finally{await native.close();canvas.width=0;canvas.height=0;}
  };
  const saveCopy=async()=>{
    const destination=await save({defaultPath:name,title:"Save Image Copy"});
    if(destination)await invoke("fs_save_copy",{source:path,destination,workspace:currentWorkspaceEnv()});
  };
  return <ContextMenu><ContextMenuTrigger asChild><div className="flex size-full overflow-auto items-center justify-center" aria-label={`Image preview: ${name}`}>
    <img ref={image} src={convertFileSrc(path)} crossOrigin="anonymous" alt={name} decoding="async" className="object-contain border border-border" style={{maxWidth:scale===null?"100%":"none",maxHeight:scale===null?"100%":"none",width:scale===null?undefined:`${(image.current?.naturalWidth??100)*scale}px`,backgroundImage:"conic-gradient(var(--muted) 0.25turn,transparent 0.25turn 0.5turn,var(--muted) 0.5turn 0.75turn,transparent 0.75turn)",backgroundSize:"20px 20px"}} />
  </div></ContextMenuTrigger><ContextMenuContent className="rounded-sm border border-border">
    <ContextMenuItem onSelect={()=>run(copy)}>Copy Image</ContextMenuItem>
    <ContextMenuItem onSelect={()=>run(saveCopy)}>Save Copy…</ContextMenuItem>
    <ContextMenuItem onSelect={()=>run(()=>writeText(path))}>Copy Path</ContextMenuItem>
    <ContextMenuSeparator/>
    <ContextMenuItem onSelect={()=>setScale(Math.min(8,(scale??1)*1.25))}>Zoom In</ContextMenuItem>
    <ContextMenuItem onSelect={()=>setScale(Math.max(.1,(scale??1)/1.25))}>Zoom Out</ContextMenuItem>
    <ContextMenuItem onSelect={()=>setScale(1)}>Actual Size</ContextMenuItem>
    <ContextMenuItem onSelect={()=>setScale(null)}>Fit to Window</ContextMenuItem>
    <ContextMenuSeparator/>
    <ContextMenuItem onSelect={()=>run(()=>openPath(path))}>Open Externally</ContextMenuItem>
    <ContextMenuItem onSelect={()=>run(()=>revealItemInDir(path))}>Reveal in {IS_MAC?"Finder":IS_WINDOWS?"Explorer":"File Manager"}</ContextMenuItem>
  </ContextMenuContent></ContextMenu>;
}
