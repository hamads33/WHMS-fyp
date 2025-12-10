// src/lib/types.ts
export type IpRuleType = "specific" | "wildcard";

export interface IpRule {
  id: string; // backend may use numeric id; we use string to be safer for URL usage
  ipOrRange: string; // user friendly field (frontend)
  type: IpRuleType;
  reason: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
