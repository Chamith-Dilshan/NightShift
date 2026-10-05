use crate::error::AppError;
use crate::line_splitter::LineSplitter;
use crate::progress::ProgressParser;
use crate::tools::{Tool, ToolManager};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::ipc::Channel;
use tauri::AppHandle;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::{ChildStdin, Command};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JobSpec {
    pub tool: Tool,
    pub args: Vec<String>,
    pub output_path: Option<String>,
    pub output_existed: bool,
    pub duration_ms: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum JobEvent {
    Started {
        pid: u32,
        command_line: String,
    },
    Log {
        stream: String,
        line: String,
    },
    Progress {
        out_time_ms: u64,
        frame: Option<u64>,
        fps: Option<f32>,
        speed: Option<f32>,
        bitrate_kbps: Option<f32>,
        size_bytes: Option<u64>,
        percent: Option<f32>,
    },
    Exit {
        code: Option<i32>,
        cancelled: bool,
        duration_ms: u64,
        error: Option<String>,
    },
}

pub struct ActiveJob {
    pub stdin: Option<ChildStdin>,
    pub cancelled: Arc<AtomicBool>,
}

pub struct Jobs {
    active: Arc<Mutex<HashMap<String, ActiveJob>>>,
}

impl Jobs {
    pub fn new() -> Self {
        Self {
            active: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn cancel_all(&self) {
        let mut jobs = self.active.lock().unwrap();
        for (_, job) in jobs.iter_mut() {
            job.cancelled.store(true, Ordering::SeqCst);
            if let Some(mut stdin) = job.stdin.take() {
                tokio::spawn(async move {
                    let _ = stdin.write_all(b"q\n").await;
                    let _ = stdin.flush().await;
                });
            }
        }
    }
}

impl Default for Jobs {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn cancel_job(
    state: tauri::State<'_, Jobs>,
    job_id: String,
) -> std::result::Result<(), AppError> {
    let stdin_opt;
    {
        let mut map = state.active.lock().unwrap();
        if let Some(job) = map.get_mut(&job_id) {
            job.cancelled.store(true, Ordering::SeqCst);
            stdin_opt = job.stdin.take();
        } else {
            return Err(AppError::Job(format!("Job '{}' not found", job_id)));
        }
    }

    if let Some(mut stdin) = stdin_opt {
        let _ = stdin.write_all(b"q\n").await;
        let _ = stdin.flush().await;
    }

    Ok(())
}

#[tauri::command]
pub async fn run_job(
    app: AppHandle,
    jobs_state: tauri::State<'_, Jobs>,
    tools_state: tauri::State<'_, ToolManager>,
    job_id: String,
    spec: JobSpec,
    on_event: Channel<JobEvent>,
) -> std::result::Result<(), AppError> {
    // 1. Check duplicate job_id
    {
        let map = jobs_state.active.lock().unwrap();
        if map.contains_key(&job_id) {
            return Err(AppError::Job(format!("Job '{}' already running", job_id)));
        }
    }

    // 2. Resolve tool path
    let (tool_path, _) = tools_state
        .resolve_tool_path(&app, spec.tool)
        .ok_or_else(|| AppError::Tool(format!("Tool {:?} is not installed or resolved", spec.tool)))?;

    // 3. Prepare args & inject progress pipe
    let mut final_args = Vec::new();
    if spec.tool == Tool::Ffmpeg {
        if !spec.args.iter().any(|a| a == "-progress") {
            final_args.push("-progress".to_string());
            final_args.push("pipe:1".to_string());
        }
        if !spec.args.iter().any(|a| a == "-nostats") {
            final_args.push("-nostats".to_string());
        }
    }
    final_args.extend(spec.args.clone());

    let command_line = format!("{} {}", tool_path, final_args.join(" "));

    // 4. Spawn child
    let mut cmd = Command::new(&tool_path);
    cmd.args(&final_args);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.kill_on_drop(true);

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().map_err(|e| AppError::Job(format!("Failed to spawn process: {}", e)))?;
    let pid = child.id().unwrap_or(0);
    let stdin = child.stdin.take();
    let stdout = child.stdout.take().ok_or_else(|| AppError::Job("Failed to open stdout".to_string()))?;
    let stderr = child.stderr.take().ok_or_else(|| AppError::Job("Failed to open stderr".to_string()))?;

    let cancelled_flag = Arc::new(AtomicBool::new(false));

    {
        let mut map = jobs_state.active.lock().unwrap();
        map.insert(
            job_id.clone(),
            ActiveJob {
                stdin,
                cancelled: cancelled_flag.clone(),
            },
        );
    }

    let _ = on_event.send(JobEvent::Started {
        pid,
        command_line,
    });

    let start_time = Instant::now();
    let duration_target_ms = spec.duration_ms;

    // 5. Streams reading tasks
    let event_tx_stdout = on_event.clone();
    let stdout_task = tokio::spawn(async move {
        let mut reader = stdout;
        let mut splitter = LineSplitter::new();
        let mut parser = ProgressParser::new();
        let mut buf = [0u8; 4096];
        let mut last_progress_time = Instant::now() - Duration::from_secs(1);

        while let Ok(n) = reader.read(&mut buf).await {
            if n == 0 {
                break;
            }
            let lines = splitter.feed(&buf[..n]);
            for line in lines {
                let trimmed = line.trim();
                let is_progress_kv = trimmed.starts_with("frame=")
                    || trimmed.starts_with("fps=")
                    || trimmed.starts_with("stream_")
                    || trimmed.starts_with("bitrate=")
                    || trimmed.starts_with("total_size=")
                    || trimmed.starts_with("out_time_us=")
                    || trimmed.starts_with("out_time_ms=")
                    || trimmed.starts_with("out_time=")
                    || trimmed.starts_with("dup_frames=")
                    || trimmed.starts_with("drop_frames=")
                    || trimmed.starts_with("speed=")
                    || trimmed.starts_with("progress=");

                if let Some(prog) = parser.feed_line(&line, duration_target_ms) {
                    let now = Instant::now();
                    if prog.is_end || now.duration_since(last_progress_time) >= Duration::from_millis(250) {
                        last_progress_time = now;
                        let _ = event_tx_stdout.send(JobEvent::Progress {
                            out_time_ms: prog.out_time_ms,
                            frame: prog.frame,
                            fps: prog.fps,
                            speed: prog.speed,
                            bitrate_kbps: prog.bitrate_kbps,
                            size_bytes: prog.size_bytes,
                            percent: prog.percent,
                        });
                    }
                } else if !is_progress_kv && !trimmed.is_empty() {
                    let _ = event_tx_stdout.send(JobEvent::Log {
                        stream: "stdout".to_string(),
                        line,
                    });
                }
            }
        }

        if let Some(trailing) = splitter.flush() {
            let trimmed = trailing.trim();
            if !trimmed.is_empty() {
                let _ = event_tx_stdout.send(JobEvent::Log {
                    stream: "stdout".to_string(),
                    line: trailing,
                });
            }
        }
    });

    let event_tx_stderr = on_event.clone();
    let last_err_line = Arc::new(Mutex::new(None));
    let last_err_clone = last_err_line.clone();

    let stderr_task = tokio::spawn(async move {
        let mut reader = stderr;
        let mut splitter = LineSplitter::new();
        let mut buf = [0u8; 4096];

        while let Ok(n) = reader.read(&mut buf).await {
            if n == 0 {
                break;
            }
            let lines = splitter.feed(&buf[..n]);
            for line in lines {
                if !line.trim().is_empty() {
                    let mut lock = last_err_clone.lock().unwrap();
                    *lock = Some(line.clone());
                }
                let _ = event_tx_stderr.send(JobEvent::Log {
                    stream: "stderr".to_string(),
                    line,
                });
            }
        }

        if let Some(trailing) = splitter.flush() {
            if !trailing.trim().is_empty() {
                let mut lock = last_err_clone.lock().unwrap();
                *lock = Some(trailing.clone());
                let _ = event_tx_stderr.send(JobEvent::Log {
                    stream: "stderr".to_string(),
                    line: trailing,
                });
            }
        }
    });

    // Wait for process to exit
    let exit_status = child.wait().await;
    let _ = stdout_task.await;
    let _ = stderr_task.await;

    let duration_ms = start_time.elapsed().as_millis() as u64;
    let was_cancelled = cancelled_flag.load(Ordering::SeqCst);

    let (exit_code, err_msg) = match exit_status {
        Ok(status) => {
            let code = status.code();
            let err = if !status.success() && !was_cancelled {
                let lock = last_err_line.lock().unwrap();
                lock.clone()
            } else {
                None
            };
            (code, err)
        }
        Err(e) => (None, Some(e.to_string())),
    };

    // Cleanup on failure or cancellation
    let is_failure = exit_code.map(|c| c != 0).unwrap_or(true);
    if (was_cancelled || is_failure) && !spec.output_existed {
        if let Some(ref out_path) = spec.output_path {
            let _ = tokio::fs::remove_file(out_path).await;
        }
    }

    // Send final Exit event
    let _ = on_event.send(JobEvent::Exit {
        code: exit_code,
        cancelled: was_cancelled,
        duration_ms,
        error: err_msg,
    });

    // Remove from active map
    {
        let mut map = jobs_state.active.lock().unwrap();
        map.remove(&job_id);
    }

    Ok(())
}
