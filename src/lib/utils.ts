import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely stringifies an object to JSON, handling circular references and Error objects.
 */
export function safeStringify(obj: any, indent?: number): string {
  const cache = new WeakSet();
  
  // Pre-process Error objects because JSON.stringify(new Error()) returns "{}"
  const processValue = (val: any): any => {
    if (val instanceof Error) {
      return {
        name: val.name,
        message: val.message,
        stack: val.stack,
        ...val
      };
    }
    return val;
  };

  try {
    return JSON.stringify(
      processValue(obj),
      (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (cache.has(value)) {
            return "[Circular]";
          }
          cache.add(value);
        }
        return processValue(value);
      },
      indent
    );
  } catch (err) {
    // If JSON.stringify still fails, return a basic string representation
    try {
      if (obj instanceof Error) {
        return `[Error: ${obj.message}]`;
      }
      return String(obj);
    } catch (e) {
      return "[Unstringifiable Object]";
    }
  }
}
