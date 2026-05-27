/**
 * Codemod test suite — 20+ tests covering both transforms.
 */

import { transformAppKitToCinacoin } from "../src/codemods/appkit-to-cinacoin.js";
import { transformWcV1ToV2 } from "../src/codemods/wc-v1-to-v2.js";
import { TRANSFORMS, listTransforms } from "../src/index.js";

// ── appkit-to-cinacoin tests ──────────────────────────────────────────────

describe("appkit-to-cinacoin codemod", () => {
  describe("package renames", () => {
    test("renames @reown/appkit to @cinacoin/core", () => {
      const result = transformAppKitToCinacoin(`import { createAppKit } from "@reown/appkit";`);
      expect(result.transformed).toBe(true);
      expect(result.output).toContain("@cinacoin/core-sdk");
      expect(result.output).not.toContain("@reown/appkit");
    });

    test("renames @reown/appkit-react to @cinacoin/react", () => {
      const result = transformAppKitToCinacoin(`import { useAppKit } from "@reown/appkit-react";`);
      expect(result.output).toContain("@cinacoin/react");
    });

    test("renames @reown/appkit-wagmi to @cinacoin/wagmi", () => {
      const result = transformAppKitToCinacoin(`import { wagmiAdapter } from "@reown/appkit-wagmi";`);
      expect(result.output).toContain("@cinacoin/wagmi");
    });

    test("renames @web3modal/ethereum to @cinacoin/ethereum", () => {
      const result = transformAppKitToCinacoin(`import { EthereumClient } from "@web3modal/ethereum";`);
      expect(result.output).toContain("@cinacoin/ethereum");
    });

    test("renames @web3modal/wagmi to @cinacoin/wagmi", () => {
      const result = transformAppKitToCinacoin(`import { WagmiAdapter } from "@web3modal/wagmi";`);
      expect(result.output).toContain("@cinacoin/wagmi");
    });

    test("renames @web3modal/react to @cinacoin/react", () => {
      const result = transformAppKitToCinacoin(`import { useWeb3Modal } from "@web3modal/react";`);
      expect(result.output).toContain("@cinacoin/react");
    });

    test("renames @web3modal/ui to @cinacoin/ui", () => {
      const result = transformAppKitToCinacoin(`import { W3mButton } from "@web3modal/ui";`);
      expect(result.output).toContain("@cinacoin/ui");
    });

    test("renames @web3modal/core to @cinacoin/core", () => {
      const result = transformAppKitToCinacoin(`import { W3mFrameHelpers } from "@web3modal/core";`);
      expect(result.output).toContain("@cinacoin/core-sdk");
    });

    test("renames @web3modal/html to @cinacoin/html", () => {
      const result = transformAppKitToCinacoin(`import { Web3Modal } from "@web3modal/html";`);
      expect(result.output).toContain("@cinacoin/html");
    });
  });

  describe("class/function renames", () => {
    test("renames Web3Modal to Cinacoin", () => {
      const result = transformAppKitToCinacoin(`const modal = new Web3Modal({ projectId: "abc" });`);
      expect(result.output).toContain("new Cinacoin(");
    });

    test("renames createWeb3Modal to createCinacoin", () => {
      const result = transformAppKitToCinacoin(`const modal = createWeb3Modal({ projectId: "abc" });`);
      expect(result.output).toContain("createCinacoin(");
    });

    test("renames createAppKit to createCinacoin", () => {
      const result = transformAppKitToCinacoin(`const modal = createAppKit({ projectId: "abc" });`);
      expect(result.output).toContain("createCinacoin(");
    });

    test("renames AppKit to Cinacoin", () => {
      const result = transformAppKitToCinacoin(`const modal = new AppKit({ projectId: "abc" });`);
      expect(result.output).toContain("new Cinacoin(");
    });
  });

  describe("hook renames", () => {
    test("renames useWeb3Modal to useCinacoin", () => {
      const result = transformAppKitToCinacoin(`const { open } = useWeb3Modal();`);
      expect(result.output).toContain("useCinacoin()");
    });

    test("renames useWeb3ModalTheme to useCinacoinTheme", () => {
      const result = transformAppKitToCinacoin(`const { theme } = useWeb3ModalTheme();`);
      expect(result.output).toContain("useCinacoinTheme()");
    });

    test("renames useAppKit to useCinacoin", () => {
      const result = transformAppKitToCinacoin(`const { open } = useAppKit();`);
      expect(result.output).toContain("useCinacoin()");
    });

    test("renames useAppKitAccount to useCinacoinAccount", () => {
      const result = transformAppKitToCinacoin(`const { address } = useAppKitAccount();`);
      expect(result.output).toContain("useCinacoinAccount()");
    });

    test("renames useAppKitNetwork to useCinacoinNetwork", () => {
      const result = transformAppKitToCinacoin(`const { chainId } = useAppKitNetwork();`);
      expect(result.output).toContain("useCinacoinNetwork()");
    });
  });

  describe("component renames", () => {
    test("renames W3mButton to CinacoinButton", () => {
      const result = transformAppKitToCinacoin(`<W3mButton />`);
      expect(result.output).toContain("CinacoinButton");
    });

    test("renames W3mNetworkSelect to CinacoinNetworkSelect", () => {
      const result = transformAppKitToCinacoin(`<W3mNetworkSelect />`);
      expect(result.output).toContain("CinacoinNetworkSelect");
    });

    test("renames W3mModal to CinacoinModal", () => {
      const result = transformAppKitToCinacoin(`<W3mModal />`);
      expect(result.output).toContain("CinacoinModal");
    });

    test("renames AppKitButton to CinacoinButton", () => {
      const result = transformAppKitToCinacoin(`<AppKitButton />`);
      expect(result.output).toContain("CinacoinButton");
    });
  });

  describe("type renames", () => {
    test("renames Web3ModalConfig to CinacoinConfig", () => {
      const result = transformAppKitToCinacoin(`const config: Web3ModalConfig = {};`);
      expect(result.output).toContain("CinacoinConfig");
    });

    test("renames AppKitConfig to CinacoinConfig", () => {
      const result = transformAppKitToCinacoin(`const config: AppKitConfig = {};`);
      expect(result.output).toContain("CinacoinConfig");
    });

    test("renames Web3ModalTheme to CinacoinTheme", () => {
      const result = transformAppKitToCinacoin(`const theme: Web3ModalTheme = { mode: "dark" };`);
      expect(result.output).toContain("CinacoinTheme");
    });
  });

  describe("config key renames", () => {
    test("renames walletConnectProjectId to projectId", () => {
      const result = transformAppKitToCinacoin(`{ walletConnectProjectId: "xyz" }`);
      expect(result.output).toContain("projectId:");
    });

    test("renames enableAnalytics to analytics", () => {
      const result = transformAppKitToCinacoin(`{ enableAnalytics: true }`);
      expect(result.output).toContain("analytics:");
    });
  });

  describe("edge cases", () => {
    test("no-op on already-migrated code", () => {
      const result = transformAppKitToCinacoin(`import { Cinacoin } from "@cinacoin/core-sdk";`);
      expect(result.transformed).toBe(false);
    });

    test("no-op on unrelated code", () => {
      const result = transformAppKitToCinacoin(`const x = 42;`);
      expect(result.transformed).toBe(false);
    });

    test("changes array is populated", () => {
      const result = transformAppKitToCinacoin(`import { Web3Modal } from "@web3modal/react";`);
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
      const result = transformAppKitToCinacoin(input);
      expect(result.transformed).toBe(true);
      expect(result.output).toContain("@cinacoin/ethereum");
      expect(result.output).toContain("@cinacoin/react");
      expect(result.output).toContain("createCinacoin");
      expect(result.output).toContain("Cinacoin");
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
    expect(TRANSFORMS).toHaveProperty("appkit-to-cinacoin");
    expect(TRANSFORMS).toHaveProperty("wc-v1-to-v2");
  });

  test("listTransforms returns all transform names", () => {
    const transforms = listTransforms();
    expect(transforms).toContain("appkit-to-cinacoin");
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
