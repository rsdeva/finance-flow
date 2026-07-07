/**
 * Format a number as Indian Rupees (₹) using Indian numbering system.
 * Examples: ₹8,50,000  ₹1,25,43,560  ₹26,825
 */
export function formatINR(amount: number, showPaise = false): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  };
  return new Intl.NumberFormat('en-IN', options).format(amount);
}

/**
 * Format for chart axis labels (e.g., ₹8.5L, ₹1.2Cr)
 */
export function formatINRShort(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toFixed(0)}`;
}
