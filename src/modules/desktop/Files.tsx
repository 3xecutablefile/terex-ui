import type { DirEntry } from "@/modules/ai/lib/native";
import { bytes, joinPath, parentPath } from "@/modules/desktop/model";
import {
  listenFsChanged,
  watchAdd,
  watchRemove,
} from "@/modules/explorer/lib/watch";
import { useWorkspaceEnvStore } from "@/modules/workspace";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

function useDirectory(path: string | null, hidden: boolean, revision: number) {
  const workspace = useWorkspaceEnvStore((s) => s.env);
  const [result, setResult] = useState<{
    path: string | null;
    entries: DirEntry[];
    error: string;
    pending: boolean;
  }>({ path: null, entries: [], error: "", pending: false });
  // biome-ignore lint/correctness/useExhaustiveDependencies: Revision explicitly invalidates a directory listing.
  useEffect(() => {
    let alive = true;
    if (!path) {
      setResult({ path, entries: [], error: "", pending: false });
      return;
    }
    setResult((previous) => ({
      path,
      entries: previous.path === path ? previous.entries : [],
      error: "",
      pending: true,
    }));
    void invoke<DirEntry[]>("fs_read_dir", {
      path,
      showHidden: hidden,
      gitDecorations: false,
      workspace,
    }).then(
      (entries) => {
        if (alive) setResult({ path, entries, error: "", pending: false });
      },
      (error) => {
        if (alive)
          setResult({
            path,
            entries: [],
            error: String(error),
            pending: false,
          });
      },
    );
    return () => {
      alive = false;
    };
  }, [path, hidden, workspace, revision]);
  return result;
}

export function useDesktopFiles(
  cwd: string | null,
  onOpenFile: (path: string) => void,
) {
  const [path, setPath] = useState<string | null>(cwd);
  const [hidden, setHidden] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState("");
  const [actionError, setActionError] = useState("");
  const workspace = useWorkspaceEnvStore((s) => s.env);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing workspace must discard the previous workspace's navigation.
  useEffect(() => {
    setPath(cwd);
    setSelection("");
  }, [cwd, workspace]);
  const current = useDirectory(path, hidden, revision);
  const parent = useDirectory(path ? parentPath(path) : null, hidden, revision);
  const selected =
    current.entries.find((entry) => entry.name === selection) ??
    current.entries[0];
  const preview = useDirectory(
    path && selected?.kind === "dir" ? joinPath(path, selected.name) : null,
    hidden,
    revision,
  );
  useEffect(() => {
    if (!path) return;
    let disposed = false;
    let watching = false;
    let unlisten: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void listenFsChanged((paths) => {
      if (
        !paths.some(
          (changed) => changed === path || parentPath(changed) === path,
        )
      )
        return;
      clearTimeout(timer);
      timer = setTimeout(reload, 120);
    })
      .then(async (off) => {
        if (disposed) off();
        else {
          unlisten = off;
          await invoke("workspace_authorize", { path, workspace });
          if (!disposed) {
            watchAdd([path]);
            watching = true;
          }
        }
      })
      .catch(() => {});
    return () => {
      disposed = true;
      clearTimeout(timer);
      unlisten?.();
      if (watching) watchRemove([path]);
    };
  }, [path, reload, workspace]);
  const navigate = (next: string) => {
    setActionError("");
    setSelection("");
    setPath(next);
  };
  async function open(entry: DirEntry, directory = path) {
    if (!directory) return;
    const target = joinPath(directory, entry.name);
    try {
      setActionError("");
      if (entry.kind === "dir") navigate(target);
      else if (entry.kind === "symlink") {
        const canonical = await invoke<string>("fs_canonicalize", {
          path: target,
          workspace,
        });
        const stat = await invoke<{ kind: string }>("fs_stat", {
          path: canonical,
          workspace,
        });
        if (stat.kind === "dir") navigate(canonical);
        else onOpenFile(canonical);
      } else onOpenFile(target);
    } catch (error) {
      setActionError(String(error));
    }
  }
  return {
    path,
    current,
    parent,
    preview,
    selected,
    hidden,
    toggleHidden: () => setHidden(!hidden),
    select: setSelection,
    navigate,
    open,
    reload,
    error: actionError || current.error,
  };
}

export type DesktopFiles = ReturnType<typeof useDesktopFiles>;

function FileGlyph({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      {kind === "dir" ? (
        <path d="M2 7a2 2 0 0 1 2-2h8l3 3h13a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
      ) : kind === "symlink" ? (
        <path d="M12 10H9a6 6 0 0 0 0 12h6v-3H9a3 3 0 0 1 0-6h3zm8 0h3a6 6 0 0 1 0 12h-6v-3h6a3 3 0 0 0 0-6h-3zm-10 5h12v3H10z" />
      ) : (
        <path d="M7 3h12l7 7v19H7zm12 2v7h6z" />
      )}
    </svg>
  );
}

