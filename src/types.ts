
export type UserRole = 'user' | 'admin' | 'account_manager';
export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  kycStatus: KYCStatus;
  walletBalance: number;
  btcBalance?: number;
  usdtBalance?: number;
  savings?: number;
  investmentBalance?: number;
  grantBalance?: number;
  currency?: CurrencyConfig;
  bankAccounts?: any[];
  creditCards?: any[];
  bankDetails?: any;
  cardDetails?: any;
  cardActivated?: boolean;
  createdAt: string;
  emailVerified: boolean;
  photoURL?: string;
}

