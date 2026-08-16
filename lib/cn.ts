import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...valores: ClassValue[]) {
  return twMerge(clsx(valores));
}
