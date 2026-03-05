"""
Media Service Module
Executes underlying system binaries via subprocess. Allows seamless
integration between the FastAPI layer and the binaries installed/packaged
alongside NightShift (FFmpeg, Cwebp, Dwebp).
"""

import subprocess
from app.config import FFMPEG, CWEBP, DWEBP

# A strict map enforcing the execution of only known, safe binaries.
# Prevents arbitrary remote code execution via the sidecar API.
ALLOWED_TOOLS = {
    "ffmpeg": FFMPEG,
    "cwebp": CWEBP,
    "dwebp": DWEBP,
}

def run_tool(tool: str, args: list[str]) -> dict:
    """
    Submits a predefined media tool command to the system OS.
    
    This function blocks execution until the subprocess completes, making it
    ideal for short-lived commands (e.g., getting file info). In future
    phases, this should be upgraded to stream standard output dynamically
    (via Popen and yield) for heavy transcoding tasks.
    
    Args:
        tool (str): The name of the binary to run (e.g., 'ffmpeg').
                    Must match a key in ALLOWED_TOOLS.
        args (list[str]): The array of arguments constructed by the 
                          frontend's commandBuilder.ts.
                          
    Returns:
        dict: A structured dictionary containing the execution metrics:
              - tool: The executed tool name.
              - cmd: Full resolved command list.
              - stdout: Standard output string from the execution.
              - stderr: Error logs (e.g., FFmpeg prints logs to stderr).
              - exit_code: Integer return code (0 = success).
              - error (optional): Descriptive string if execution utterly failed.
    """
    if tool not in ALLOWED_TOOLS:
        return {"error": "Tool not allowed"}

    binary = ALLOWED_TOOLS[tool]

    if not binary.exists():
        return {"error": f"{tool} binary not found"}

    cmd = [str(binary)] + args

    try:
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )

        return {
            "tool": tool,
            "cmd": cmd,
            "stdout": process.stdout,
            "stderr": process.stderr,
            "exit_code": process.returncode
        }

    except Exception as e:
        return {"error": str(e)}

def stream_tool(tool: str, args: list[str]):
    """
    Executes a media tool and yields its stdout/stderr line-by-line.
    Designed to be consumed by a FastAPI StreamingResponse (Server-Sent Events).
    """
    if tool not in ALLOWED_TOOLS:
        yield f"data: [Error] Tool '{tool}' not allowed\n\n"
        return

    binary = ALLOWED_TOOLS[tool]

    if not binary.exists():
        yield f"data: [Error] Binary '{tool}' not found at {binary}\n\n"
        return

    cmd = [str(binary)] + args
    yield f"data: [System] Starting execution: {' '.join(cmd)}\n\n"

    try:
        # FFmpeg writes mostly to stderr, so we merge stderr into stdout
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1, # Line buffered
            universal_newlines=True
        )

        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                if line:
                    # SSE format: data: <message>\n\n
                    # Replace newlines in line to avoid breaking SSE protocol
                    clean_line = line.replace('\n', '')
                    yield f"data: {clean_line}\n\n"
        
        process.stdout.close()
        return_code = process.wait()
        
        if return_code == 0:
            yield f"data: [System] Process completed successfully.\n\n"
        else:
            yield f"data: [Error] Process exited with error code {return_code}.\n\n"
            
        yield "data: [DONE]\n\n"

    except Exception as e:
        yield f"data: [Error] Execution failed: {str(e)}\n\n"
        yield "data: [DONE]\n\n"
