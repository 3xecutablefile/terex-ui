export class ShiftTap {
  private code:string|null=null;
  cancel():void {this.code=null;}
  down(event:Pick<KeyboardEvent,"code"|"ctrlKey"|"altKey"|"metaKey"|"repeat">):void {
    if(event.code!=="ShiftLeft"&&event.code!=="ShiftRight"){this.code=null;return;}
    if(!event.repeat&&!event.ctrlKey&&!event.altKey&&!event.metaKey)this.code=event.code;
  }
  up(code:string):"accept"|"submit"|null {
    const active=this.code;this.code=null;
    return active===code?(code==="ShiftRight"?"submit":"accept"):null;
  }
}
