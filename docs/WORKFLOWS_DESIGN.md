# NightShift Workflows Design

> **Status:** Design only — v0.2 implements graph-ready seams, not multi-node execution.

## Overview

v0.2 templates are single-node workflows. This document designs the multi-node workflow system for v0.3.

## Node and Edge Model

- **Node:** One tool command with parameters. Same shape as a v0.2 template node.
- **Edge:** Wires an output port of one node to an input port of another.
- **Ports:** Typed by media type and kind (file, files, folder, stdout-value).

## Execution Model

- **Topological order:** Nodes execute in dependency order.
- **Temp workspace:** Each run gets a temporary directory for intermediates.
- **Cleanup:** Intermediate files are cleaned up after successful completion.

## Fan-out and Map

- A batch is a map operation over inputs.
- Collect nodes aggregate results from fan-out.

## Caching

- Key: hash of spec version, node params, input content hash (mtime+size), tool version.
- Invalidation on any key change.

## Failure Semantics

- Fail-fast vs continue branch.
- Partial rerun from a failed node.

## Security

- A workflow is a script: review screen generalizes.
- Network-capable nodes need explicit consent.

## Migration Path

v0.2 templates (single node) are valid v0.3 workflows with one node and no edges.
