import { USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { cn } from "@/lib/utils";
import {
  Cancel01Icon,
  Copy01Icon,
  MinusSignIcon,
  SquareIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  /** Render only the close button (used by the settings window). */
  closeOnly?: boolean;
};

export function WindowControls({ closeOnly = false }: Props) {
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!USE_CUSTOM_WINDOW_CONTROLS || closeOnly) return;
    const w = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try {
        const [max, full] = await Promise.all([
          w.isMaximized(),
          w.isFullscreen(),
        ]);
        if (!disposed) {
          setMaximized(max);
          setFullscreen(full);
        }
      } catch (error) {
        if (!disposed) toast.error(String(error));
      }
    };
    void refresh();
    void w
      .onResized(() => {
        clearTimeout(timer);
        timer = setTimeout(() => void refresh(), 100);
      })
      .then((un) => {
        if (disposed) un();
        else unlisten = un;
      })
      .catch((error) => {
        if (!disposed) toast.error(String(error));
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      unlisten?.();
    };
  }, [closeOnly]);

  if (!USE_CUSTOM_WINDOW_CONTROLS) return null;

  const w = getCurrentWindow();
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset
      data-window-controls
      aria-label="Window controls"
      className="m-0 flex min-w-0 shrink-0 items-center gap-0.5 border-0 p-0 pr-1"
    >
      {!closeOnly && (
        <>
          <CtlButton
            ariaLabel="Minimize"
            disabled={busy}
            onClick={() => void run(() => w.minimize())}
          >
            <HugeiconsIcon icon={MinusSignIcon} size={12} strokeWidth={2} />
          </CtlButton>
          <CtlButton
            ariaLabel={maximized ? "Restore" : "Maximize"}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await w.toggleMaximize();
                setMaximized(await w.isMaximized());
              })
            }
          >
            <HugeiconsIcon
              icon={maximized ? Copy01Icon : SquareIcon}
              size={12}
              strokeWidth={2}
            />
          </CtlButton>
          <CtlButton
            ariaLabel={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const next = !(await w.isFullscreen());
                await w.setFullscreen(next);
                setFullscreen(next);
              })
            }
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M1 6V1h5m4 0h5v5M1 10v5h5m4 0h5v-5" />
            </svg>
          </CtlButton>
        </>
      )}
      <CtlButton
        ariaLabel="Close"
        disabled={busy}
        onClick={() => void run(() => w.close())}
        danger
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
      </CtlButton>
    </fieldset>
  );
}

function CtlButton({
  ariaLabel,
  onClick,
  children,
  danger,
  disabled,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors focus-visible:outline focus-visible:outline-ring disabled:opacity-40",
        danger
          ? "hover:bg-destructive/15 hover:text-destructive"
          : "hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
