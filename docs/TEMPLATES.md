# NightShift Templates

> **Status:** Draft — being implemented in v0.2.

Templates are saved, shareable configurations of one command of one tool.

## File Formats

- **Single template:** `.nightshift-template.json`
- **Template pack:** `.nightshift-pack.json` (contains multiple templates)

## Template Modes

1. **params mode:** Values for a command's parameters. For tools with a builtin builder (FFmpeg), params is that tool's settings object.
2. **raw mode:** An argv array with placeholders and optional variables.

## Placeholders

Built-in: `{input}`, `{output}`, `{name}`, `{ext}`, `{index}`, `{inputDir}`
Variables: `{var:<id>}` — declared in `raw.variables` with ParamDef shape.

## Security

- Never auto-run on import. Import only adds to the library.
- Review screen before saving shows tools required, mode, resolved command, warnings.
- No executables in templates — only tool + binary ids.
- Paths are stripped on export; user must rechoose on import.

## Operations

Save, duplicate, rename, delete, search/filter, apply, run on files/folder, export, import.

## Migration

v0.1 `VideoTemplate` migrates to `NightShiftTemplate` with tool `ffmpeg`, command `transcode`, mode `params`.
