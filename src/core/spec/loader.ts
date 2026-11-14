import type { ToolSpec } from "./schema";
import { validateSpecForTier } from "./schema";

/**
 * Load a spec from a JSON object and validate it.
 */
export function loadSpec(
  raw: unknown,
  tier: "bundled" | "user" = "bundled"
): { ok: true; spec: ToolSpec } | { ok: false; errors: string[] } {
  return validateSpecForTier(raw, tier);
}

/**
 * Registry of loaded specs by tool ID.
 */
export class SpecRegistry {
  specs = new Map<string, ToolSpec>();

  /**
   * Register a spec. Returns true if registered, false if duplicate.
   */
  register(spec: ToolSpec): boolean {
    if (this.specs.has(spec.id)) {
      return false;
    }
    this.specs.set(spec.id, spec);
    return true;
  }

  /**
   * Get a spec by tool ID.
   */
  get(id: string): ToolSpec | undefined {
    return this.specs.get(id);
  }

  /**
   * Check if a spec is registered.
   */
  has(id: string): boolean {
    return this.specs.has(id);
  }

  /**
   * List all registered tool IDs.
   */
  listIds(): string[] {
    return Array.from(this.specs.keys());
  }

  /**
   * List all registered specs.
   */
  listAll(): ToolSpec[] {
    return Array.from(this.specs.values());
  }
}
