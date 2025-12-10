// src/lib/types/ipRule.ts
export type IpRuleAction = "ALLOW" | "DENY";

export type IpRuleScope = "specific" | "wildcard"; // specific = single IP, wildcard = range/cidr

export interface IpRule {
  id: number;
  pattern: string;           // backend 'pattern'
  type: IpRuleAction;        // backend 'type' -> "ALLOW" | "DENY"
  description?: string;      // backend 'description'
  active: boolean;           // backend 'active'
  createdAt: string;
  updatedAt: string;
}
