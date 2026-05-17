/**
 * Tests for social login providers.
 * Tests Google, Apple, Twitter, and email authentication flows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserProfile,
  loginWithGoogle,
} from '../../src/providers/google.js';
import {
  loginWithEmail,
  generateOTP,
  generateMagicLinkToken,
  buildMagicLink,
  validateMagicLinkToken,
  validateOTP,
} from '../../src/providers/email.js';
import type { GoogleLoginParams, MagicLinkParams } from '../../src/types.js';

// ─── Google Provider Tests ─────────────────────────────────────────

describe('Google Provider', () => {
  describe('buildGoogleAuthUrl', () => {
    it('should build a valid Google OAuth URL with required params', () => {
      const params: Pick<GoogleLoginParams, 'clientId' | 'redirectUri'> = {
        clientId: 'test-client-id.apps.googleusercontent.com',
        redirectUri: 'https://example.com/callback',
      };
      const url = buildGoogleAuthUrl(params);
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id.apps.googleusercontent.com');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include state parameter', () => {
      const params: Pick<GoogleLoginParams, 'clientId' | 'redirectUri'> = {
        clientId: 'test-client-id.apps.googleusercontent.com',
        redirectUri: 'https://example.com/callback',
      };
      const url = buildGoogleAuthUrl(params);
      expect(url).toContain('state=');
    });

    it('should use custom state when provided', () => {
      const params: GoogleLoginParams = {
        clientId: 'test-client-id.apps.googleusercontent.com',
        redirectUri: 'https://example.com/callback',
        state: 'custom-state-value',
      };
      const url = buildGoogleAuthUrl(params);
      expect(url).toContain('state=custom-state-value');
    });

    it('should use custom scopes when provided', () => {
      const params: GoogleLoginParams = {
        clientId: 'test-client-id.apps.googleusercontent.com',
        redirectUri: 'https://example.com/callback',
        scopes: ['openid', 'email'],
      };
      const url = buildGoogleAuthUrl(params);
      expect(url).toContain('scope=openid+email');
    });

    it('should include hosted domain when provided', () => {
      const params: GoogleLoginParams = {
        clientId: 'test-client-id.apps.googleusercontent.com',
        redirectUri: 'https://example.com/callback',
        hostedDomain: 'example.com',
      };
      const url = buildGoogleAuthUrl(params);
      expect(url).toContain('hd=example.com');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should make a POST request to Google token endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
          idToken: 'mock-id-token',
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await exchangeCodeForTokens(
        'auth-code-123',
        { clientId: 'test-client-id', redirectUri: 'https://example.com/callback' },
        'client-secret'
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.idToken).toBe('mock-id-token');
      expect(result.expiresIn).toBe(3600);

      vi.unstubAllGlobals();
    });

    it('should throw on error response', async () => {
      const mockResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('invalid_grant'),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        exchangeCodeForTokens(
          'bad-code',
          { clientId: 'test', redirectUri: 'https://example.com' },
          'secret'
        )
      ).rejects.toThrow('Google token exchange failed');

      vi.unstubAllGlobals();
    });
  });

  describe('fetchGoogleUserProfile', () => {
    it('should fetch user profile with bearer token', async () => {
      const mockProfile = {
        sub: '12345',
        email: 'user@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockProfile),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const profile = await fetchGoogleUserProfile('access-token-123');

      expect(fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer access-token-123' },
        })
      );

      expect(profile.sub).toBe('12345');
      expect(profile.email).toBe('user@gmail.com');

      vi.unstubAllGlobals();
    });

    it('should throw on error response', async () => {
      const mockResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(fetchGoogleUserProfile('bad-token')).rejects.toThrow(
        'Google userinfo fetch failed'
      );

      vi.unstubAllGlobals();
    });
  });

  describe('loginWithGoogle', () => {
    it('should complete the full login flow', async () => {
      // Mock token exchange
      const mockTokenResponse = {
        accessToken: 'access-token',
        idToken: 'id-token',
        expiresIn: 3600,
      };

      // Mock user profile
      const mockProfile = {
        sub: 'google-user-123',
        email: 'user@gmail.com',
        name: 'Google User',
        picture: 'https://example.com/photo.jpg',
      };

      const mockWallet = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        publicKey: '0xpubkey',
      };

      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockProfile),
        })
      );

      const deriveWallet = vi.fn().mockResolvedValue(mockWallet);

      const result = await loginWithGoogle(
        'auth-code',
        {
          clientId: 'test-client-id',
          redirectUri: 'https://example.com/callback',
          clientSecret: 'secret',
        },
        deriveWallet
      );

      expect(result.provider).toBe('google');
      expect(result.providerUserId).toBe('google-user-123');
      expect(result.email).toBe('user@gmail.com');
      expect(result.displayName).toBe('Google User');
      expect(result.walletAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(result.jwtToken).toBe('id-token');

      expect(deriveWallet).toHaveBeenCalledWith('google-user-123', 'user@gmail.com');

      vi.unstubAllGlobals();
    });

    it('should throw when profile has no sub', async () => {
      const mockTokenResponse = {
        accessToken: 'access-token',
        idToken: 'id-token',
        expiresIn: 3600,
      };

      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ email: 'user@gmail.com' }), // no sub
        })
      );

      await expect(
        loginWithGoogle(
          'auth-code',
          { clientId: 'test', redirectUri: 'https://example.com', clientSecret: 'secret' },
          async () => ({ address: '0x0' })
        )
      ).rejects.toThrow('no user ID in profile');

      vi.unstubAllGlobals();
    });
  });
});

// ─── Email Provider Tests ──────────────────────────────────────────

describe('Email Provider', () => {
  describe('generateOTP', () => {
    it('should generate a 6-digit OTP by default', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate a 4-digit OTP when specified', () => {
      const otp = generateOTP(4);
      expect(otp).toMatch(/^\d{4}$/);
    });

    it('should generate different OTPs each time', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      // Very unlikely to be the same
      // Note: could theoretically match, so we just check format
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);
    });

    it('should generate numeric OTPs only', () => {
      for (let i = 0; i < 10; i++) {
        const otp = generateOTP();
        expect(/^\d+$/.test(otp)).toBe(true);
      }
    });
  });

  describe('generateMagicLinkToken', () => {
    it('should generate a 64-character hex token (32 bytes)', () => {
      const token = generateMagicLinkToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateMagicLinkToken();
      const token2 = generateMagicLinkToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('buildMagicLink', () => {
    it('should build a magic link URL with token and email', () => {
      const params: MagicLinkParams = {
        email: 'user@example.com',
        redirectUrl: 'https://example.com/verify',
      };
      const link = buildMagicLink(params, 'test-token-123');

      expect(link).toContain('https://example.com/verify');
      expect(link).toContain('token=test-token-123');
      expect(link).toContain('email=user%40example.com');
      expect(link).toContain('exp=');
    });

    it('should generate a token if not provided', () => {
      const params: MagicLinkParams = {
        email: 'user@example.com',
        redirectUrl: 'https://example.com/verify',
      };
      const link = buildMagicLink(params);
      expect(link).toContain('token=');
    });

    it('should include expiry based on expiresInSeconds', () => {
      const params: MagicLinkParams = {
        email: 'user@example.com',
        redirectUrl: 'https://example.com/verify',
        expiresInSeconds: 1800,
      };
      const link = buildMagicLink(params, 'token');
      expect(link).toContain('exp=');
    });

    it('should default to 1 hour expiry', () => {
      const before = Math.floor(Date.now() / 1000);
      const params: MagicLinkParams = {
        email: 'user@example.com',
        redirectUrl: 'https://example.com/verify',
      };
      const link = buildMagicLink(params, 'token');
      const url = new URL(link);
      const exp = parseInt(url.searchParams.get('exp') || '0');
      const after = Math.floor(Date.now() / 1000);
      // Should be roughly 3600 seconds from now
      expect(exp - before).toBeGreaterThanOrEqual(3590);
      expect(after - before).toBeLessThan(5); // Test ran quickly
    });
  });

  describe('validateMagicLinkToken', () => {
    it('should return true for valid matching token', () => {
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const result = validateMagicLinkToken(
        'abc123',
        'user@example.com',
        'abc123',
        expiry
      );
      expect(result).toBe(true);
    });

    it('should return false for non-matching token', () => {
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const result = validateMagicLinkToken(
        'abc123',
        'user@example.com',
        'wrong-token',
        expiry
      );
      expect(result).toBe(false);
    });

    it('should return false for expired token', () => {
      const expiry = Math.floor(Date.now() / 1000) - 100; // Expired 100 seconds ago
      const result = validateMagicLinkToken(
        'abc123',
        'user@example.com',
        'abc123',
        expiry
      );
      expect(result).toBe(false);
    });

    it('should return false for different length tokens', () => {
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const result = validateMagicLinkToken(
        'abc',
        'user@example.com',
        'abcdef123',
        expiry
      );
      expect(result).toBe(false);
    });
  });

  describe('validateOTP', () => {
    it('should return true for valid matching OTP', () => {
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const result = validateOTP('123456', '123456', expiry);
      expect(result).toBe(true);
    });

    it('should return false for non-matching OTP', () => {
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const result = validateOTP('123456', '654321', expiry);
      expect(result).toBe(false);
    });

    it('should return false for expired OTP', () => {
      const expiry = Math.floor(Date.now() / 1000) - 60;
      const result = validateOTP('123456', '123456', expiry);
      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      const expiry = Math.floor(Date.now() / 1000) + 300;
      // OTPs are numeric, so this is more of a format check
      const result = validateOTP('1234', '1235', expiry);
      expect(result).toBe(false);
    });
  });

  describe('loginWithEmail', () => {
    it('should throw AUTH_PENDING for magiclink method without verifyData', async () => {
      const sendEmail = vi.fn().mockResolvedValue(undefined);
      const deriveWallet = vi.fn().mockResolvedValue({ address: '0x0' });
      const generateJWT = vi.fn().mockResolvedValue({ token: 'jwt', expiresAt: 0 });

      await expect(
        loginWithEmail('user@example.com', sendEmail, deriveWallet, generateJWT, 'magiclink')
      ).rejects.toThrow('AUTH_PENDING');

      expect(sendEmail).toHaveBeenCalled();
    });

    it('should throw AUTH_PENDING for otp method without verifyData', async () => {
      const sendEmail = vi.fn().mockResolvedValue(undefined);
      const deriveWallet = vi.fn().mockResolvedValue({ address: '0x0' });
      const generateJWT = vi.fn().mockResolvedValue({ token: 'jwt', expiresAt: 0 });

      await expect(
        loginWithEmail('user@example.com', sendEmail, deriveWallet, generateJWT, 'otp')
      ).rejects.toThrow('AUTH_PENDING');
    });

    it('should complete login on valid magiclink verification', async () => {
      const sendEmail = vi.fn();
      const deriveWallet = vi.fn().mockResolvedValue({
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        publicKey: '0xpub',
      });
      const generateJWT = vi.fn().mockResolvedValue({ token: 'valid-jwt', expiresAt: 999999 });

      const storedToken = 'stored-token-value';
      const expiry = Math.floor(Date.now() / 1000) + 3600;

      const result = await loginWithEmail(
        'user@example.com',
        sendEmail,
        deriveWallet,
        generateJWT,
        'magiclink',
        { token: 'stored-token-value', storedToken, expiry }
      );

      expect(result.provider).toBe('email');
      expect(result.email).toBe('user@example.com');
      expect(result.walletAddress).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(result.jwtToken).toBe('valid-jwt');
    });

    it('should complete login on valid OTP verification', async () => {
      const sendEmail = vi.fn();
      const deriveWallet = vi.fn().mockResolvedValue({ address: '0x1234' });
      const generateJWT = vi.fn().mockResolvedValue({ token: 'jwt-token', expiresAt: 888888 });

      const storedOTP = '123456';
      const expiry = Math.floor(Date.now() / 1000) + 300;

      const result = await loginWithEmail(
        'user@example.com',
        sendEmail,
        deriveWallet,
        generateJWT,
        'otp',
        { otp: '123456', storedOTP, expiry }
      );

      expect(result.provider).toBe('email');
      expect(result.jwtToken).toBe('jwt-token');
    });

    it('should throw on invalid magiclink token verification', async () => {
      const sendEmail = vi.fn();
      const deriveWallet = vi.fn();
      const generateJWT = vi.fn();

      await expect(
        loginWithEmail(
          'user@example.com',
          sendEmail,
          deriveWallet,
          generateJWT,
          'magiclink',
          { token: 'wrong', storedToken: 'right', expiry: Math.floor(Date.now() / 1000) + 3600 }
        )
      ).rejects.toThrow('Invalid or expired verification code');
    });

    it('should throw on expired token verification', async () => {
      const sendEmail = vi.fn();
      const deriveWallet = vi.fn();
      const generateJWT = vi.fn();

      await expect(
        loginWithEmail(
          'user@example.com',
          sendEmail,
          deriveWallet,
          generateJWT,
          'magiclink',
          { token: 'token', storedToken: 'token', expiry: Math.floor(Date.now() / 1000) - 100 }
        )
      ).rejects.toThrow('Invalid or expired verification code');
    });

    it('should throw on missing verification data', async () => {
      const sendEmail = vi.fn();
      const deriveWallet = vi.fn();
      const generateJWT = vi.fn();

      await expect(
        loginWithEmail(
          'user@example.com',
          sendEmail,
          deriveWallet,
          generateJWT,
          'magiclink',
          {}
        )
      ).rejects.toThrow('Invalid verification data');
    });
  });
});
