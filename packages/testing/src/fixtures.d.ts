/**
 * Fixtures — Common test fixtures for Cinacoin testing.
 *
 * Pre-built addresses, signatures, ABIs, events, and configuration objects
 * that cover the most common testing scenarios.
 */
export declare const ADDRESSES: {
    zero: "0x0000000000000000000000000000000000000000";
    deployer: "0x0000000000000000000000000000000000000001";
    user1: "0x0000000000000000000000000000000000000001";
    user2: "0x0000000000000000000000000000000000000002";
    user3: "0x0000000000000000000000000000000000000003";
    contract: "0xdead000000000000000000000000000000000001";
    ens: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
};
export declare const SIGNATURES: {
    valid: string;
    empty: string;
    malformed: string;
    short: string;
};
export declare const HASHES: {
    tx: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    block: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    data: "0xdeadbeef";
    emptyData: "0x";
};
export declare const TYPED_DATA: {
    domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: "0xdead000000000000000000000000000000000001";
    };
    types: {
        Person: {
            name: string;
            type: string;
        }[];
        Mail: {
            name: string;
            type: string;
        }[];
    };
    primaryType: "Mail";
    message: {
        from: {
            name: string;
            wallet: "0x0000000000000000000000000000000000000001";
        };
        to: {
            name: string;
            wallet: "0x0000000000000000000000000000000000000002";
        };
        contents: string;
    };
};
export declare const ERC20_ABI: readonly [{
    readonly type: "function";
    readonly name: "balanceOf";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "transfer";
    readonly inputs: readonly [{
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "approve";
    readonly inputs: readonly [{
        readonly name: "spender";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "event";
    readonly name: "Transfer";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "value";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "Approval";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "spender";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "value";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}];
export declare const ERC721_ABI: readonly [{
    readonly type: "function";
    readonly name: "balanceOf";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "transferFrom";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
    }, {
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "tokenId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "event";
    readonly name: "Transfer";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "tokenId";
        readonly type: "uint256";
        readonly indexed: true;
    }];
}];
export declare const CHAIN_FIXTURES: {
    readonly mainnet: {
        readonly id: 1;
        readonly chainId: "0x1";
        readonly name: "Ethereum Mainnet";
        readonly symbol: "ETH";
    };
    readonly sepolia: {
        readonly id: 11155111;
        readonly chainId: "0xaa36a7";
        readonly name: "Sepolia";
        readonly symbol: "ETH";
    };
    readonly polygon: {
        readonly id: 137;
        readonly chainId: "0x89";
        readonly name: "Polygon";
        readonly symbol: "MATIC";
    };
};
export interface ProviderStateFixture {
    accounts: string[];
    chainId: string;
    isConnected: boolean;
}
export declare const PROVIDER_STATES: {
    readonly disconnected: {
        readonly accounts: readonly [];
        readonly chainId: "0x1";
        readonly isConnected: false;
    };
    readonly connected: {
        readonly accounts: readonly ["0x0000000000000000000000000000000000000001"];
        readonly chainId: "0x1";
        readonly isConnected: true;
    };
    readonly multiAccount: {
        readonly accounts: readonly ["0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002", "0x0000000000000000000000000000000000000003"];
        readonly chainId: "0x1";
        readonly isConnected: true;
    };
    readonly testnet: {
        readonly accounts: readonly ["0x0000000000000000000000000000000000000001"];
        readonly chainId: "0xaa36a7";
        readonly isConnected: true;
    };
};
export declare const ERRORS: {
    readonly userRejected: {
        readonly code: 4001;
        readonly message: "User rejected the request.";
    };
    readonly unauthorized: {
        readonly code: 4100;
        readonly message: "The requested method and/or account has not been authorized by the user.";
    };
    readonly unsupportedMethod: {
        readonly code: 4200;
        readonly message: "The requested method is not supported by this provider.";
    };
    readonly disconnected: {
        readonly code: 4900;
        readonly message: "The provider is disconnected from all chains.";
    };
    readonly chainDisconnected: {
        readonly code: 4901;
        readonly message: "The provider is disconnected from the specified chain.";
    };
};
//# sourceMappingURL=fixtures.d.ts.map