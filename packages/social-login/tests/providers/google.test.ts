/**
 * Tests for social-login Google provider.
 * 8 tests covering Google OAuth flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserProfile,
  loginWithGoogle,
} from '../src/providers/google.js';
import type { GoogleLoginParams } from '../src/types.js';

describe('Google OAuth Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildGoogleAuthUrl', () => {
    it('should build a valid Google OAuth authorization URL', () => {
      const url = buildGoogleAuthUrl({
        clientId: 'test-client-id.apps.googleusercontent.com',
        redirectUri: 'https://app.example.com/callback',
      });

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id.apps.googleusercontent.com');
      expect(url).toContain('redirect_uri=' + encodeURIComponent('https://app.example.com/callback'));
      expect(url).toContain('response_type=code');
    });

    it('should include default scopes (openid, email, profile)', () => {
      const url = buildGoogleAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
      });

      expect(url).toContain('scope=openid+email+profile');
    });

    it('should use custom scopes when provided', () => {
      const url = buildGoogleAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        scopes: ['openid', 'email'],
      });

      expect(url).toContain('scope=openid+email');
      expect(url).not.toContain('profile');
    });

    it('should include hosted_domain parameter when specified', () => {
      const url = buildGoogleAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        hostedDomain: 'example.com',
      });

      expect(url).toContain('hd=example.com');
    });

    it('should generate a random state parameter when not provided', () => {
      const url = buildGoogleAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
      });

      expect(url).toContain('state=');
      // State should be a non-empty string after 'state='
      const match = url.match(/state=([^&]+)/);
      expect(match).not.toBeNull();
      expect(match![1].length).toBeGreaterThan(0);
    });

    it('should use custom state when provided', () => {
      const url = buildGoogleAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        state: 'my-custom-state',
      });

      expect(url).toContain('state=my-custom-state');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          accessToken: 'mock-access-token',
          idToken: 'mock-id-token',
          expiresIn: 3600,
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

      vi.unstubAllGlobals();
    });

    it('should throw when token exchange fails', async () => {
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
});
