import { createContext } from "react";

export const WorkspaceVisibility = createContext(true);
export const OpenFilesView = createContext<(() => void) | null>(null);
