export function formatPct(x: number, decimals: number = 2): string {
  return `${(x * 100).toFixed(decimals)}%`;
}

export function formatSignedPct(x: number, decimals: number = 2): string {
  const sign = x >= 0 ? "+" : "";
  return `${sign}${(x * 100).toFixed(decimals)}%`;
}

export function formatNum(x: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(x);
}

export function formatPValue(x: number | null | undefined): string {
  if (x === null || x === undefined) return "N/A";
  if (x < 0.001) return "< 0.001";
  return x.toFixed(3);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Track last shown year to avoid repetition
let lastShownYear: number | null = null;
let lastResetTime = Date.now();

export function formatChartDate(date: string, dates?: string[], index?: number): string {
  const d = new Date(date);
  const currentYear = d.getFullYear();
  
  // Reset tracking if it's been more than 1 second (new chart render)
  if (Date.now() - lastResetTime > 1000) {
    lastShownYear = null;
    lastResetTime = Date.now();
  }
  
  // If we have the full date array, determine the best format based on range
  if (dates && dates.length > 1) {
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    const daysDiff = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
    
    // > 2 years: show year only when it changes
    if (daysDiff > 730) {
      // Check if this is a year boundary or first tick
      if (lastShownYear !== currentYear || index === 0) {
        lastShownYear = currentYear;
        return currentYear.toString();
      }
      return ""; // Don't show duplicate years
    }
    
    // > 6 months: show 'Jan '23
    if (daysDiff > 180) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }).replace(" ", " '");
    }
  }
  
  // Default: show Mon 'YY format
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  }).replace(" ", " '");
}

