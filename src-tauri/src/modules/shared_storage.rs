use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

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
    Ok(SharedStoragePaths {
        data,
        config,
        local_data,
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
    fn terex_and_terax_profiles_do_not_share_data_paths() {
        let root = tempfile::tempdir().unwrap();
        let terex = root.path().join("io.github.3xecutablefile.terex-ui");
        let terax = root.path().join("app.crynta.terax");
        std::fs::create_dir_all(&terex).unwrap();
        std::fs::create_dir_all(&terax).unwrap();
        std::fs::write(terex.join("terex-settings.json"), "terex").unwrap();
        std::fs::write(terax.join("terax-settings.json"), "terax").unwrap();

        assert_ne!(terex, terax);
        assert_eq!(
            std::fs::read_to_string(terex.join("terex-settings.json")).unwrap(),
            "terex"
        );
        assert_eq!(
            std::fs::read_to_string(terax.join("terax-settings.json")).unwrap(),
            "terax"
        );
    }
}
