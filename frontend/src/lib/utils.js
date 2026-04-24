// ============================================================================
// FILE: lib/utils.js
// PURPOSE: Utility functions for formatting and UI helpers
// ============================================================================

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format bytes to human readable
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Format date to relative time
export function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString();
}

// Format duration in seconds
export function formatDuration(seconds) {
  if (!seconds) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// Get status color
export function getStatusColor(status) {
  const colors = {
    success: 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300',
    failed: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300',
    running: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
    queued: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300',
    cancelled: 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-300',
  };
  
  return colors[status] || colors.queued;
}

// Get status icon
export function getStatusIcon(status) {
  const icons = {
    success: '✓',
    failed: '✕',
    running: '⟳',
    queued: '⋯',
    cancelled: '◯',
  };
  
  return icons[status] || icons.queued;
}

// Calculate percentage
export function calculatePercentage(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Truncate text
export function truncate(text, length = 50) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Download file
export function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// MARKETPLACE UTILITIES
// ============================================================================

/**
 * Debounce function to delay function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format a number with commas and abbreviations
 * @param {number} num - Number to format
 * @returns {string} Formatted number (e.g., "1.2K", "1.5M")
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';

  const numericValue = Number(num);
  if (isNaN(numericValue)) return '0';

  if (numericValue >= 1000000) {
    return (numericValue / 1000000).toFixed(1) + 'M';
  }
  if (numericValue >= 1000) {
    return (numericValue / 1000).toFixed(1) + 'K';
  }
  return numericValue.toString();
}

/**
 * Format price with currency symbol
 * @param {number} price - Price amount
 * @param {string} currency - Currency code (default: "USD")
 * @returns {string} Formatted price (e.g., "$9.99", "Free")
 */
export function formatPrice(price, currency = 'USD') {
  if (price === null || price === undefined || price === 0) {
    return 'Free';
  }

  const numericPrice = Number(price);
  if (isNaN(numericPrice)) return 'Free';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(numericPrice);
}

/**
 * Format a date string
 * @param {string|Date} date - Date to format
 * @param {string} format - Format style ("short", "long", "relative")
 * @returns {string} Formatted date
 */
export function formatDate(date, format = 'short') {
  if (!date) return 'Unknown';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return 'Unknown';

  if (format === 'relative') {
    return getRelativeTime(dateObj);
  }

  const options = {
    short: { month: 'short', day: 'numeric', year: '2-digit' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
  };

  return dateObj.toLocaleDateString('en-US', options[format] || options.short);
}

/**
 * Get relative time string (e.g., "2 days ago")
 * @param {Date} date - Date to calculate relative time from
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}