import React, { useEffect, useState } from 'react'
import { AppState, Alert, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { CinaCoinProvider } from '@cinacoin/react-native'
import { ConnectScreen } from './screens/ConnectScreen'
import { SwapScreen } from './screens/SwapScreen'
import { MultiChainScreen } from './screens/MultiChainScreen'
import { defaultWallets } from './utils/walletConfig'
import { registerPushNotifications } from './utils/pushNotifications'

const Tab = createBottomTabNavigator()

/**
 * Real CinaCoin React Native app configuration.
 *
 * - Uses real WalletConnect v2 relay
 * - Registers for push notifications
 * - Deep link handling for wallet redirects
 * - Replace projectId with your WalletConnect Cloud project ID
 *   → https://cloud.walletconnect.com
 */

const config = {
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // ← Replace with real projectId
  relayUrl: 'wss://relay.walletconnect.com',
  metadata: {
    name: 'CinaCoin Mobile Demo',
    description: 'CinaCoin React Native Example — Real blockchain integration',
    url: 'https://cinacoin.com',
    icons: ['https://cinacoin.com/logo.svg'],
  },
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrl: 'https://eth.llamarpc.com',
    },
    {
      id: 137,
      name: 'Polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrl: 'https://polygon-rpc.com',
    },
    {
      id: 42161,
      name: 'Arbitrum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
    },
  ],
  walletConnectOptions: {
    // Real WalletConnect v2 pairing
    projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
    relayUrl: 'wss://relay.walletconnect.com',
  },
  theme: {
    mode: 'dark',
    accentColor: '#3B82F6',
  },
  debug: __DEV__,
}

export default function App() {
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [pushReady, setPushReady] = useState(false)

  // Register push notifications on mount
  useEffect(() => {
    async function setupPush() {
      try {
        const token = await registerPushNotifications()
        setFcmToken(token)
        setPushReady(true)
        console.log('Push notification registered:', token)
      } catch (err) {
        console.warn('Push notification registration failed:', err)
      }
    }
    setupPush()
  }, [])

  // Handle app state changes (resume from wallet deep link)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // App resumed — wallet may have redirected back
        console.log('App resumed, checking for pending wallet connections...')
      }
    })
    return () => subscription.remove()
  }, [])

  return (
    <CinaCoinProvider config={config}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            tabBarStyle: { backgroundColor: '#1E293B' },
            tabBarActiveTintColor: '#3B82F6',
            tabBarInactiveTintColor: '#64748B',
          }}
        >
          <Tab.Screen
            name="Connect"
            component={ConnectScreen}
            options={{
              tabBarLabel: '连接',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔗</Text>,
            }}
          />
          <Tab.Screen
            name="Swap"
            component={SwapScreen}
            options={{
              tabBarLabel: 'Swap',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔄</Text>,
            }}
          />
          <Tab.Screen
            name="MultiChain"
            component={MultiChainScreen}
            options={{
              tabBarLabel: '多链',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⛓️</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </CinaCoinProvider>
  )
}
