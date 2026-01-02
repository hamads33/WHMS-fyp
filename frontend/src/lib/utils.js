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
    cancelled: '○',
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