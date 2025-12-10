export interface UserAuth {
  id: string;
  email: string;
  roles: string[];
  portals: string[];
  permissions: string[];
  mfaVerified?: boolean;
  impersonatorId?: string | null;
  isImpersonation?: boolean;

  adminProfile?: any;
  clientProfile?: any;
  resellerProfile?: any;
  developerProfile?: any;
}
