// lib/hooks/useRoles.js
"use client";

import { useAuth } from "@/lib/context/AuthContext";

/**
 * Hook for role-based UI rendering
 */
export function useRoles() {
  const { 
    user, 
    hasRole, 
    hasAnyRole, 
    hasAllRoles,
    isAdmin,
    isClient,
    isReseller,
    isDeveloper,
    isSuperAdmin,
  } = useAuth();

  const roles = user?.roles || [];
  const primaryRole = getPrimaryRole(roles);

  return {
    roles,
    primaryRole,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // Quick role checks
    isAdmin,
    isClient,
    isReseller,
    isDeveloper,
    isSuperAdmin,
    isStaff: hasRole("staff"),
    
    // Role-based portal access
    canAccessAdmin: isAdmin,
    canAccessClient: isClient,
    canAccessReseller: isReseller,
    canAccessDeveloper: isDeveloper,
  };
}

/**
 * Get user's primary role based on priority
 */
function getPrimaryRole(roles) {
  const priority = ["superadmin", "admin", "staff", "reseller", "developer", "client"];
  
  for (const role of priority) {
    if (roles.includes(role)) {
      return role;
    }
  }
  
  return roles[0] || null;
}