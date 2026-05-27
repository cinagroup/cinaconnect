import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CinacoinService, type Network } from '../cinacoin.service.js';
import { Subscription } from 'rxjs';

/**
 * Button component showing the currently connected network/chain.
 *
 * ```html
 * <cina-network-button></cina-network-button>
 * ```
 */
@Component({
  selector: 'cina-network-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="network && network.connected; else disconnected"
      class="cina-network-button"
    >
      <span class="cina-network-button__icon">⬡</span>
      <span class="cina-network-button__name">{{ network.name ?? 'Unknown' }}</span>
      <span
        *ngIf="network.chainId"
        class="cina-network-button__id"
        >Chain ID: {{ network.chainId }}</span
      >
    </div>
    <ng-template #disconnected>
      <span class="cina-network-button__disconnected">No network</span>
    </ng-template>
  `,
  styles: [
    `
      .cina-network-button {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        background: #0f172a;
        border-radius: 0.5rem;
        border: 1px solid #1e293b;
        color: #cbd5e1;
        font-size: 0.8125rem;
      }
      .cina-network-button__icon {
        color: #8b5cf6;
      }
      .cina-network-button__name {
        font-weight: 600;
      }
      .cina-network-button__id {
        color: #64748b;
        font-family: monospace;
      }
      .cina-network-button__disconnected {
        color: #475569;
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class NetworkButtonComponent implements OnInit, OnDestroy {
  /** Button size: 'sm', 'md', or 'lg'. Defaults to 'md'. */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  network: Network | null = null;

  private _subscription?: Subscription;

  constructor(private _service: CinacoinService) {}

  ngOnInit(): void {
    this._subscription = this._service.network$.subscribe(
      (network) => (this.network = network)
    );
  }

  ngOnDestroy(): void {
    this._subscription?.unsubscribe();
  }
}
