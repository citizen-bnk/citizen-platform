/**
 * Which role may open which Citizen Bank service. The website decides this when it lists services and when it
 * issues a handoff; other repositories use the same table so the answer never differs between them.
 */
export const SERVICE_IDS = ["hub", "banking", "app"] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export const ROLES = [
  "customer", "investor", "shareholder", "board_member", "staff", "back_office", "admin", "super_admin",
] as const;
export type Role = (typeof ROLES)[number];

/** Services that receive a handoff token, and the audience each token is addressed to. */
export const HANDOFF_AUDIENCES = { banking: "banking", app: "app" } as const;
export type HandoffAudience = keyof typeof HANDOFF_AUDIENCES;

export const SERVICE_ACCESS: Record<ServiceId, { name: string; roles: readonly Role[] }> = {
  hub: {
    name: "Citizen Hub",
    roles: ["investor", "shareholder", "board_member", "staff", "back_office", "admin", "super_admin"],
  },
  banking: { name: "Internet Banking", roles: ["customer"] },
  app: { name: "Citizen Bank App", roles: ["customer"] },
};

export const isKnownRole = (r: string): r is Role => (ROLES as readonly string[]).includes(r);

/** Unknown role names are ignored, never granted. */
export function canOpen(service: ServiceId, roles: readonly string[]): boolean {
  const allowed = SERVICE_ACCESS[service].roles;
  return roles.some((r) => (allowed as readonly string[]).includes(r));
}

export function servicesFor(roles: readonly string[]): ServiceId[] {
  return SERVICE_IDS.filter((s) => canOpen(s, roles));
}
