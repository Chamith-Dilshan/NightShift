use crate::error::AppError;
use crate::tools::{Tool, ToolManager};
use std::time::Duration;
use tauri::AppHandle;
use tokio::process::Command;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[tauri::command]
pub async fn probe_media(
    app: AppHandle,
    state: tauri::State<'_, ToolManager>,
    path: String,
) -> std::result::Result<serde_json::Value, AppError> {
    let ffprobe_path = state
        .resolve_tool_path(&app, Tool::Ffprobe)
        .map(|(p, _)| p)
        .unwrap_or_else(|| {
            if cfg!(target_os = "windows") {
                "ffprobe.exe".to_string()
            } else {
                "ffprobe".to_string()
            }
        });

    let mut cmd = Command::new(&ffprobe_path);
    cmd.args([
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        &path,
    ]);

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child_future = cmd.output();
    let output = tokio::time::timeout(Duration::from_secs(15), child_future)
        .await
        .map_err(|_| AppError::Tool("ffprobe timed out after 15 seconds".to_string()))?
        .map_err(|e| AppError::Tool(format!("Failed to execute ffprobe: {}", e)))?;

    if !output.status.success() {
        let err_text = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Tool(format!(
            "ffprobe failed (code {:?}): {}",
            output.status.code(),
            err_text.trim()
        )));
    }

    let parsed: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| AppError::Tool(format!("Failed to parse ffprobe JSON output: {}", e)))?;

    Ok(parsed)
}
