// ============================================================================
// FILE: lib/hooks/useBackups.js
// PURPOSE: Custom React hook for backup operations
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { backupApi } from '@/lib/api/backupClient';

export function useBackups({ autoRefresh = false, refreshInterval = 10000 } = {}) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBackups = useCallback(async () => {
    try {
      setError(null);
      const res = await backupApi('');
      setBackups(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBackup = useCallback(async (payload) => {
    const res = await backupApi('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await loadBackups();
    return res.data;
  }, [loadBackups]);

  const deleteBackup = useCallback(async (id) => {
    await backupApi(`/${id}`, { method: 'DELETE' });
    await loadBackups();
  }, [loadBackups]);

  const cancelBackup = useCallback(async (id) => {
    await backupApi(`/${id}/cancel`, { method: 'POST' });
    await loadBackups();
  }, [loadBackups]);

  const verifyBackup = useCallback(async (id) => {
    const res = await backupApi(`/${id}/verify`, { method: 'POST' });
    return res.data;
  }, []);

  const cloneBackup = useCallback(async (id) => {
    const res = await backupApi(`/${id}/clone`, { method: 'POST' });
    await loadBackups();
    return res.data;
  }, [loadBackups]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(loadBackups, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadBackups]);

  return {
    backups,
    loading,
    error,
    refresh: loadBackups,
    createBackup,
    deleteBackup,
    cancelBackup,
    verifyBackup,
    cloneBackup,
  };
}

export function useBackupStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const res = await backupApi('/stats');
      setStats(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refresh: loadStats };
}

export function useBackupLogs(backupId) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!backupId) return;
    
    try {
      const [logsRes, statusRes] = await Promise.all([
        backupApi(`/${backupId}/logs`),
        backupApi(`/${backupId}/logs/status`),
      ]);
      
      setLogs(logsRes.data || []);
      setStatus(statusRes.data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [backupId]);

  useEffect(() => {
    loadLogs();
    
    // Auto-refresh for running backups
    const interval = setInterval(() => {
      if (status?.status === 'running') {
        loadLogs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [loadLogs, status?.status]);

  return { logs, status, loading, refresh: loadLogs };
}