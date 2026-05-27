# @cinacoin/payment-flow

Complete payment UI components — Buy, Send, Receive flow.

## Installation

```bash
npm install @cinacoin/payment-flow
```

## Usage

```tsx
import { PaymentFlowProvider, BuyButton, SendModal, ReceiveQR } from '@cinacoin/payment-flow';

function App() {
  return (
    <PaymentFlowProvider projectId="YOUR_PROJECT_ID">
      <BuyButton token="ETH" />
      <SendModal />
      <ReceiveQR />
    </PaymentFlowProvider>
  );
}
```

## License

MIT
