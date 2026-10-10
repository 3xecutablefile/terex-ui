import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { IS_MAC, USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { WindowControls } from "@/components/WindowControls";
import { WorkspaceVisibility, OpenFilesView } from "@/lib/workspaceVisibility";
import { Commander, useDesktopFiles } from "@/modules/desktop/Files";
import { FilesMenu, type FileMenuActions } from "@/modules/desktop/FilesMenu";
import { Keyboard, type VirtualKey } from "@/modules/desktop/Keyboard";
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
  onKey: (key: VirtualKey) => void;
  onAccept: (run: boolean) => boolean;
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
  fileActions: Pick<
    FileMenuActions,
    "onSourceControl" | "onHistory" | "onDeleted"
  >;
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
            className={`terex-topline ${IS_MAC ? "has-native-controls" : ""} ${USE_CUSTOM_WINDOW_CONTROLS ? "has-custom-controls" : ""}`}
            data-tauri-drag-region
          >
            <strong>TEREX UI</strong>
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
              <button type="button" onClick={props.onCommands}>
                COMMANDS
              </button>
              <button type="button" onClick={props.onSettings}>
                CONFIG
              </button>
            </nav>
            <WindowControls />
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
                <WorkspaceVisibility.Provider value={!fileMode || props.zen}>
                  <OpenFilesView.Provider value={() => setFileMode(true)}>
                    {props.children}
                  </OpenFilesView.Provider>
                </WorkspaceVisibility.Provider>
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
                  <FilesMenu
                    files={files}
                    actions={{
                      onTerminal: (path) => {
                        setFileMode(false);
                        props.onTerminal(path);
                      },
                      onSourceControl: (path) => {
                        setFileMode(false);
                        props.fileActions.onSourceControl(path);
                      },
                      onHistory: (path) => {
                        setFileMode(false);
                        props.fileActions.onHistory(path);
                      },
                      onAttach: props.onAttach,
                      onDeleted: props.fileActions.onDeleted,
                    }}
                  >
                    <Commander files={files} />
                  </FilesMenu>
                </div>
              )}
            </div>
            {!props.zen && <NetworkRail {...telemetry} />}
          </div>
          {!props.zen && (
            <div className="terex-bottom-deck">
              <Keyboard
                disabled={!props.terminalActive}
                onKey={(value) => {
                  setFileMode(false);
                  props.onKey(value);
                }}
                onAccept={(run) => {
                  const accepted = props.onAccept(run);
                  if (accepted) setFileMode(false);
                  return accepted;
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
              <span>TEREX UI</span>
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
