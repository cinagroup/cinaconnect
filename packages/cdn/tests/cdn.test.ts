/**
 * CDN Package Tests — CDN loading, config, loader, connect, modal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Config Tests ───────────────────────────────────────────

describe("CDN Config", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      delete (window as any).Cinacoin;
    }
    vi.resetModules();
  });

  it("returns default config when window.Cinacoin is not set", async () => {
    const { getConfig } = await import("../src/config.js");
    const config = getConfig();
    expect(config.theme).toBe("light");
    expect(config.chains).toEqual([1]);
    expect(config.showRecent).toBe(true);
  });

  it("merges user config with defaults", async () => {
    (window as any).Cinacoin = {
      projectId: "test-123",
      theme: "dark",
      chains: [1, 10],
    };

    const { getConfig } = await import("../src/config.js");
    const config = getConfig();

    expect(config.projectId).toBe("test-123");
    expect(config.theme).toBe("dark");
    expect(config.chains).toEqual([1, 10]);
    expect(config.showRecent).toBe(true);
  });

  it("validates config and reports missing projectId", async () => {
    const { validateConfig } = await import("../src/config.js");
    const missing = validateConfig({ theme: "dark", chains: [1] });
    expect(missing).toContain("projectId");
  });

  it("returns empty array for valid config", async () => {
    const { validateConfig } = await import("../src/config.js");
    const missing = validateConfig({ projectId: "abc123", theme: "light" });
    expect(missing).toEqual([]);
  });
});

// ── Loader Tests ───────────────────────────────────────────

describe("CDN Loader", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("loads a module and caches it", async () => {
    const { loadModule, isLoaded, getModule, clearCache } = await import("../src/loader.js");
    const loader = vi.fn().mockResolvedValue({ name: "test-module" });

    const result = await loadModule("test", loader);
    expect(result.state).toBe("loaded");
    expect(result.module).toEqual({ name: "test-module" });
    expect(isLoaded("test")).toBe(true);
    expect(getModule("test")).toEqual({ name: "test-module" });

    clearCache();
    expect(isLoaded("test")).toBe(false);
  });

  it("returns cached result on second load", async () => {
    const { loadModule, clearCache } = await import("../src/loader.js");
    const loader = vi.fn().mockResolvedValue({ name: "cached" });

    await loadModule("cached", loader);
    await loadModule("cached", loader);

    expect(loader).toHaveBeenCalledTimes(1);
    clearCache();
  });

  it("handles module load errors", async () => {
    const { loadModule, clearCache } = await import("../src/loader.js");
    const loader = vi.fn().mockRejectedValue(new Error("Not found"));

    const result = await loadModule("broken", loader);
    expect(result.state).toBe("error");
    expect(result.module).toBeNull();
    expect(result.error).toContain("Not found");

    clearCache();
  });

  it("preloads multiple modules in parallel", async () => {
    const { preloadModules, clearCache } = await import("../src/loader.js");

    const results = await preloadModules({
      mod1: () => Promise.resolve({ name: "one" }),
      mod2: () => Promise.resolve({ name: "two" }),
      mod3: () => Promise.reject(new Error("fail")),
    });

    expect(results.mod1.state).toBe("loaded");
    expect(results.mod2.state).toBe("loaded");
    expect(results.mod3.state).toBe("error");

    clearCache();
  });
});

// ── ConnectButton Tests ────────────────────────────────────

describe("CDN ConnectButton", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-button";
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.resetModules();
  });

  it("renders a button into the target element", async () => {
    const { renderConnectButton, getConnectButtonState } = await import("../src/connect.js");

    renderConnectButton("#test-button");
    const btn = container.querySelector("button");

    expect(btn).toBeTruthy();
    expect(btn?.textContent).toBe("Connect Wallet");
    expect(getConnectButtonState()).toBe("disconnected");
  });

  it("renders with custom label", async () => {
    const { renderConnectButton } = await import("../src/connect.js");

    renderConnectButton("#test-button", { label: "Sign In" });
    const btn = container.querySelector("button");

    expect(btn).toBeTruthy();
    expect(btn?.textContent).toBe("Sign In");
  });

  it("errors when target element does not exist", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { renderConnectButton } = await import("../src/connect.js");

    renderConnectButton("#nonexistent");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ── ConnectModal Tests ─────────────────────────────────────

describe("CDN ConnectModal", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "test-modal";
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.resetModules();
  });

  it("renders modal content into the target element", async () => {
    const { renderConnectModal, getCurrentView } = await import("../src/modal.js");

    renderConnectModal("#test-modal", {
      wallets: [
        { id: "metamask", name: "MetaMask" },
      ],
    });

    const modal = container.querySelector(".ocx-connect-modal");
    expect(modal).toBeTruthy();
    expect(getCurrentView()).toBe("connect");
  });

  it("renders wallet buttons", async () => {
    const { renderConnectModal } = await import("../src/modal.js");

    renderConnectModal("#test-modal", {
      wallets: [
        { id: "metamask", name: "MetaMask", installed: true },
        { id: "rainbow", name: "Rainbow" },
      ],
    });

    const modal = container.querySelector(".ocx-connect-modal");
    expect(modal).toBeTruthy();
    const walletBtns = modal!.querySelectorAll(".ocx-wallet-btn");
    expect(walletBtns.length).toBe(2);
  });
});

// ── Index Exports Tests ────────────────────────────────────

describe("CDN Index", () => {
  it("exports all expected APIs", async () => {
    const api = await import("../src/index.js");

    expect(typeof api.getConfig).toBe("function");
    expect(typeof api.validateConfig).toBe("function");
    expect(typeof api.renderConnectButton).toBe("function");
    expect(typeof api.renderConnectModal).toBe("function");
    expect(typeof api.showModal).toBe("function");
    expect(typeof api.hideModal).toBe("function");
    expect(typeof api.toggleModal).toBe("function");
    expect(typeof api.loadModule).toBe("function");
    expect(typeof api.isLoaded).toBe("function");
    expect(typeof api.getModule).toBe("function");
    expect(typeof api.clearCache).toBe("function");
    expect(typeof api.preloadModules).toBe("function");
  });

  it("exports default API object", async () => {
    const api = await import("../src/index.js");
    expect(api.default).toBeTruthy();
    expect(typeof api.default.version).toBe("string");
  });
});
