use tauri::{Emitter, WindowEvent};

/// Main entry point for the Tauri application.
/// 
/// This function initializes the Tauri V2 environment, registers essential plugins
/// (such as clipboard and OS dialog capabilities), and sets up window event listeners.
/// 
/// Crucially, it listens for native OS `DragDrop` events and forwards the absolute file
/// paths to the Next.js frontend via a `file-drop` event. This is necessary because 
/// standard browser `onDrop` handlers only provide blob URIs, which cannot be passed
/// to the FastAPI/FFmpeg sidecar.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
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
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            // Forward native drag-drop paths to the JS frontend.
            // browser onDrop only gives blob URLs — Tauri events give real OS paths.
            if let WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                let string_paths: Vec<String> = paths
                    .iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                let _ = window.emit("file-drop", string_paths);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
