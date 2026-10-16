/**
 * Utility for formatting date and time for uploaded files, images, progress proofs, and documents.
 * Produces clean and readable timestamps like "14 Oct 2026, 10:45 AM".
 */

export function getCurrentUploadTimestamp(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${dateStr}, ${timeStr}`;
}

export function formatUploadTimestamp(input?: Date | string | number | null): string {
  if (!input) return getCurrentUploadTimestamp();

  // If already Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return getCurrentUploadTimestamp();
    const dateStr = input.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = input.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  }

  // If number (timestamp)
  if (typeof input === 'number') {
    const d = new Date(input);
    if (isNaN(d.getTime())) return getCurrentUploadTimestamp();
    return formatUploadTimestamp(d);
  }

  const str = String(input).trim();
  if (!str) return getCurrentUploadTimestamp();

  // Check if string already contains a time component (e.g. "14 Oct 2026, 10:45 AM" or "10:45:00")
  const hasTimeComponent = /(:[0-9]{2}|\b(am|pm)\b)/i.test(str);
  if (hasTimeComponent && str.length > 10) {
    // If it looks like a full human string like "14 Oct 2026, 10:45 AM", return it cleanly
    if (/[a-zA-Z]{3}.*\d{1,2}:\d{2}/.test(str)) {
      return str;
    }
  }

  // Try parsing ISO or date string
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const dateStr = parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    // If the input string didn't have time and was just YYYY-MM-DD, give current time or parsed time
    const timeStr = hasTimeComponent
      ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return `${dateStr}, ${timeStr}`;
  }

  // If it's a date string like "14 Oct 2026" without time, append current time
  const currentTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${str}, ${currentTime}`;
}