export function Commander({ files }: { files: DesktopFiles }) {
  const { path, current, parent, selected, preview } = files;
  const [highlight, setHighlight] = useState<{
    base: string | null;
    name: string;
  } | null>(null);
  function column(
    entries: DirEntry[],
    base: string | null,
    side: "parent" | "current" | "preview",
  ) {
    return (
      <fieldset
        className={`terex-file-column terex-file-column-${side}`}
        aria-label={`${side} directory`}
      >
        {entries.map((entry) => (
          <button
            type="button"
            key={entry.name}
            className={`terex-file-row ${(side === "current" && entry.name === selected?.name) || (highlight?.base === base && highlight?.name === entry.name) || (side === "parent" && path && joinPath(base ?? "/", entry.name) === path.replace(/\/$/, "")) ? "selected" : ""} ${entry.kind === "dir" ? "is-directory" : ""}`}
            onFocus={() => {
              if (side === "current") files.select(entry.name);
            }}
            onClick={() => {
              if (side === "current") files.select(entry.name);
              else setHighlight({ base, name: entry.name });
            }}
            onDoubleClick={() => void files.open(entry, base)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "ArrowRight") {
                event.preventDefault();
                void files.open(entry, base);
              }
              if (event.key === "ArrowLeft" && path) {
                event.preventDefault();
                files.navigate(parentPath(path));
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                (
                  event.currentTarget.nextElementSibling as HTMLElement | null
                )?.focus();
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                (
                  event.currentTarget
                    .previousElementSibling as HTMLElement | null
                )?.focus();
              }
            }}
          >
            <span className="terex-file-mark">
              {entry.kind === "dir"
                ? "▪"
                : entry.kind === "symlink"
                  ? "↗"
                  : "·"}
            </span>
            <span className="terex-file-name">{entry.name}</span>
            <span className="terex-file-size">
              {entry.kind === "dir" ? "/" : bytes(entry.size)}
            </span>
          </button>
        ))}
      </fieldset>
    );
  }
  return (
    <div className="terex-commander">
      <div className="terex-pathline">
        <span className="terex-path-user">LOCAL</span>
        <span title={path ?? ""}>{path ?? "Opening workspace…"}</span>
        <button
          type="button"
          onClick={files.reload}
          aria-label="Refresh directory"
        >
          ↻
        </button>
      </div>
      {files.error && (
        <div role="alert" className="terex-error">
          {files.error}
        </div>
      )}
      <div className="terex-columns">
        {column(parent.entries, path ? parentPath(path) : null, "parent")}
        {column(current.entries, path, "current")}
        {selected?.kind === "dir" ? (
          column(
            preview.entries,
            path ? joinPath(path, selected.name) : null,
            "preview",
          )
        ) : (
          <div className="terex-file-detail">
            {selected ? (
              <>
                <FileGlyph kind={selected.kind} />
                <strong>{selected.name}</strong>
                <span>
                  {bytes(selected.size)} / {selected.kind.toUpperCase()}
                </span>
                <span>{new Date(selected.mtime).toLocaleString()}</span>
                <button type="button" onClick={() => void files.open(selected)}>
                  OPEN IN EDITOR ↗
                </button>
              </>
            ) : (
              <span>
                {current.pending ? "READING DIRECTORY" : "EMPTY DIRECTORY"}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="terex-file-footer">
        <span>
          {selected?.kind ?? "directory"} {selected?.name ?? "/"}
        </span>
        <span>
          {current.entries.length} entries /{" "}
          {current.pending ? "READING" : "LIVE"}
        </span>
      </div>
    </div>
  );
}

export function FileTiles({
  files,
  onSettings,
  onTerminal,
  onAttach,
  onBrowse,
}: {
  files: DesktopFiles;
  onSettings: () => void;
  onTerminal: (path: string) => void;
  onAttach: (path: string) => void;
  onBrowse: () => void;
}) {
  return (
    <section className="terex-filesystem" aria-label="Filesystem">
      <div className="terex-rule">
        <span>FILESYSTEM</span>
        <span title={files.path ?? ""}>{files.path ?? "--"}</span>
      </div>
      <div className="terex-tiles">
        <button
          type="button"
          className="terex-tile"
          aria-pressed={files.hidden}
          onClick={files.toggleHidden}
        >
          <span className="terex-action-glyph" aria-hidden="true">
            ▦
          </span>
          <span>Show hidden</span>
        </button>
        <button
          type="button"
          className="terex-tile"
          disabled={!files.path || parentPath(files.path) === files.path}
          onClick={() => {
            if (files.path) files.navigate(parentPath(files.path));
            onBrowse();
          }}
        >
          <span className="terex-action-glyph" aria-hidden="true">
            ↰
          </span>
          <span>Go up</span>
        </button>
        {files.current.entries.map((entry) => (
          <button
            type="button"
            className="terex-tile"
            key={entry.name}
            title={entry.name}
            aria-pressed={files.selected?.name === entry.name}
            onClick={() => {
              files.select(entry.name);
            }}
            onDoubleClick={() => {
              if (entry.kind !== "file") onBrowse();
              void files.open(entry);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (entry.kind !== "file") onBrowse();
              void files.open(entry);
            }}
          >
            <FileGlyph kind={entry.kind} />
            <span>{entry.name}</span>
          </button>
        ))}
      </div>
      <div className="terex-file-tools">
        <button type="button" onClick={files.reload}>
          REFRESH
        </button>
        <button
          type="button"
          disabled={!files.path}
          onClick={() => {
            if (files.path) onTerminal(files.path);
          }}
        >
          TERMINAL HERE
        </button>
        <button
          type="button"
          disabled={
            !files.path || !files.selected || files.selected.kind === "dir"
          }
          onClick={() => {
            if (files.path && files.selected)
              onAttach(joinPath(files.path, files.selected.name));
          }}
        >
          ATTACH TO AI
        </button>
        <button type="button" onClick={onSettings}>
          SETTINGS
        </button>
      </div>
    </section>
  );
}
