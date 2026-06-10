import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict, isPast } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(dateInput: string | Date | number): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const distance = formatDistanceToNowStrict(date);
  if (isPast(date)) {
    return `${distance} ago`;
  } else {
    return `${distance} left`;
  }
}
