import type { UserRole } from '../enums/user-role';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
