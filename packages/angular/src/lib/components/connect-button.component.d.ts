import { OnInit, OnDestroy } from '@angular/core';
import { CinacoinService } from '../cinacoin.service.js';
/**
 * Button component that triggers the wallet connection modal.
 *
 * ```html
 * <cina-connect-button></cina-connect-button>
 * <cina-connect-button [disabled]="isConnecting" size="lg" label="Connect Wallet"></cina-connect-button>
 * ```
 */
export declare class ConnectButtonComponent implements OnInit, OnDestroy {
    private _service;
    /** Whether the button is disabled. */
    disabled: boolean;
    /** Button size: 'sm', 'md', or 'lg'. Defaults to 'md'. */
    size: 'sm' | 'md' | 'lg';
    /** Custom button label. Defaults to 'Connect Wallet'. */
    label?: string;
    loading: boolean;
    private _subscription?;
    constructor(_service: CinacoinService);
    ngOnInit(): void;
    ngOnDestroy(): void;
    get displayLabel(): string;
    handleClick(): void;
}
//# sourceMappingURL=connect-button.component.d.ts.map