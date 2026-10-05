use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PathInfo {
    pub path: String,
    pub exists: bool,
    pub is_dir: bool,
    pub is_file: bool,
    pub size_bytes: Option<u64>,
}

#[tauri::command]
pub fn check_paths(paths: Vec<String>) -> Vec<PathInfo> {
    paths
        .into_iter()
        .map(|p| {
            let path_obj = Path::new(&p);
            if let Ok(metadata) = std::fs::metadata(path_obj) {
                PathInfo {
                    path: p,
                    exists: true,
                    is_dir: metadata.is_dir(),
                    is_file: metadata.is_file(),
                    size_bytes: if metadata.is_file() {
                        Some(metadata.len())
                    } else {
                        None
                    },
                }
            } else {
                PathInfo {
                    path: p,
                    exists: false,
                    is_dir: false,
                    is_file: false,
                    size_bytes: None,
                }
            }
        })
        .collect()
}
