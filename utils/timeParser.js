/**
 * utils/timeParser.js
 * A utility class for parsing and formatting time durations used in commands or mute durations.
 */

class TimeParser {
  /**
   * Parse a time duration string like "1h30m", "45s", "2d" into milliseconds
   * Supports compound formats like 1h30m15s
   * @param {string} input - The input time string
   * @returns {number|null} - Milliseconds or null if invalid
   */
  static parseDuration(input) {
    if (typeof input !== 'string' || input.length === 0) return null;

    const pattern = /(\d+)([smhdw])/g; // s=seconds, m=minutes, h=hours, d=days, w=weeks
    let totalMs = 0;
    let match;

    while ((match = pattern.exec(input.toLowerCase())) !== null) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      if (isNaN(value)) {
        return null;
      }

      switch (unit) {
        case 's': totalMs += value * 1000; break;
        case 'm': totalMs += value * 60 * 1000; break;
        case 'h': totalMs += value * 60 * 60 * 1000; break;
        case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
        case 'w': totalMs += value * 7 * 24 * 60 * 60 * 1000; break;
        default:
          return null; // Unknown unit
      }
    }

    return totalMs > 0 ? totalMs : null;
  }

  /**
   * Format a duration in milliseconds as a human readable string, e.g., "1d 2h 30m"
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration string
   */
  static formatDuration(ms) {
    if (typeof ms !== 'number' || ms <= 0) return '0s';

    let remaining = ms;

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    remaining %= 24 * 60 * 60 * 1000;

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    remaining %= 60 * 60 * 1000;

    const minutes = Math.floor(remaining / (60 * 1000));
    remaining %= 60 * 1000;

    const seconds = Math.floor(remaining / 1000);

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * Converts an ISO timestamp string into Date object
   * @param {string} isoString
   * @returns {Date|null}
   */
  static fromISOString(isoString) {
    try {
      return new Date(isoString);
    } catch {
      return null;
    }
  }

  /**
   * Generates Discord relative timestamp string for formatting times in embeds and messages
   * @param {Date|string|number} timestamp
   * @param {string} format Discord timestamp format like 'R' relative, 'F' full date etc. Default 'R'
   * @returns {string}
   */
  static toDiscordTimestamp(timestamp, format = 'R') {
    if (!timestamp) return '';
    let date = timestamp;
    if (!(timestamp instanceof Date)) {
      date = new Date(timestamp);
    }
    const unix = Math.floor(date.getTime() / 1000);
    return `<t:${unix}:${format}>`;
  }
}

module.exports = TimeParser;
