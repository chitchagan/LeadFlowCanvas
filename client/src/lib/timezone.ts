/**
 * IST (Indian Standard Time) Timezone Utilities
 * IST is UTC+5:30
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Converts IST date/time input to UTC ISO string for storage
 * @param dateStr - Date string in YYYY-MM-DD format (treated as IST)
 * @param timeStr - Time string in HH:MM format (treated as IST)
 * @returns Date object representing UTC time
 */
export function istToUTC(dateStr: string, timeStr: string): Date {
  // Parse the date and time as if it's in IST
  // Create date string: "2025-10-12T10:00:00"
  const istDateTimeStr = `${dateStr}T${timeStr}:00`;
  
  // Parse this as a UTC time first (to avoid browser timezone interference)
  const tempDate = new Date(istDateTimeStr + 'Z');
  
  // Now subtract IST offset to get actual UTC
  // IST is UTC+5:30, so to convert IST to UTC, we subtract 5:30
  const utcTime = tempDate.getTime() - IST_OFFSET_MS;
  
  return new Date(utcTime);
}

/**
 * Converts UTC date to IST formatted string for display
 * @param date - Date object or ISO string (assumed to be UTC)
 * @param format - 'full' for date and time, 'time' for time only
 * @returns Formatted string in IST
 */
export function utcToIST(date: Date | string, format: 'full' | 'time' = 'full'): string {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  
  // Use the built-in toLocaleString with Asia/Kolkata timezone
  // This properly handles IST conversion
  if (format === 'time') {
    return utcDate.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // Full format with date and time
  return utcDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get current IST date in YYYY-MM-DD format
 */
export function getCurrentISTDate(): string {
  // Get current time and convert to IST string
  const now = new Date();
  const istString = now.toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // Format is already YYYY-MM-DD from en-CA locale
  return istString;
}

/**
 * Get current IST time in HH:MM format
 */
export function getCurrentISTTime(): string {
  const now = new Date();
  const istTimeString = now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return istTimeString;
}
