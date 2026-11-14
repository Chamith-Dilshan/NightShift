import { CommandDef, ParamDef } from "./schema";
import { evalExpr, EvalContext } from "./expr";
import { Issue } from "./argBuilder";

// ─── Validator ───

/**
 * Validate parameter values against their definitions and rules.
 * Returns issues with path, message, and severity.
 */
export function validateParams(
  command: CommandDef,
  params: Record<string, unknown>,
  ctx: EvalContext
): Issue[] {
  const issues: Issue[] = [];

  // Type and range checks
  for (const param of command.params) {
    const value = params[param.id];
    validateParamType(param, value, issues);
  }

  // Rule evaluation
  for (const rule of command.rules ?? []) {
    if (evalExpr(rule.when, ctx)) {
      // Interpolate {paramId} in message
      let message = rule.message;
      for (const [key, val] of Object.entries(params)) {
        message = message.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
      }
      issues.push({
        path: `rule.${rule.id}`,
        message,
        severity: rule.severity,
      });
    }
  }

  return issues;
}

function validateParamType(param: ParamDef, value: unknown, issues: Issue[]): void {
  // Required check
  if (param.required && (value === undefined || value === null || value === "")) {
    issues.push({
      path: param.id,
      message: `Parameter '${param.label}' is required`,
      severity: "error",
    });
    return;
  }

  // Skip further checks if value is absent and not required
  if (value === undefined || value === null) {
    return;
  }

  // Type checks
  switch (param.type) {
    case "int": {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        issues.push({
          path: param.id,
          message: `Parameter '${param.label}' must be an integer`,
          severity: "error",
        });
      } else {
        if (param.min !== undefined && value < param.min) {
          issues.push({
            path: param.id,
            message: `Parameter '${param.label}' must be >= ${param.min}`,
            severity: "error",
          });
        }
        if (param.max !== undefined && value > param.max) {
          issues.push({
            path: param.id,
            message: `Parameter '${param.label}' must be <= ${param.max}`,
            severity: "error",
          });
        }
      }
      break;
    }

    case "float": {
      if (typeof value !== "number") {
        issues.push({
          path: param.id,
          message: `Parameter '${param.label}' must be a number`,
          severity: "error",
        });
      } else {
        if (param.min !== undefined && value < param.min) {
          issues.push({
            path: param.id,
            message: `Parameter '${param.label}' must be >= ${param.min}`,
            severity: "error",
          });
        }
        if (param.max !== undefined && value > param.max) {
          issues.push({
            path: param.id,
            message: `Parameter '${param.label}' must be <= ${param.max}`,
            severity: "error",
          });
        }
      }
      break;
    }

    case "bool": {
      if (typeof value !== "boolean") {
        issues.push({
          path: param.id,
          message: `Parameter '${param.label}' must be a boolean`,
          severity: "error",
        });
      }
      break;
    }

    case "string": {
      if (typeof value !== "string") {
        issues.push({
          path: param.id,
          message: `Parameter '${param.label}' must be a string`,
          severity: "error",
        });
      } else {
        if (param.maxLength !== undefined && value.length > param.maxLength) {
          issues.push({
            path: param.id,
            message: `Parameter '${param.label}' must be <= ${param.maxLength} characters`,
            severity: "error",
          });
        }
        if (param.pattern !== undefined) {
          const regex = new RegExp(param.pattern);
          if (!regex.test(value)) {
            issues.push({
              path: param.id,
              message: `Parameter '${param.label}' does not match pattern '${param.pattern}'`,
              severity: "error",
            });
          }
        }
      }
      break;
    }

    case "enum": {
      const options = param.options ?? [];
      const validValues = options.map((o) => o.value);
      if (!validValues.includes(String(value))) {
        issues.push({
          path: param.id,
          message: `Parameter '${param.label}' must be one of: ${validValues.join(", ")}`,
          severity: "error",
        });
      }
      break;
    }

    case "multienum": {
      if (!Array.isArray(value)) {
        issues.push({
          path: param.id,
          message: `Parameter '${param.label}' must be an array`,
          severity: "error",
        });
      } else {
        const options = param.options ?? [];
        const validValues = options.map((o) => o.value);
        for (const item of value) {
          if (!validValues.includes(String(item))) {
            issues.push({
              path: param.id,
              message: `Parameter '${param.label}' item '${item}' is not valid`,
              severity: "error",
            });
          }
        }
      }
      break;
    }

    case "file": {
      if (typeof value !== "string" || value === "") {
        issues.push({
          path: param.id,
          message: `Parameter '${param.label}' must be a file path`,
          severity: "error",
        });
      }
      break;
    }
  }
}
