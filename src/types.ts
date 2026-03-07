
export type UserRole = 'user' | 'admin' | 'account_manager';
export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  kycStatus: KYCStatus;
  createdAt: string;
  emailVerified: boolean;
  photoURL?: string;
}
