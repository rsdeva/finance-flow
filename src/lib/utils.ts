import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
    if (num >= 100000) { // For Lakhs
        const lakhs = num / 100000;
        return `${lakhs.toFixed(lakhs % 1 === 0 ? 0 : 1)}L`;
    }
    if (num >= 1000) { // For thousands
        const thousands = num / 1000;
        return `${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)}K`;
    }
    return String(num);
}
