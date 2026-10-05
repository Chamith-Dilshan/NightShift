"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

function RadioGroup({
  className,
  value,
  onValueChange,
  name,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div
        role="radiogroup"
        data-slot="radio-group"
        className={cn("grid gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

function RadioGroupItem({
  className,
  value,
  id,
  disabled,
  ...props
}: React.ComponentProps<"input"> & {
  value: string;
}) {
  const context = React.useContext(RadioGroupContext);
  const checked = context.value === value;

  return (
    <input
      type="radio"
      id={id}
      name={context.name}
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={() => context.onValueChange?.(value)}
      className={cn("peer sr-only", className)}
      {...props}
    />
  );
}

export { RadioGroup, RadioGroupItem };
