/**
 * Tests for social-login Twitter/X PKCE provider.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildTwitterAuthUrl,
  fetchTwitterUserProfile,
} from '../../src/providers/twitter.js';
import type { TwitterLoginParams } from '../../src/types.js';

// ─── buildTwitterAuthUrl Tests ─────────────────────────────────

describe('Twitter Provider - buildTwitterAuthUrl', () => {
  const baseParams: Pick<TwitterLoginParams, 'clientId' | 'redirectUri'> = {
    clientId: 'abc123',
    redirectUri: 'https://example.com/callback',
  };

  it('should build a valid Twitter OAuth URL with required params', () => {
    const url = buildTwitterAuthUrl(baseParams, 'challenge123');

    expect(url).toContain('https://twitter.com/i/oauth2/authorize');
    expect(url).toContain('client_id=abc123');
    expect(url).toContain('redirect_uri=' + encodeURIComponent('https://example.com/callback'));
    expect(url).toContain('response_type=code');
    expect(url).toContain('code_challenge=challenge123');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('state=');
  });

  it('should use default scopes when not provided', () => {
    const url = buildTwitterAuthUrl(baseParams, 'challenge');

    expect(url).toContain('scope=users.read+tweet.read');
  });

  it('should use custom scopes when provided', () => {
    const params: TwitterLoginParams = {
      ...baseParams,
      clientSecret: 'secret',
      scopes: ['users.read'],
    };
    const url = buildTwitterAuthUrl(params, 'challenge');

    expect(url).toContain('scope=users.read');
    expect(url).not.toContain('tweet.read');
  });

  it('should use custom state when provided', () => {
    const params: TwitterLoginParams = {
      ...baseParams,
      clientSecret: 'secret',
      state: 'my-twitter-state',
    };
    const url = buildTwitterAuthUrl(params, 'challenge');

    expect(url).toContain('state=my-twitter-state');
  });
});

// ─── fetchTwitterUserProfile Tests ────────────────────────────

describe('Twitter Provider - fetchTwitterUserProfile', () => {
  it('should fetch user profile with bearer token', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          id: '12345678',
          name: 'Twitter User',
          username: 'twitteruser',
          profile_image_url: 'https://pbs.twimg.com/profile/test.jpg',
          verified: true,
        },
      }),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const profile = await fetchTwitterUserProfile('access-token-123');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.twitter.com/2/users/me'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token-123' },
      })
    );

    expect(profile.sub).toBe('12345678');
    expect(profile.name).toBe('Twitter User');
    expect(profile.username).toBe('twitteruser');
    expect(profile.picture).toBe('https://pbs.twimg.com/profile/test.jpg');

    vi.unstubAllGlobals();
  });

  it('should throw on error response', async () => {
    const mockResponse = {
      ok: false,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await expect(fetchTwitterUserProfile('bad-token')).rejects.toThrow(
      'Twitter userinfo fetch failed'
    );

    vi.unstubAllGlobals();
  });
});
