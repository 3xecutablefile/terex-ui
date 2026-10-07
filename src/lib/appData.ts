import { invoke } from "@tauri-apps/api/core";

type StoragePaths = { data: string; config: string; local_data: string };

const paths = await Promise.resolve()
  .then(() => invoke<StoragePaths>("shared_storage_paths"))
  .catch(() => null);

export function appDataFile(name: string): string {
  return paths?.data ? `${paths.data.replace(/[\\/]+$/, "")}/${name}` : name;
}

export const sharedConfigDirectory = paths?.config ?? null;
