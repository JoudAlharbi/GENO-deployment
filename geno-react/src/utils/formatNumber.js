/**
 * Number formatting utilities - ensures English (0-9) digits across the app
 * Overrides any Arabic/Hindi system number formatting
 */

/**
 * Format a number using English digits (0-9)
 * @param {number|string} value - The number to format
 * @returns {string} Formatted number with English digits
 */
export const formatNumberEn = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return Number(value).toLocaleString("en-US");
};

/**
 * Format an integer using English digits (0-9)
 * @param {number|string} value - The number to format
 * @returns {string} Formatted integer with English digits
 */
export const formatIntegerEn = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return Math.floor(Number(value)).toLocaleString("en-US");
};

/**
 * Format a percentage using English digits (0-9)
 * @param {number|string} value - The percentage value (already as percentage, e.g. 40.5)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage with % sign
 */
export const formatPercentEn = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.0%";
  }
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + "%";
};

/**
 * Format a decimal number using English digits (0-9)
 * @param {number|string} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted decimal with English digits
 */
export const formatDecimalEn = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.0";
  }
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export default formatNumberEn;

