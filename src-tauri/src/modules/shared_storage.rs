use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Manager;

const TERAX_ID: &str = "app.crynta.terax";

fn legacy_data_directory(current: &Path) -> Option<PathBuf> {
    let legacy = current.with_file_name(TERAX_ID);
    legacy
        .join("terax-settings.json")
        .is_file()
        .then_some(legacy)
}

#[derive(Serialize)]
pub struct SharedStoragePaths {
    pub data: PathBuf,
    pub config: PathBuf,
    pub local_data: PathBuf,
}

pub fn storage_paths(app: &tauri::AppHandle) -> Result<SharedStoragePaths, String> {
    let paths = app.path();
    let data = paths.app_data_dir().map_err(|e| e.to_string())?;
    let config = paths.app_config_dir().map_err(|e| e.to_string())?;
    let local_data = paths.app_local_data_dir().map_err(|e| e.to_string())?;
    Ok(match legacy_data_directory(&data) {
        Some(data) => SharedStoragePaths {
            data,
            config: config.with_file_name(TERAX_ID),
            local_data: local_data.with_file_name(TERAX_ID),
        },
        None => SharedStoragePaths {
            data,
            config,
            local_data,
        },
    })
}

#[tauri::command]
pub fn shared_storage_paths(app: tauri::AppHandle) -> Result<SharedStoragePaths, String> {
    storage_paths(&app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn existing_terax_store_is_shared_without_copying_or_overwriting() {
        let root = tempfile::tempdir().unwrap();
        let current = root.path().join("io.github.3xecutablefile.terex-ui");
        let old = root.path().join(TERAX_ID);
        std::fs::create_dir_all(&current).unwrap();
        std::fs::write(current.join("terax-settings.json"), "new-app-data").unwrap();
        assert!(legacy_data_directory(&current).is_none());
        std::fs::create_dir_all(&old).unwrap();
        assert!(legacy_data_directory(&current).is_none());
        std::fs::write(old.join("terax-settings.json"), "original-data").unwrap();
        assert_eq!(legacy_data_directory(&current), Some(old.clone()));
        assert_eq!(
            std::fs::read_to_string(old.join("terax-settings.json")).unwrap(),
            "original-data"
        );
        assert_eq!(
            std::fs::read_to_string(current.join("terax-settings.json")).unwrap(),
            "new-app-data"
        );
    }
}
