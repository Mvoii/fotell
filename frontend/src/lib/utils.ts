import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely, resolving conflicts via tailwind-merge.
 * Usage: cn("px-4 py-2", isActive && "bg-accent-blue", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
