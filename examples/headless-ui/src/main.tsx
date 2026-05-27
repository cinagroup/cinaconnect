import React from 'react';
import ReactDOM from 'react-dom/client';
import HeadlessConnectButton from './components/HeadlessConnectButton';
import HeadlessAccountDisplay from './components/HeadlessAccountDisplay';
import HeadlessNetworkSelector from './components/HeadlessNetworkSelector';

function App() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 40, fontFamily: 'system-ui' }}>
      <h1>CinaCoin Headless UI Examples</h1>
      <p>Build your own UI using the headless SDK.</p>

      <section>
        <h2>Connect Button</h2>
        <HeadlessConnectButton />
      </section>

      <section>
        <h2>Account Display</h2>
        <HeadlessAccountDisplay />
      </section>

      <section>
        <h2>Network Selector</h2>
        <HeadlessNetworkSelector />
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
