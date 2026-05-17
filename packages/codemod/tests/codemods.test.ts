/**
 * Codemod test suite — 20+ tests covering both transforms.
 */

import { transformAppKitToOnChainUX } from "../src/codemods/appkit-to-onchainux.js";
import { transformWcV1ToV2 } from "../src/codemods/wc-v1-to-v2.js";
import { TRANSFORMS, listTransforms } from "../src/index.js";

// ── appkit-to-onchainux tests ──────────────────────────────────────────────

describe("appkit-to-onchainux codemod", () => {
  describe("package renames", () => {
    test("renames @reown/appkit to @onchainux/core", () => {
      const result = transformAppKitToOnChainUX(`import { createAppKit } from "@reown/appkit";`);
      expect(result.transformed).toBe(true);
      expect(result.output).toContain("@onchainux/core-sdk");
      expect(result.output).not.toContain("@reown/appkit");
    });

    test("renames @reown/appkit-react to @onchainux/react", () => {
      const result = transformAppKitToOnChainUX(`import { useAppKit } from "@reown/appkit-react";`);
      expect(result.output).toContain("@onchainux/react");
    });

    test("renames @reown/appkit-wagmi to @onchainux/wagmi", () => {
      const result = transformAppKitToOnChainUX(`import { wagmiAdapter } from "@reown/appkit-wagmi";`);
      expect(result.output).toContain("@onchainux/wagmi");
    });

    test("renames @web3modal/ethereum to @onchainux/ethereum", () => {
      const result = transformAppKitToOnChainUX(`import { EthereumClient } from "@web3modal/ethereum";`);
      expect(result.output).toContain("@onchainux/ethereum");
    });

    test("renames @web3modal/wagmi to @onchainux/wagmi", () => {
      const result = transformAppKitToOnChainUX(`import { WagmiAdapter } from "@web3modal/wagmi";`);
      expect(result.output).toContain("@onchainux/wagmi");
    });

    test("renames @web3modal/react to @onchainux/react", () => {
      const result = transformAppKitToOnChainUX(`import { useWeb3Modal } from "@web3modal/react";`);
      expect(result.output).toContain("@onchainux/react");
    });

    test("renames @web3modal/ui to @onchainux/ui", () => {
      const result = transformAppKitToOnChainUX(`import { W3mButton } from "@web3modal/ui";`);
      expect(result.output).toContain("@onchainux/ui");
    });

    test("renames @web3modal/core to @onchainux/core", () => {
      const result = transformAppKitToOnChainUX(`import { W3mFrameHelpers } from "@web3modal/core";`);
      expect(result.output).toContain("@onchainux/core-sdk");
    });

    test("renames @web3modal/html to @onchainux/html", () => {
      const result = transformAppKitToOnChainUX(`import { Web3Modal } from "@web3modal/html";`);
      expect(result.output).toContain("@onchainux/html");
    });
  });

  describe("class/function renames", () => {
    test("renames Web3Modal to OnChainUX", () => {
      const result = transformAppKitToOnChainUX(`const modal = new Web3Modal({ projectId: "abc" });`);
      expect(result.output).toContain("new OnChainUX(");
    });

    test("renames createWeb3Modal to createOnChainUX", () => {
      const result = transformAppKitToOnChainUX(`const modal = createWeb3Modal({ projectId: "abc" });`);
      expect(result.output).toContain("createOnChainUX(");
    });

    test("renames createAppKit to createOnChainUX", () => {
      const result = transformAppKitToOnChainUX(`const modal = createAppKit({ projectId: "abc" });`);
      expect(result.output).toContain("createOnChainUX(");
    });

    test("renames AppKit to OnChainUX", () => {
      const result = transformAppKitToOnChainUX(`const modal = new AppKit({ projectId: "abc" });`);
      expect(result.output).toContain("new OnChainUX(");
    });
  });

  describe("hook renames", () => {
    test("renames useWeb3Modal to useOnChainUX", () => {
      const result = transformAppKitToOnChainUX(`const { open } = useWeb3Modal();`);
      expect(result.output).toContain("useOnChainUX()");
    });

    test("renames useWeb3ModalTheme to useOnChainUXTheme", () => {
      const result = transformAppKitToOnChainUX(`const { theme } = useWeb3ModalTheme();`);
      expect(result.output).toContain("useOnChainUXTheme()");
    });

    test("renames useAppKit to useOnChainUX", () => {
      const result = transformAppKitToOnChainUX(`const { open } = useAppKit();`);
      expect(result.output).toContain("useOnChainUX()");
    });

    test("renames useAppKitAccount to useOnChainUXAccount", () => {
      const result = transformAppKitToOnChainUX(`const { address } = useAppKitAccount();`);
      expect(result.output).toContain("useOnChainUXAccount()");
    });

    test("renames useAppKitNetwork to useOnChainUXNetwork", () => {
      const result = transformAppKitToOnChainUX(`const { chainId } = useAppKitNetwork();`);
      expect(result.output).toContain("useOnChainUXNetwork()");
    });
  });

  describe("component renames", () => {
    test("renames W3mButton to OnChainUXButton", () => {
      const result = transformAppKitToOnChainUX(`<W3mButton />`);
      expect(result.output).toContain("OnChainUXButton");
    });

    test("renames W3mNetworkSelect to OnChainUXNetworkSelect", () => {
      const result = transformAppKitToOnChainUX(`<W3mNetworkSelect />`);
      expect(result.output).toContain("OnChainUXNetworkSelect");
    });

    test("renames W3mModal to OnChainUXModal", () => {
      const result = transformAppKitToOnChainUX(`<W3mModal />`);
      expect(result.output).toContain("OnChainUXModal");
    });

    test("renames AppKitButton to OnChainUXButton", () => {
      const result = transformAppKitToOnChainUX(`<AppKitButton />`);
      expect(result.output).toContain("OnChainUXButton");
    });
  });

  describe("type renames", () => {
    test("renames Web3ModalConfig to OnChainUXConfig", () => {
      const result = transformAppKitToOnChainUX(`const config: Web3ModalConfig = {};`);
      expect(result.output).toContain("OnChainUXConfig");
    });

    test("renames AppKitConfig to OnChainUXConfig", () => {
      const result = transformAppKitToOnChainUX(`const config: AppKitConfig = {};`);
      expect(result.output).toContain("OnChainUXConfig");
    });

    test("renames Web3ModalTheme to OnChainUXTheme", () => {
      const result = transformAppKitToOnChainUX(`const theme: Web3ModalTheme = { mode: "dark" };`);
      expect(result.output).toContain("OnChainUXTheme");
    });
  });

  describe("config key renames", () => {
    test("renames walletConnectProjectId to projectId", () => {
      const result = transformAppKitToOnChainUX(`{ walletConnectProjectId: "xyz" }`);
      expect(result.output).toContain("projectId:");
    });

    test("renames enableAnalytics to analytics", () => {
      const result = transformAppKitToOnChainUX(`{ enableAnalytics: true }`);
      expect(result.output).toContain("analytics:");
    });
  });

  describe("edge cases", () => {
    test("no-op on already-migrated code", () => {
      const result = transformAppKitToOnChainUX(`import { OnChainUX } from "@onchainux/core-sdk";`);
      expect(result.transformed).toBe(false);
    });

    test("no-op on unrelated code", () => {
      const result = transformAppKitToOnChainUX(`const x = 42;`);
      expect(result.transformed).toBe(false);
    });

    test("changes array is populated", () => {
      const result = transformAppKitToOnChainUX(`import { Web3Modal } from "@web3modal/react";`);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    test("full migration example", () => {
      const input = `
import { createWeb3Modal, defaultConfig } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/react'

const modal = createWeb3Modal({
  walletConnectProjectId: 'abc123',
  chains: [mainnet],
  themeMode: 'dark',
})

function App() {
  return <Web3Modal />
}
`;
      const result = transformAppKitToOnChainUX(input);
      expect(result.transformed).toBe(true);
      expect(result.output).toContain("@onchainux/ethereum");
      expect(result.output).toContain("@onchainux/react");
      expect(result.output).toContain("createOnChainUX");
      expect(result.output).toContain("OnChainUX");
      expect(result.output).toContain("projectId:");
    });
  });
});

// ── wc-v1-to-v2 tests ──────────────────────────────────────────────────────

describe("wc-v1-to-v2 codemod", () => {
  describe("import renames", () => {
    test("renames @walletconnect/client to @walletconnect/sign-client", () => {
      const result = transformWcV1ToV2(`import WalletConnect from "@walletconnect/client";`);
      expect(result.transformed).toBe(true);
      expect(result.output).toContain("@walletconnect/sign-client");
    });

    test("renames @walletconnect/browser-client to @walletconnect/sign-client", () => {
      const result = transformWcV1ToV2(`import { BrowserClient } from "@walletconnect/browser-client";`);
      expect(result.output).toContain("@walletconnect/sign-client");
    });
  });

  describe("event renames", () => {
    test("renames connect event to session_proposal", () => {
      const result = transformWcV1ToV2(`provider.on('connect', handler);`);
      expect(result.transformed).toBe(true);
      expect(result.output).toContain("session_proposal");
    });

    test("renames disconnect event to session_delete", () => {
      const result = transformWcV1ToV2(`provider.on('disconnect', handler);`);
      expect(result.output).toContain("session_delete");
    });

    test("renames call_request to session_request", () => {
      const result = transformWcV1ToV2(`provider.on('call_request', handler);`);
      expect(result.output).toContain("session_request");
    });
  });

  describe("method renames", () => {
    test("renames createSession to connect", () => {
      const result = transformWcV1ToV2(`await provider.createSession();`);
      expect(result.output).toContain(".connect()");
    });

    test("renames killSession to disconnect", () => {
      const result = transformWcV1ToV2(`await provider.killSession();`);
      expect(result.output).toContain(".disconnect()");
    });
  });

  describe("bridge URL replacement", () => {
    test("replaces bridge URL with projectId", () => {
      const result = transformWcV1ToV2(`const wc = new WalletConnect({ bridge: 'https://bridge.walletconnect.org' });`);
      expect(result.output).toContain("projectId");
    });

    test("replaces bridge in config object", () => {
      const result = transformWcV1ToV2(`{ bridge: 'https://bridge.walletconnect.org' }`);
      expect(result.output).toContain("projectId");
    });
  });

  describe("edge cases", () => {
    test("no-op on already v2 code", () => {
      const result = transformWcV1ToV2(`client.on('session_proposal', handler);`);
      expect(result.transformed).toBe(false);
    });

    test("no-op on unrelated code", () => {
      const result = transformWcV1ToV2(`const x = 42;`);
      expect(result.transformed).toBe(false);
    });

    test("multiple transforms in one file", () => {
      const input = `
import WalletConnect from "@walletconnect/client";

const wc = new WalletConnect({
  bridge: 'https://bridge.walletconnect.org',
  rpc: { 1: 'https://mainnet.infura.io' }
});

wc.on('connect', onConnect);
wc.on('disconnect', onDisconnect);
await wc.createSession();
`;
      const result = transformWcV1ToV2(input);
      expect(result.transformed).toBe(true);
      expect(result.output).toContain("@walletconnect/sign-client");
      expect(result.output).toContain("session_proposal");
      expect(result.output).toContain("session_delete");
      expect(result.output).toContain(".connect()");
    });
  });
});

// ── exports / index tests ──────────────────────────────────────────────────

describe("index exports", () => {
  test("TRANSFORMS contains both codemods", () => {
    expect(TRANSFORMS).toHaveProperty("appkit-to-onchainux");
    expect(TRANSFORMS).toHaveProperty("wc-v1-to-v2");
  });

  test("listTransforms returns all transform names", () => {
    const transforms = listTransforms();
    expect(transforms).toContain("appkit-to-onchainux");
    expect(transforms).toContain("wc-v1-to-v2");
    expect(transforms.length).toBe(2);
  });

  test("each transform function is callable", () => {
    for (const [name, fn] of Object.entries(TRANSFORMS)) {
      const result = fn("const x = 1;");
      expect(result).toHaveProperty("transformed");
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("original");
      expect(result).toHaveProperty("changes");
    }
  });
});
