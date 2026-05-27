/**
 * Passkey authentication types for @cinacoin/passkey-auth
 */

export interface PublicKeyCredentialCreationOptionsJSON {
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  timeout?: number;
  attestation?: string;
  authenticatorSelection?: {
    authenticatorAttachment?: string;
    requireResidentKey?: boolean;
    residentKey?: string;
    userVerification?: string;
  };
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    type: string;
    id: string;
    transports?: string[];
  }>;
  userVerification?: string;
}

export interface RegistrationResult {
  success: boolean;
  credentialId: string;
  publicKey: string;
  attestationObject?: string;
  clientDataJSON?: string;
  error?: string;
}

export interface AuthenticationResult {
  success: boolean;
  credentialId: string;
  signature: string;
  authenticatorData: string;
  clientDataJSON: string;
  userHandle?: string;
  error?: string;
}

export interface StoredPasskey {
  id: string;
  publicKey: string;
  name: string;
  createdAt: number;
  lastUsed?: number;
  transports?: string[];
}

export interface PasskeyConfig {
  rpName: string;
  rpId: string;
  challengeLength?: number;
  timeout?: number;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface PasskeyStorage {
  save(credential: StoredPasskey): Promise<void>;
  load(id: string): Promise<StoredPasskey | null>;
  list(): Promise<StoredPasskey[]>;
  remove(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface CryptoKeypair {
  publicKey: string;
  privateKey?: string;
}
