import { ElementRef, Renderer2 } from '@angular/core';
import { CinacoinService } from '../cinacoin.service.js';
/**
 * Directive that automatically triggers wallet connection on click.
 *
 * Apply to any element to make it a connect trigger.
 *
 * ```html
 * <button cinaConnect>Connect Wallet</button>
 * <div cinaConnect [connectorId]="'walletconnect'">Connect via WalletConnect</div>
 * ```
 */
export declare class ConnectDirective {
    private _service;
    private _el;
    private _renderer;
    /** Optional connector ID to use for connection. */
    connectorId?: string;
    /** Whether the directive is disabled. */
    disabled: boolean;
    constructor(_service: CinacoinService, _el: ElementRef<HTMLElement>, _renderer: Renderer2);
    /**
     * Handle click events by initiating a wallet connection.
     *
     * @param event - The click event.
     */
    onClick(event: Event): Promise<void>;
}
//# sourceMappingURL=connect.directive.d.ts.map