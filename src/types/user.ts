export enum UserRole {
  CUSTOMER = "CUSTOMER",
  STAFF = "STAFF",
  KITCHEN = "KITCHEN",
  ADMIN = "ADMIN",
}

export interface UserSummary {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  isTwoFactorEnabled?: boolean;
  createdAt: Date | string;
}

export interface CustomerProfile {
  id: string;
  phone?: string | null;
  name: string;
  email?: string | null;
  role: UserRole;
  isTwoFactorEnabled?: boolean;
  hasPassword?: boolean;
  connectedProviders?: string[];
}

export enum OAuthProvider {
  GOOGLE = "google",
}

export interface ConnectedAccountsResponse {
  google: {
    connected: boolean;
    providerAccountId?: string | null;
  };
  hasPassword: boolean;
}

export interface AddressResponse {
  id: string;
  userId: string;
  label?: string | null;
  recipientName?: string | null;
  phone?: string | null;
  street: string;
  house?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  label?: string;
  recipientName?: string;
  phone?: string;
  street: string;
  house?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  label?: string;
  recipientName?: string;
  phone?: string;
  street?: string;
  house?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface SavedAddress {
  id: string;
  label?: string;
  recipientName?: string;
  phone?: string;
  street: string;
  house?: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string;
  isDefault: boolean;
}

export interface AuthState {
  user: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface TwoFactorSetupResponse {
  qrCodeDataUrl: string;
  manualKey: string;
  issuer: string;
  accountLabel: string;
}

export interface TwoFactorVerifySetupResponse {
  success: boolean;
  recoveryCodes: string[];
  message: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  remainingRecoveryCodes: number;
}

export interface LoginResponse {
  success: boolean;
  user?: CustomerProfile;
  requiresTwoFactor?: boolean;
  challenge?: string;
}
