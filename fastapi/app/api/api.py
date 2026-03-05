from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.media import run_tool, stream_tool

router = APIRouter()

class RunRequest(BaseModel):
    """
    Data model describing the incoming payload from the Next.js React UI.
    """
    tool: str
    args: list[str]

@router.post("/run")
def run_media(req: RunRequest):
    """
    Primary endpoint for executing predefined media tasks.
    
    Receives JSON containing the `tool` and an array of `args`, then
    proxies them safely through the media service. Returns the raw
    stdout/stderr logs alongside the exit code.
    """
    return run_tool(req.tool, req.args)

@router.post("/run-stream")
def run_media_stream(req: RunRequest):
    """
    SSE endpoint for executing predefined media tasks and streaming the output real-time.
    """
    return StreamingResponse(
        stream_tool(req.tool, req.args),
        media_type="text/event-stream"
    )

@router.get("/tools")
def available_tools():
    return {
        "tools": ["ffmpeg", "cwebp", "dwebp"]
    }
