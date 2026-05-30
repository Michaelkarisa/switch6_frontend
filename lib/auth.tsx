'use client';


import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPrefs, hasRole, isAdmin, isBroadcaster, isAdvertiser, roleDashboard, ROLES } from './api';

// ─────────────────────────────────────────────────────────────
// useRoleGuard
// Redirects unauthenticated users to /login.
// Redirects users whose role isn't in `allowed` to their dashboard.
// ─────────────────────────────────────────────────────────────
export function useRoleGuard(allowed: string[]) {
  const router = useRouter();

  useEffect(() => {
    const user = UserPrefs.get();
    if (!user) { router.replace('/login'); return; }

    const userRoles = [
      ...(Array.isArray(user.roles) ? user.roles : []),
      ...(user.role ? [user.role] : []),
    ];

    const permitted = allowed.some(r => userRoles.includes(r));
    if (!permitted) router.replace(roleDashboard());
  }, [router, allowed]);
}

// ─────────────────────────────────────────────────────────────
// usePermissions
// Returns a flat object of boolean capability flags so components
// can hide/show individual elements without re-implementing role logic.
// ─────────────────────────────────────────────────────────────
export function usePermissions() {
  const admin       = isAdmin();
  const broadcaster = isBroadcaster();
  const advertiser  = isAdvertiser();

  return {
    // Match operations
    createMatch:    admin || broadcaster,
    editMatch:      admin || broadcaster,
    deleteMatch:    admin,
    forceDeleteMatch: admin,
    viewAllMatches: admin,
    viewOwnMatches: broadcaster,

    // Lineup operations
    manageLineups: admin || broadcaster,

    // Advertisement operations
    createAd:      admin || broadcaster || advertiser,
    viewAds:       admin || broadcaster || advertiser,
    deleteAd:      admin || advertiser,
    viewAdAnalytics: admin || advertiser || broadcaster,
    managePayments:  admin,

    // User management
    viewUsers:     admin,
    editUsers:     admin,
    suspendUsers:  admin,
    deleteUsers:   admin,
    impersonate:   admin,

    // Plan management
    managePlans:   admin,
    grantSubs:     admin,

    // System
    viewDashboard:   admin || broadcaster,
    viewAdDashboard: admin || advertiser,
    viewAdminPanel:  admin,
    viewAnalytics:   admin,
    clearCache:      admin,
    manageQueue:     admin,
    broadcastNotifs: admin,

    // Role booleans for direct use
    isAdmin:       admin,
    isBroadcaster: broadcaster,
    isAdvertiser:  advertiser,
  };
}

// ─────────────────────────────────────────────────────────────
// RoleGate
// Renders children only if the current user has one of the roles.
// ─────────────────────────────────────────────────────────────
export function RoleGate({
  roles,
  fallback = null,
  children,
}: {
  roles: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (hasRole(...roles)) return <>{children}</>;
  return <>{fallback}</>;
}

// ─────────────────────────────────────────────────────────────
// getRoleLabel  — human-readable role badge
// ─────────────────────────────────────────────────────────────
export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case ROLES.SUPERADMIN:  return 'Super Admin';
    case ROLES.ADMIN:       return 'Admin';
    case ROLES.BROADCASTER: return 'Broadcaster';
    case ROLES.ADVERTISER:  return 'Advertiser';
    default:                return role ?? 'User';
  }
}

// ─────────────────────────────────────────────────────────────
// getRoleColor  — CSS variable name for badge color
// ─────────────────────────────────────────────────────────────
export function getRoleColor(role?: string | null): string {
  switch (role) {
    case ROLES.SUPERADMIN:  return 'var(--red)';
    case ROLES.ADMIN:       return 'var(--gold)';
    case ROLES.BROADCASTER: return 'var(--green)';
    case ROLES.ADVERTISER:  return 'var(--blue)';
    default:                return 'var(--muted)';
  }
}
