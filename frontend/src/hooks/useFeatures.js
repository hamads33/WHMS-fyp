// lib/hooks/useFeatures.js
"use client";

import { useState } from "react";
import { AuthAPI } from "@/lib/api/auth";
import { AdminAPI } from "@/lib/api/admin";
import { useAuth } from "@/lib/context/AuthContext";

/**
 * Hook for MFA (Multi-Factor Authentication)
 */
export function useMFA() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setupMFA = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.setupMFA();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const verifyMFA = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.verifyMFA(code);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const disableMFA = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.disableMFA(code);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.generateBackupCodes();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    setupMFA,
    verifyMFA,
    disableMFA,
    generateBackupCodes,
    loading,
    error,
  };
}

/**
 * Hook for Session Management
 */
export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.listSessions();
      setSessions(data.sessions || []);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const revokeSession = async (sessionId) => {
    setLoading(true);
    setError(null);
    try {
      await AuthAPI.revokeSession(sessionId);
      await loadSessions(); // Reload sessions
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const revokeOtherSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      await AuthAPI.revokeOtherSessions();
      await loadSessions(); // Reload sessions
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    sessions,
    loadSessions,
    revokeSession,
    revokeOtherSessions,
    loading,
    error,
  };
}

/**
 * Hook for API Keys
 */
export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadApiKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.listApiKeys();
      setApiKeys(data.apiKeys || []);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const createApiKey = async (name, scopes, expiresInDays) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.createApiKey(name, scopes, expiresInDays);
      await loadApiKeys(); // Reload keys
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const revokeApiKey = async (keyId) => {
    setLoading(true);
    setError(null);
    try {
      await AuthAPI.revokeApiKey(keyId);
      await loadApiKeys(); // Reload keys
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    apiKeys,
    loadApiKeys,
    createApiKey,
    revokeApiKey,
    loading,
    error,
  };
}

/**
 * Hook for Trusted Devices
 */
export function useTrustedDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.listTrustedDevices();
      setDevices(data.devices || []);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const createDevice = async (name) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthAPI.createTrustedDevice(name);
      await loadDevices(); // Reload devices
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const revokeDevice = async (deviceId) => {
    setLoading(true);
    setError(null);
    try {
      await AuthAPI.revokeTrustedDevice(deviceId);
      await loadDevices(); // Reload devices
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const revokeAllDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      await AuthAPI.revokeAllTrustedDevices();
      await loadDevices(); // Reload devices
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    devices,
    loadDevices,
    createDevice,
    revokeDevice,
    revokeAllDevices,
    loading,
    error,
  };
}

/**
 * Hook for User Management (Admin)
 */
export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const loadUsers = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminAPI.listUsers(params);
      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const updateUserRoles = async (userId, roles) => {
    setLoading(true);
    setError(null);
    try {
      await AdminAPI.updateUserRoles(userId, roles);
      await loadUsers(); // Reload users
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const deactivateUser = async (userId, reason) => {
    setLoading(true);
    setError(null);
    try {
      await AdminAPI.deactivateUser(userId, reason);
      await loadUsers(); // Reload users
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const impersonateUser = async (userId, reason) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminAPI.impersonateUser(userId, reason);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    users,
    pagination,
    loadUsers,
    updateUserRoles,
    deactivateUser,
    impersonateUser,
    loading,
    error,
  };
}

/**
 * Hook for IP Rules (Admin)
 */
export function useIpRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminAPI.listIpRules();
      setRules(data.rules || []);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const createRule = async (ruleData) => {
    setLoading(true);
    setError(null);
    try {
      await AdminAPI.createIpRule(ruleData);
      await loadRules(); // Reload rules
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const updateRule = async (ruleId, ruleData) => {
    setLoading(true);
    setError(null);
    try {
      await AdminAPI.updateIpRule(ruleId, ruleData);
      await loadRules(); // Reload rules
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const deleteRule = async (ruleId) => {
    setLoading(true);
    setError(null);
    try {
      await AdminAPI.deleteIpRule(ruleId);
      await loadRules(); // Reload rules
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    rules,
    loadRules,
    createRule,
    updateRule,
    deleteRule,
    loading,
    error,
  };
}