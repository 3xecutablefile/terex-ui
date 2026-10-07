import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { IS_MAC } from "@/lib/platform";
import {
  Commander,
  FileActions,
  useDesktopFiles,
} from "@/modules/desktop/Files";
import { Keyboard } from "@/modules/desktop/Keyboard";
import { bytes } from "@/modules/desktop/model";
import {
  NetworkRail,
  SystemRail,
  useTelemetry,
} from "@/modules/desktop/Telemetry";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  cwd: string | null;
  activeId: number;
  scopeKey: string;
  terminalLabel: string;
  ready: boolean;
  terminalActive: boolean;
  zen: boolean;
  aiOpen: boolean;
  onInput: (value: string) => void;
  onOpenFile: (path: string) => void;
  onTerminal: (path: string) => void;
  onNavigate: (path: string) => Promise<void>;
  getSelection: () => string;
  onCopy: (text: string) => void;
  onPaste: () => void;
  onAi: () => void;
  onAttach: (path: string) => void;
  onSettings: () => void;
  onCommands: () => void;
};

export function Desktop(props: Props) {
  const [fileMode, setFileMode] = useState(true);
  const [nativeEditMenu, setNativeEditMenu] = useState(false);
  const [selection, setSelection] = useState("");
  const telemetry = useTelemetry(!props.zen);
  const files = useDesktopFiles(
    props.cwd,
    (path) => {
      setFileMode(false);
      props.onOpenFile(path);
    },
    props.scopeKey,
    props.onNavigate,
    fileMode && !props.zen,
  );
  useEffect(() => {
    if (!props.terminalActive) setFileMode(false);
  }, [props.terminalActive]);
  useEffect(() => {
    if (props.aiOpen) setFileMode(false);
  }, [props.aiOpen]);
  const previousTab = useRef({ id: props.activeId, ready: false });
  useEffect(() => {
    if (previousTab.current.ready && previousTab.current.id !== props.activeId)
      setFileMode(false);
    previousTab.current = { id: props.activeId, ready: props.ready };
  }, [props.activeId, props.ready]);
  const disk = telemetry.snapshot?.disks
    .filter((d) => files.path?.startsWith(d.mount))
    .sort((a, b) => b.mount.length - a.mount.length)[0];
  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        className="select-auto"
        disabled={nativeEditMenu}
      >
        <div
          className={`terex-desktop ${props.zen ? "is-zen" : ""}`}
          onPointerDownCapture={(event) =>
            setNativeEditMenu(
              !!(event.target as HTMLElement).closest(
                'input,textarea,[contenteditable="true"]',
              ) &&
                !(event.target as HTMLElement).closest("[data-terminal-tab]"),
            )
          }
          onFocusCapture={(event) =>
            setNativeEditMenu(
              !!(event.target as HTMLElement).closest(
                'input,textarea,[contenteditable="true"]',
              ) &&
                !(event.target as HTMLElement).closest("[data-terminal-tab]"),
            )
          }
          onContextMenuCapture={() => setSelection(props.getSelection())}
        >
          <div
            className={`terex-topline ${IS_MAC ? "has-native-controls" : ""}`}
            data-tauri-drag-region
          >
            <strong>TEREX UI</strong>
            <span className="terex-topline-subtitle">
              NATIVE INTELLIGENCE CONSOLE
            </span>
            <nav aria-label="Workspace views">
              <button
                type="button"
                aria-pressed={fileMode}
                onClick={() => setFileMode(true)}
              >
                FILES
              </button>
              <button
                type="button"
                aria-pressed={!fileMode}
                onClick={() => setFileMode(false)}
              >
                WORKSPACE
              </button>
              <button
                type="button"
                aria-pressed={props.aiOpen}
                onClick={() => {
                  setFileMode(false);
                  props.onAi();
                }}
              >
                AI AGENT
              </button>
              <button type="button" onClick={props.onCommands}>
                COMMANDS
              </button>
              <button type="button" onClick={props.onSettings}>
                CONFIG
              </button>
            </nav>
            <span className="terex-native-status">
              <i />
              {telemetry.error
                ? "NATIVE / UNAVAILABLE"
                : telemetry.snapshot
                  ? "NATIVE / CONNECTED"
                  : "NATIVE / CONNECTING"}
            </span>
          </div>
          <div className="terex-top-deck">
            {!props.zen && <SystemRail {...telemetry} />}
            <div
              className="terex-workspace"
              data-file-mode={fileMode && !props.zen}
            >
              <div
                className="terex-workspace-content"
                inert={fileMode && !props.zen}
              >
                {props.children}
              </div>
              {fileMode && !props.zen && (
                <div className="terex-browser-surface">
                  <div className="terex-browser-tabs">
                    <button
                      type="button"
                      className="selected"
                      onClick={() => setFileMode(true)}
                    >
                      MAIN - files
                    </button>
                    <button type="button" onClick={() => setFileMode(false)}>
                      {props.terminalLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFileMode(false);
                        props.onAi();
                      }}
                    >
                      AI - agent
                    </button>
                    <button type="button" onClick={props.onCommands}>
                      COMMANDS
                    </button>
                    <button type="button" onClick={props.onSettings}>
                      CONFIG
                    </button>
                  </div>
                  <FileActions
                    files={files}
                    terminalActive={props.terminalActive}
                    onAttach={props.onAttach}
                    onTerminal={(path) => {
                      setFileMode(false);
                      props.onTerminal(path);
                    }}
                  />
                  <Commander files={files} />
                </div>
              )}
            </div>
            {!props.zen && <NetworkRail {...telemetry} />}
          </div>
          {!props.zen && (
            <div className="terex-bottom-deck">
              <Keyboard
                disabled={!props.terminalActive}
                onInput={(value) => {
                  setFileMode(false);
                  props.onInput(value);
                }}
              />
            </div>
          )}
          {!props.zen && (
            <footer className="terex-footer">
              <span>
                MOUNT {disk?.mount ?? "/"} /{" "}
                {disk
                  ? `${Math.round((1 - disk.available / Math.max(1, disk.total)) * 100)}% USED`
                  : "--"}
              </span>
              <span>
                {disk
                  ? `${bytes(disk.available)} AVAILABLE`
                  : "NATIVE FILESYSTEM"}
              </span>
              <span>GHOSTTY / RUST / AI</span>
              <span>TEREX UI v0.9</span>
            </footer>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="rounded-sm border border-border font-mono">
        <ContextMenuItem
          disabled={!selection}
          onSelect={() => props.onCopy(selection)}
        >
          Copy selection
        </ContextMenuItem>
        <ContextMenuItem
          disabled={fileMode || !props.terminalActive}
          onSelect={props.onPaste}
        >
          Paste into terminal
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setFileMode(true)}>
          Open Files
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!files.path}
          onSelect={() => {
            if (files.path) {
              setFileMode(false);
              props.onTerminal(files.path);
            }
          }}
        >
          New terminal here
        </ContextMenuItem>
        <ContextMenuItem onSelect={props.onSettings}>Settings</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
