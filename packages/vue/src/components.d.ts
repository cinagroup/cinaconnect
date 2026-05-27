/**
 * Vue component wrappers for Cinacoin Web Components.
 *
 * These are thin wrappers that forward props and events to the underlying
 * custom elements registered by @cinacoin/core-ui.
 */
/**
 * ConnectButton — Vue wrapper for the OCX ConnectButton Web Component.
 */
export declare const OcxConnectButton: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    label: {
        type: StringConstructor;
        default: string;
    };
    variant: {
        type: () => "primary" | "secondary" | "ghost";
        default: string;
    };
    size: {
        type: () => "sm" | "md" | "lg";
        default: string;
    };
    showBalance: {
        type: BooleanConstructor;
        default: boolean;
    };
    showAvatar: {
        type: BooleanConstructor;
        default: boolean;
    };
    showNetwork: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("disconnect" | "click")[], "disconnect" | "click", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    label: {
        type: StringConstructor;
        default: string;
    };
    variant: {
        type: () => "primary" | "secondary" | "ghost";
        default: string;
    };
    size: {
        type: () => "sm" | "md" | "lg";
        default: string;
    };
    showBalance: {
        type: BooleanConstructor;
        default: boolean;
    };
    showAvatar: {
        type: BooleanConstructor;
        default: boolean;
    };
    showNetwork: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    onClick?: ((...args: any[]) => any) | undefined;
    onDisconnect?: ((...args: any[]) => any) | undefined;
}>, {
    label: string;
    size: "lg" | "sm" | "md";
    variant: "primary" | "secondary" | "ghost";
    showBalance: boolean;
    showAvatar: boolean;
    showNetwork: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
/**
 * ConnectModal — Vue wrapper for the OCX ConnectModal Web Component.
 */
export declare const OcxConnectModal: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    isOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    defaultView: {
        type: StringConstructor;
        default: string;
    };
    recommendedWalletIds: {
        type: () => string[];
        default: () => never[];
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("close" | "wallet-select")[], "close" | "wallet-select", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    isOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    defaultView: {
        type: StringConstructor;
        default: string;
    };
    recommendedWalletIds: {
        type: () => string[];
        default: () => never[];
    };
}>> & Readonly<{
    onClose?: ((...args: any[]) => any) | undefined;
    "onWallet-select"?: ((...args: any[]) => any) | undefined;
}>, {
    isOpen: boolean;
    defaultView: string;
    recommendedWalletIds: string[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
/**
 * ChainSwitcher — Vue wrapper for the OCX ChainSwitcher Web Component.
 */
export declare const OcxChainSwitcher: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    onChainChange: {
        type: () => (chainId: number) => void;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "chain-change"[], "chain-change", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    onChainChange: {
        type: () => (chainId: number) => void;
    };
}>> & Readonly<{
    "onChain-change"?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=components.d.ts.map