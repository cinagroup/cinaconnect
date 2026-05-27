/**
 * GitHub OAuth2 provider tests.
 */

import { describe, it, expect } from 'vitest';
import {
  buildGitHubAuthUrl,
  fetchGitHubUserProfile,
} from '../../src/providers/github.js';

describe('GitHub OAuth2 Provider', () => {
  describe('buildGitHubAuthUrl', () => {
    it('builds a valid authorization URL', () => {
      const url = buildGitHubAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
      });

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=');
    });

    it('includes custom scopes when provided', () => {
      const url = buildGitHubAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        scopes: ['repo', 'user:email'],
      });

      expect(url).toContain('scope=repo+user%3Aemail');
    });

    it('includes custom state when provided', () => {
      const url = buildGitHubAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        state: 'my-csrf-state',
      });

      expect(url).toContain('state=my-csrf-state');
    });
  });

  describe('fetchGitHubUserProfile', () => {
    it('throws on invalid token', async () => {
      await expect(
        fetchGitHubUserProfile('invalid-token-123')
      ).rejects.toThrow();
    });
  });
});
