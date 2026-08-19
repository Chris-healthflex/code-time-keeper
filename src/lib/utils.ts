import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCandidateBranch(email: string, id: string) {
  const sanitizedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  return `candidate/${sanitizedEmail}-${id.substring(0, 4)}`;
}
