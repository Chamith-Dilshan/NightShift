use crate::error::{AppError, Result};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Tool {
    Ffmpeg,
    Ffprobe,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub tool: Tool,
    pub source: String, // "custom" | "managed" | "system" | "missing"
    pub path: Option<String>,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    pub video_encoders: Vec<String>,
    pub audio_encoders: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum InstallEvent {
    Started { total_bytes: Option<u64> },
    Progress { bytes: u64, total: Option<u64> },
    Verifying,
    Extracting,
    Done { status: ToolStatus },
    Error { message: String },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ManifestFile {
    pub schema_version: u32,
    pub tools: HashMap<String, ManifestTool>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ManifestTool {
    pub version: String,
    pub license: String,
    pub platforms: HashMap<String, ManifestPlatform>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ManifestPlatform {
    pub url: String,
    pub sha256: String,
    pub archive: String, // "zip" | "tar.xz" | "tar.gz"
    pub files: HashMap<String, String>, // "ffmpeg": "bin/ffmpeg.exe"
}

pub struct ToolManager {
    custom_paths: Arc<Mutex<HashMap<Tool, String>>>,
    capabilities_cache: Arc<Mutex<HashMap<String, Capabilities>>>,
}

impl ToolManager {
    pub fn new() -> Self {
        Self {
            custom_paths: Arc::new(Mutex::new(HashMap::new())),
            capabilities_cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn set_custom_path(&self, tool: Tool, path: String) {
        let mut map = self.custom_paths.lock().unwrap();
        map.insert(tool, path);
    }

    pub fn get_custom_path(&self, tool: Tool) -> Option<String> {
        let map = self.custom_paths.lock().unwrap();
        map.get(&tool).cloned()
    }

    pub fn resolve_tool_path(&self, app: &AppHandle, tool: Tool) -> Option<(String, String)> {
        // 1. Custom path
        if let Some(custom) = self.get_custom_path(tool) {
            if let Ok(_ver) = check_tool_version(&custom) {
                return Some((custom, "custom".to_string()));
            }
        }

        // 2. Managed install
        if let Some(managed) = get_managed_tool_path(app, tool) {
            if let Ok(_ver) = check_tool_version(&managed) {
                return Some((managed, "managed".to_string()));
            }
        }

        // 3. System PATH
        let binary_name = match tool {
            Tool::Ffmpeg => {
                if cfg!(target_os = "windows") {
                    "ffmpeg.exe"
                } else {
                    "ffmpeg"
                }
            }
            Tool::Ffprobe => {
                if cfg!(target_os = "windows") {
                    "ffprobe.exe"
                } else {
                    "ffprobe"
                }
            }
        };

        if let Ok(path) = which::which(binary_name) {
            let path_str = path.to_string_lossy().to_string();
            if let Ok(_ver) = check_tool_version(&path_str) {
                return Some((path_str, "system".to_string()));
            }
        }

        None
    }

    pub fn get_status(&self, app: &AppHandle, tool: Tool) -> ToolStatus {
        if let Some((path, source)) = self.resolve_tool_path(app, tool) {
            let version = check_tool_version(&path).ok();
            ToolStatus {
                tool,
                source,
                path: Some(path),
                version,
            }
        } else {
            ToolStatus {
                tool,
                source: "missing".to_string(),
                path: None,
                version: None,
            }
        }
    }
}

impl Default for ToolManager {
    fn default() -> Self {
        Self::new()
    }
}

pub fn check_tool_version(binary_path: &str) -> Result<String> {
    let mut cmd = std::process::Command::new(binary_path);
    cmd.arg("-version");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|e| AppError::Tool(format!("Failed to run {}: {}", binary_path, e)))?;
    if !output.status.success() {
        return Err(AppError::Tool(format!("Binary exited with non-zero status: {}", binary_path)));
    }

    let out_str = String::from_utf8_lossy(&output.stdout);
    let first_line = out_str.lines().next().unwrap_or("").trim().to_string();
    if first_line.is_empty() {
        return Err(AppError::Tool("Empty version output".to_string()));
    }

    Ok(first_line)
}

fn get_managed_tool_path(app: &AppHandle, tool: Tool) -> Option<String> {
    let local_data = app.path().app_local_data_dir().ok()?;
    let tool_name = match tool {
        Tool::Ffmpeg => "ffmpeg",
        Tool::Ffprobe => "ffprobe",
    };
    let exe_name = if cfg!(target_os = "windows") {
        format!("{}.exe", tool_name)
    } else {
        tool_name.to_string()
    };

    let tools_dir = local_data.join("tools").join(tool_name);
    if !tools_dir.exists() {
        return None;
    }

    // Look in subdirectories of tools_dir for newest/valid version
    if let Ok(entries) = std::fs::read_dir(&tools_dir) {
        for entry in entries.flatten() {
            let p = entry.path().join(&exe_name);
            if p.is_file() {
                return Some(p.to_string_lossy().to_string());
            }
            // Or inside a bin/ subfolder
            let bin_p = entry.path().join("bin").join(&exe_name);
            if bin_p.is_file() {
                return Some(bin_p.to_string_lossy().to_string());
            }
        }
    }

    None
}

#[tauri::command]
pub async fn tool_status(
    app: AppHandle,
    state: tauri::State<'_, ToolManager>,
) -> std::result::Result<Vec<ToolStatus>, AppError> {
    let s1 = state.get_status(&app, Tool::Ffmpeg);
    let s2 = state.get_status(&app, Tool::Ffprobe);
    Ok(vec![s1, s2])
}

#[tauri::command]
pub async fn tool_set_custom_path(
    _app: AppHandle,
    state: tauri::State<'_, ToolManager>,
    tool: Tool,
    path: String,
) -> std::result::Result<ToolStatus, AppError> {
    let version = check_tool_version(&path)?;
    state.set_custom_path(tool, path.clone());
    Ok(ToolStatus {
        tool,
        source: "custom".to_string(),
        path: Some(path),
        version: Some(version),
    })
}

#[tauri::command]
pub async fn tool_capabilities(
    app: AppHandle,
    state: tauri::State<'_, ToolManager>,
) -> std::result::Result<Capabilities, AppError> {
    let status = state.get_status(&app, Tool::Ffmpeg);
    let path = match status.path {
        Some(p) => p,
        None => return Ok(Capabilities::default()),
    };

    let cache_key = format!("{}:{}", path, status.version.unwrap_or_default());
    {
        let cache = state.capabilities_cache.lock().unwrap();
        if let Some(caps) = cache.get(&cache_key) {
            return Ok(caps.clone());
        }
    }

    let mut cmd = Command::new(&path);
    cmd.args(["-hide_banner", "-encoders"]);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().await?;
    if !output.status.success() {
        return Ok(Capabilities::default());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let target_video = [
        "libx264",
        "libx265",
        "libvpx-vp9",
        "libaom-av1",
    ];
    let target_audio = [
        "aac",
        "libmp3lame",
        "libopus",
        "flac",
    ];

    let mut video_encoders = Vec::new();
    let mut audio_encoders = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        // ffmpeg -encoders lines format: " V..... libx264              H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (encoders: libx264 libx264rgb )"
        for v in target_video {
            if trimmed.contains(v) && !video_encoders.contains(&v.to_string()) {
                video_encoders.push(v.to_string());
            }
        }
        for a in target_audio {
            if trimmed.contains(a) && !audio_encoders.contains(&a.to_string()) {
                audio_encoders.push(a.to_string());
            }
        }
    }

    let caps = Capabilities {
        video_encoders,
        audio_encoders,
    };

    let mut cache = state.capabilities_cache.lock().unwrap();
    cache.insert(cache_key, caps.clone());

    Ok(caps)
}

#[tauri::command]
pub async fn tool_install(
    app: AppHandle,
    state: tauri::State<'_, ToolManager>,
    tool: Tool,
    on_event: Channel<InstallEvent>,
) -> std::result::Result<ToolStatus, AppError> {
    let platform_key = get_platform_key();
    let manifest = load_manifest().await?;

    let tool_key = match tool {
        Tool::Ffmpeg => "ffmpeg",
        Tool::Ffprobe => "ffprobe",
    };

    let tool_manifest = manifest
        .tools
        .get(tool_key)
        .or_else(|| manifest.tools.get("ffmpeg"))
        .ok_or_else(|| AppError::Install(format!("Tool '{}' not in manifest", tool_key)))?;

    let platform_info = tool_manifest
        .platforms
        .get(&platform_key)
        .ok_or_else(|| AppError::Install(format!("Platform '{}' not supported for {}", platform_key, tool_key)))?;

    let local_data = app
        .path()
        .app_local_data_dir()
        .map_err(|e| AppError::Install(e.to_string()))?;

    let temp_dir = local_data.join("temp_download");
    tokio::fs::create_dir_all(&temp_dir).await?;

    let archive_filename = format!("download_{}.part", tool_manifest.version);
    let part_path = temp_dir.join(&archive_filename);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    let res = client
        .get(&platform_info.url)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !res.status().is_success() {
        let msg = format!("Download failed with status: {}", res.status());
        let _ = on_event.send(InstallEvent::Error { message: msg.clone() });
        return Err(AppError::Network(msg));
    }

    let total_size = res.content_length();
    let _ = on_event.send(InstallEvent::Started { total_bytes: total_size });

    let mut file = tokio::fs::File::create(&part_path).await?;
    let mut stream = res.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut hasher = Sha256::new();

    while let Some(chunk_res) = stream.next().await {
        let chunk = match chunk_res {
            Ok(c) => c,
            Err(e) => {
                let _ = tokio::fs::remove_file(&part_path).await;
                let msg = format!("Stream error: {}", e);
                let _ = on_event.send(InstallEvent::Error { message: msg.clone() });
                return Err(AppError::Network(msg));
            }
        };

        hasher.update(&chunk);
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let _ = on_event.send(InstallEvent::Progress {
            bytes: downloaded,
            total: total_size,
        });
    }

    file.flush().await?;
    drop(file);

    let _ = on_event.send(InstallEvent::Verifying);
    let calculated_sha256 = hex::encode(hasher.finalize());
    if !platform_info.sha256.is_empty()
        && !calculated_sha256.eq_ignore_ascii_case(&platform_info.sha256)
    {
        let _ = tokio::fs::remove_file(&part_path).await;
        let msg = format!(
            "Checksum mismatch! Expected: {}, got: {}",
            platform_info.sha256, calculated_sha256
        );
        let _ = on_event.send(InstallEvent::Error { message: msg.clone() });
        return Err(AppError::Install(msg));
    }

    let _ = on_event.send(InstallEvent::Extracting);
    let extract_target = local_data
        .join("tools")
        .join(tool_key)
        .join(&tool_manifest.version);

    tokio::fs::create_dir_all(&extract_target).await?;

    let part_path_clone = part_path.clone();
    let extract_target_clone = extract_target.clone();
    let archive_type = platform_info.archive.clone();

    let extract_res = tokio::task::spawn_blocking(move || {
        extract_archive(&part_path_clone, &extract_target_clone, &archive_type)
    })
    .await
    .map_err(|e| AppError::Install(e.to_string()))?;

    let _ = tokio::fs::remove_file(&part_path).await;

    if let Err(e) = extract_res {
        let msg = format!("Extraction error: {}", e);
        let _ = on_event.send(InstallEvent::Error { message: msg.clone() });
        return Err(e);
    }

    // Set executable permissions on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(entries) = std::fs::read_dir(&extract_target) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    let mut perms = metadata.permissions();
                    perms.set_mode(0o755);
                    let _ = std::fs::set_permissions(entry.path(), perms);
                }
            }
        }
    }

    let status = state.get_status(&app, tool);
    let _ = on_event.send(InstallEvent::Done {
        status: status.clone(),
    });

    Ok(status)
}

fn extract_archive(archive_path: &Path, dest_dir: &Path, archive_type: &str) -> Result<()> {
    if archive_type == "zip" {
        let file = std::fs::File::open(archive_path)?;
        let mut zip = zip::ZipArchive::new(file).map_err(|e| AppError::Install(e.to_string()))?;
        zip.extract(dest_dir).map_err(|e| AppError::Install(e.to_string()))?;
    } else if archive_type == "tar.xz" {
        let file = std::fs::File::open(archive_path)?;
        let decompressor = xz2::read::XzDecoder::new(file);
        let mut tar = tar::Archive::new(decompressor);
        tar.unpack(dest_dir).map_err(|e| AppError::Install(e.to_string()))?;
    } else {
        return Err(AppError::Install(format!("Unsupported archive format: {}", archive_type)));
    }

    Ok(())
}

fn get_platform_key() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    format!("{}-{}", os, arch)
}

async fn load_manifest() -> Result<ManifestFile> {
    let fallback = include_str!("../resources/tools-manifest.fallback.json");
    let manifest: ManifestFile = serde_json::from_str(fallback)?;
    Ok(manifest)
}
