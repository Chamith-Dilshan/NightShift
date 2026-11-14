# NightShift Tool Spec Format

> **Status:** Draft — being implemented in v0.2.

The Tool Spec is a declarative JSON format that describes a command-line tool for NightShift.

## Structure

A spec describes:
- **Tool metadata:** id, name, description, category
- **Binaries:** executables belonging to this tool (e.g., `ffmpeg` and `ffprobe`)
- **Install:** how to detect, download, or hint installation
- **Commands:** ways to use the tool (e.g., `transcode`, `thumbnail`)
- **Probes:** capability discovery commands

## Schema Version

Specs declare `schemaVersion` (major number). Newer than supported → refuse with a clear message. Same major → unknown keys ignored with a warning.

## Key Concepts

- **ParamDef:** A parameter definition (number, enum, switch, text, file)
- **Port:** Declared input/output of a command (file, files, folder)
- **ArgNode:** How parameters become command-line arguments
- **ValueExpr:** Expressions for conditional logic and value transformation

## Security

- Specs are data, never code. No `eval`, `new Function`, or dynamic imports.
- Conditions use only the expression language defined in Appendix D of the v0.2 plan.
- Builtin builders/panels can only be referenced by bundled specs (trust tier).

## Examples

See `tool-specs/ffmpeg.json` for the first bundled spec.

## Full Schema

The complete Zod schema lives in `src/core/spec/schema.ts`.
