/**
 * MockProvider test suite — 20+ tests
 */

import { MockProvider } from "../src/MockProvider.js.js";

describe("MockProvider", () => {
  describe("construction & defaults", () => {
    test("creates with default accounts and chainId", () => {
      const p = new MockProvider();
      expect(p.accounts).toHaveLength(2);
      expect(p.chainId).toBe("0x1");
      expect(p.isMetaMask).toBe(true);
      expect(p.isCinacoin).toBe(true);
    });

    test("creates with custom accounts", () => {
      const p = new MockProvider({ accounts: ["0xabc", "0xdef"] });
      expect(p.accounts).toEqual(["0xabc", "0xdef"]);
    });

    test("creates with custom chainId", () => {
      const p = new MockProvider({ chainId: "0x89" });
      expect(p.chainId).toBe("0x89");
    });
  });

  describe("request — builtin methods", () => {
    let p: MockProvider;
    beforeEach(() => {
      p = new MockProvider({ accounts: ["0xaaa", "0xbbb"], chainId: "0x1" });
    });

    test("eth_accounts returns accounts", async () => {
      const accounts = await p.request({ method: "eth_accounts" });
      expect(accounts).toEqual(["0xaaa", "0xbbb"]);
    });

    test("eth_chainId returns chainId", async () => {
      const chainId = await p.request({ method: "eth_chainId" });
      expect(chainId).toBe("0x1");
    });

    test("eth_sendTransaction returns hash", async () => {
      const hash = await p.request({
        method: "eth_sendTransaction",
        params: [{ from: "0xaaa", to: "0xbbb", value: "0x0" }],
      });
      expect(hash).toMatch(/^0x/);
    });

    test("eth_signTypedData_v4 returns a signature", async () => {
      const sig = await p.request({
        method: "eth_signTypedData_v4",
        params: ["0xaaa", {}],
      });
      expect(sig).toMatch(/^0x/);
      expect((sig as string).length).toBe(132); // 0x + 65 bytes
    });

    test("personal_sign returns a signature", async () => {
      const sig = await p.request({
        method: "personal_sign",
        params: ["0xhello", "0xaaa"],
      });
      expect(sig).toMatch(/^0x/);
    });

    test("wallet_switchEthereumChain updates chainId", async () => {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x89" }],
      });
      expect(p.chainId).toBe("0x89");
    });

    test("wallet_addEthereumChain returns null", async () => {
      const res = await p.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: "0xa4b1", chainName: "Arbitrum" }],
      });
      expect(res).toBeNull();
    });

    test("net_version returns decimal chainId", async () => {
      const v = await p.request({ method: "net_version" });
      expect(v).toBe("1");
    });

    test("wallet_requestPermissions returns permissions", async () => {
      const res = await p.request({ method: "wallet_requestPermissions" });
      expect(Array.isArray(res)).toBe(true);
      expect((res as any)[0].parentCapability).toBe("eth_accounts");
    });

    test("wallet_getPermissions returns permissions", async () => {
      const res = await p.request({ method: "wallet_getPermissions" });
      expect(Array.isArray(res)).toBe(true);
    });
  });

  describe("request — custom mocks", () => {
    test("returns configured result", async () => {
      const p = new MockProvider();
      p.mock("custom_method", { result: { foo: "bar" } });
      const res = await p.request({ method: "custom_method" });
      expect(res).toEqual({ foo: "bar" });
    });

    test("throws configured error", async () => {
      const p = new MockProvider();
      p.mock("fail_method", {
        error: { code: 4001, message: "Rejected" },
      });
      await expect(p.request({ method: "fail_method" })).rejects.toThrow("Rejected");
    });

    test("applies configured delay", async () => {
      const p = new MockProvider();
      p.mock("slow_method", { result: "done", delay: 50 });
      const start = Date.now();
      await p.request({ method: "slow_method" });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    test("falls back to default response", async () => {
      const p = new MockProvider({
        defaultResponse: { result: "default" },
      });
      const res = await p.request({ method: "unknown_method" });
      expect(res).toBe("default");
    });

    test("unmock removes the config", async () => {
      const p = new MockProvider({ defaultResponse: { result: "fallback" } });
      p.mock("x", { result: "mocked" });
      expect(await p.request({ method: "x" })).toBe("mocked");
      p.unmock("x");
      expect(await p.request({ method: "x" })).toBe("fallback");
    });

    test("clearMocks removes all configs", async () => {
      const p = new MockProvider({ defaultResponse: { result: "d" } });
      p.mock("a", { result: "1" });
      p.mock("b", { result: "2" });
      p.clearMocks();
      expect(await p.request({ method: "a" })).toBe("d");
      expect(await p.request({ method: "b" })).toBe("d");
    });
  });

  describe("request — error with data", () => {
    test("error includes data field", async () => {
      const p = new MockProvider();
      p.mock("err_with_data", {
        error: { code: -32603, message: "Internal", data: { reason: "test" } },
      });
      try {
        await p.request({ method: "err_with_data" });
        fail("should throw");
      } catch (e: any) {
        expect(e.code).toBe(-32603);
        expect(e.data).toEqual({ reason: "test" });
      }
    });
  });

  describe("call log", () => {
    test("records every request", async () => {
      const p = new MockProvider();
      await p.request({ method: "eth_chainId" });
      await p.request({ method: "eth_accounts" });
      expect(p.callLog).toHaveLength(2);
      expect(p.callLog[0].method).toBe("eth_chainId");
      expect(p.callLog[1].method).toBe("eth_accounts");
    });

    test("call log includes params", async () => {
      const p = new MockProvider();
      await p.request({ method: "x", params: [1, 2] });
      expect(p.callLog[0].params).toEqual([1, 2]);
    });

    test("resetCallLog clears the log", async () => {
      const p = new MockProvider();
      await p.request({ method: "a" });
      p.resetCallLog();
      expect(p.callLog).toHaveLength(0);
    });

    test("full reset clears log", async () => {
      const p = new MockProvider();
      await p.request({ method: "a" });
      p.reset();
      expect(p.callLog).toHaveLength(0);
    });
  });

  describe("state management", () => {
    test("setAccounts updates accounts", () => {
      const p = new MockProvider();
      p.setAccounts(["0xnew"]);
      expect(p.accounts).toEqual(["0xnew"]);
    });

    test("setChainId updates chainId", () => {
      const p = new MockProvider();
      p.setChainId("0xa");
      expect(p.chainId).toBe("0xa");
    });

    test("reset restores defaults", () => {
      const p = new MockProvider();
      p.setAccounts(["0xonly"]);
      p.setChainId("0xff");
      p.mock("x", { result: 1 });
      p.reset();
      expect(p.accounts).toHaveLength(2);
      expect(p.chainId).toBe("0x1");
    });

    test("reset with options applies new values", () => {
      const p = new MockProvider();
      p.reset({ accounts: ["0xreset"], chainId: "0x5" });
      expect(p.accounts).toEqual(["0xreset"]);
      expect(p.chainId).toBe("0x5");
    });
  });

  describe("events", () => {
    test("emits chainChanged on setChainId", async () => {
      const p = new MockProvider();
      const fn = jest.fn();
      p.on("chainChanged", fn);
      p.setChainId("0x89");
      expect(fn).toHaveBeenCalledWith("0x89");
    });

    test("emits accountsChanged on setAccounts", async () => {
      const p = new MockProvider();
      const fn = jest.fn();
      p.on("accountsChanged", fn);
      p.setAccounts(["0xnew"]);
      expect(fn).toHaveBeenCalledWith(["0xnew"]);
    });

    test("removeListener stops receiving events", async () => {
      const p = new MockProvider();
      const fn = jest.fn();
      p.on("chainChanged", fn);
      p.removeListener("chainChanged", fn);
      p.setChainId("0x5");
      expect(fn).not.toHaveBeenCalled();
    });

    test("once fires only once", async () => {
      const p = new MockProvider();
      const fn = jest.fn();
      p.once("chainChanged", fn);
      p.setChainId("0x5");
      p.setChainId("0xa");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("emit returns true when listeners exist", async () => {
      const p = new MockProvider();
      const fn = jest.fn();
      p.on("connect", fn);
      const result = p.emit("connect", { chainId: "0x1" });
      expect(result).toBe(true);
    });

    test("emit returns false when no listeners", async () => {
      const p = new MockProvider();
      const result = p.emit("connect", { chainId: "0x1" });
      expect(result).toBe(false);
    });

    test("removeAllListeners removes everything", async () => {
      const p = new MockProvider();
      const fn = jest.fn();
      p.on("chainChanged", fn);
      p.on("accountsChanged", fn);
      p.removeAllListeners();
      p.setChainId("0x5");
      expect(fn).not.toHaveBeenCalled();
    });

    test("autoEmit=false suppresses events", async () => {
      const p = new MockProvider({ autoEmit: false });
      const fn = jest.fn();
      p.on("chainChanged", fn);
      p.setChainId("0x5");
      expect(fn).not.toHaveBeenCalled();
      expect(p.chainId).toBe("0x5");
    });
  });
});
