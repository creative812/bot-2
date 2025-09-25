/**
 * Utility functions for Discord bot
 */

const ms = require('ms');

/**
 * Parse time string like '1h30m', '45s', '2d' into milliseconds
 * Returns null if invalid
 */
function parseTime(str) {
  if (typeof str !== 'string') return null;
  const result = ms(str.toLowerCase());
  if (typeof result !== 'number') return null;
  return result;
}

/**
 * Format milliseconds into human-readable string like "1d 2h 30m"
 */
function formatTime(msVal) {
  if (typeof msVal !== 'number' || msVal <= 0) return '0s';
  let seconds = Math.floor(msVal / 1000);
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);
  return parts.join(' ') || '0s';
}

/**
 * Sanitize string for safe embed display (escape markdown)
 * Also escapes | and [] that break Discord embeds
 */
function sanitizeString(str = '') {
  return str.replace(/([_*~`>|\[\]])/g, '\\$1');
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str = '') {
  if (!str.length) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Validate hex color string without '#'
 */
function validateHexColor(color) {
  return /^[0-9A-F]{6}$/i.test(color);
}

/**
 * Check if user ID is in special users list
 */
function isSpecialUser(userId, specialList = []) {
  return specialList.includes(userId);
}

module.exports = {
  parseTime,
  formatTime,
  sanitizeString,
  capitalize,
  validateHexColor,
  isSpecialUser
};
