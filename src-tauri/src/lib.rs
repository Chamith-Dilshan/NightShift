pub mod error;
pub mod jobs;
pub mod line_splitter;
pub mod paths;
pub mod probe;
pub mod progress;
pub mod tools;

use jobs::{cancel_job, run_job, Jobs};
use paths::check_paths;
use probe::probe_media;
use tauri::{Manager, WindowEvent};
use tools::{
    tool_capabilities, tool_install, tool_set_custom_path, tool_status, ToolManager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let jobs_state = Jobs::new();
    let tool_manager = ToolManager::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(jobs_state)
        .manage(tool_manager)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                if let Some(jobs) = window.try_state::<Jobs>() {
                    jobs.cancel_all();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            run_job,
            cancel_job,
            probe_media,
            check_paths,
            tool_status,
            tool_capabilities,
            tool_set_custom_path,
            tool_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
