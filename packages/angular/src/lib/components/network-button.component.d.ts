import { OnInit, OnDestroy } from '@angular/core';
import { CinacoinService, type Network } from '../cinacoin.service.js';
/**
 * Button component showing the currently connected network/chain.
 *
 * ```html
 * <cina-network-button></cina-network-button>
 * ```
 */
export declare class NetworkButtonComponent implements OnInit, OnDestroy {
    private _service;
    /** Button size: 'sm', 'md', or 'lg'. Defaults to 'md'. */
    size: 'sm' | 'md' | 'lg';
    network: Network | null;
    private _subscription?;
    constructor(_service: CinacoinService);
    ngOnInit(): void;
    ngOnDestroy(): void;
}
//# sourceMappingURL=network-button.component.d.ts.map