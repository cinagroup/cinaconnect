/**
 * Tests for social-login Google provider.
 */

import { describe, it, expect } from 'vitest';
import { buildGoogleAuthUrl } from '../src/providers/google.js';

describe('buildGoogleAuthUrl', () => {
  it('should build a Google OAuth URL', () => {
    const url = buildGoogleAuthUrl({
      clientId: 'test-client-id.apps.googleusercontent.com',
      redirectUri: 'https://app.example.com/callback',
      scopes: ['openid', 'email', 'profile'],
      state: 'random-state',
    });

    expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=test-client-id.apps.googleusercontent.com');
    expect(url).toContain('redirect_uri=' + encodeURIComponent('https://app.example.com/callback'));
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=');
    expect(url).toContain('state=random-state');
  });

  it('should include hosted_domain parameter', () => {
    const url = buildGoogleAuthUrl({
      clientId: 'test-client-id.apps.googleusercontent.com',
      redirectUri: 'https://app.example.com/callback',
      hostedDomain: 'example.com',
    });

    expect(url).toContain('hd=example.com');
  });
});
