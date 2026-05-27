import { useState } from 'react'
import { useCinaCoin } from '@cinacoin/react'
import { SiweMessage } from 'siwe'

/**
 * AuthDemo — Real SIWE (Sign-In With Ethereum) authentication demo.
 *
 * Features:
 * - Real SIWE message generation per EIP-4361 spec
 * - Real wallet signature collection
 * - Server-side verification endpoint integration
 * - Session management (JWT token storage)
 */

// Backend verification endpoint (replace with your actual API)
const AUTH_API = import.meta.env.VITE_AUTH_API_URL || '/api/auth/siwe'

interface Session {
  address: string
  token: string
  expiresAt: Date
}

export function AuthDemo() {
  const { account, signMessage, chainId } = useCinaCoin()
  const [authStatus, setAuthStatus] = useState<
    'idle' | 'signing' | 'verifying' | 'success' | 'error'
  >('idle')
  const [authMessage, setAuthMessage] = useState('')
  const [authResult, setAuthResult] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  const generateSIWEMessage = (): string => {
    const domain = window.location.hostname || 'localhost'
    const nonce = Math.random().toString(36).substring(2, 15)
    const issuedAt = new Date().toISOString()
    const expirationTime = new Date(Date.now() + 3600000).toISOString()

    // Create a proper EIP-4361 SIWE message
    const message = new SiweMessage({
      domain,
      address: account || '',
      statement: 'Sign in to CinaCoin Demo',
      uri: window.location.origin,
      version: '1',
      chainId: chainId || 1,
      nonce,
      issuedAt,
      expirationTime,
      resources: [
        `${window.location.origin}/terms`,
      ],
    })

    const prepared = message.prepareMessage()
    setAuthMessage(prepared)
    return prepared
  }

  const handleSignIn = async () => {
    if (!account) return

    setAuthStatus('signing')
    setAuthMessage('')
    setAuthResult(null)

    try {
      // Step 1: Generate SIWE message
      const message = generateSIWEMessage()

      // Step 2: Sign with wallet
      const signature = await signMessage(message)
      setAuthResult(signature)

      // Step 3: Verify with backend
      setAuthStatus('verifying')
      const resp = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
        }),
      })

      if (!resp.ok) {
        throw new Error(`Verification failed: ${resp.statusText}`)
      }

      const data = await resp.json()
      const sessionData: Session = {
        address: account,
        token: data.token,
        expiresAt: new Date(data.expiresAt),
      }

      // Store session
      localStorage.setItem('cinacoin_session', JSON.stringify(sessionData))
      setSession(sessionData)
      setAuthStatus('success')
    } catch (error) {
      console.error('SIWE authentication failed:', error)
      setAuthStatus('error')
      setAuthResult((error as Error).message)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('cinacoin_session')
    setSession(null)
    setAuthStatus('idle')
    setAuthResult(null)
    setAuthMessage('')
  }

  // Restore session on mount
  useState(() => {
    const saved = localStorage.getItem('cinacoin_session')
    if (saved) {
      try {
        const s = JSON.parse(saved)
        if (new Date(s.expiresAt) > new Date()) {
          setSession(s)
          setAuthStatus('success')
        }
      } catch {
        localStorage.removeItem('cinacoin_session')
      }
    }
  })

  return (
    <div className="auth-demo">
      {/* Session indicator */}
      {session && (
        <div className="demo-card session-card">
          <div className="session-header">
            <span className="session-icon">🔐</span>
            <span className="session-text">已认证会话</span>
            <button className="btn btn-small" onClick={handleSignOut}>
              退出登录
            </button>
          </div>
          <div className="session-info">
            <span>地址: {session.address}</span>
            <span>过期: {new Date(session.expiresAt).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="demo-card">
        <h3>SIWE 认证流程</h3>

        {!account ? (
          <p className="no-account">请先连接钱包</p>
        ) : (
          <>
            {/* Step 1: Generate Message */}
            <div className="auth-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>生成 SIWE 消息 (EIP-4361)</h4>
                <p>包含 domain、address、nonce、expiration 等信息</p>
                {authMessage && (
                  <pre className="message-preview">{authMessage}</pre>
                )}
              </div>
            </div>

            {/* Step 2: Sign */}
            <div className="auth-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>钱包签名</h4>
                <p>用户通过钱包签名消息，证明拥有该地址</p>
                <button
                  className="btn btn-primary"
                  onClick={handleSignIn}
                  disabled={authStatus === 'signing' || authStatus === 'verifying'}
                >
                  {authStatus === 'signing'
                    ? '等待签名...'
                    : authStatus === 'verifying'
                      ? '验证中...'
                      : '签名并登录'}
                </button>
              </div>
            </div>

            {/* Step 3: Verify */}
            <div className="auth-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>后端验证 & 创建 Session</h4>
                <p>
                  服务器验证签名并返回 JWT Token。
                  实际部署时请设置 <code>VITE_AUTH_API_URL</code>。
                </p>

                {authStatus === 'idle' && (
                  <p className="step-waiting">等待签名...</p>
                )}
                {authStatus === 'success' && (
                  <div className="step-success">
                    <span className="success-icon">✅</span>
                    <span>签名验证成功！Session 已创建</span>
                    {authResult && (
                      <pre className="signature-preview">
                        签名: {authResult.slice(0, 66)}...
                      </pre>
                    )}
                  </div>
                )}
                {authStatus === 'error' && (
                  <div className="step-error">
                    <span className="error-icon">❌</span>
                    <span>认证失败: {authResult}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="demo-card">
        <h3>SIWE 消息格式 (EIP-4361)</h3>
        <pre className="format-example">
{`domain wants you to sign in with your Ethereum account:
0x1a2b...3c4d

Sign in to My dApp

URI: https://mydapp.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2026-05-16T10:00:00.000Z
Expiration Time: 2026-05-16T11:00:00.000Z
Resources:
- https://mydapp.com/terms`}
        </pre>
      </div>

      <div className="demo-card">
        <h3>后端验证 API 示例</h3>
        <pre className="api-example">
{`// POST /api/auth/siwe
// Request:
{
  "message": "example.com wants you to sign in...",
  "signature": "0x1234...abcd"
}

// Response:
{
  "token": "eyJhbGciOi...",
  "expiresAt": "2026-05-16T11:00:00.000Z"
}

// 使用 siwe 包在 Node.js 端验证:
import { SiweMessage } from 'siwe';
const siweMsg = new SiweMessage(message);
await siweMsg.verify({ signature });`}
        </pre>
      </div>
    </div>
  )
}
