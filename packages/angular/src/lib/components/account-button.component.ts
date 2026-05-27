import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CinacoinService, type Account } from '../cinacoin.service.js';
import { Subscription } from 'rxjs';

/**
 * Button component showing the current account with disconnect capability.
 *
 * ```html
 * <cina-account-button></cina-account-button>
 * <cina-account-button *ngIf="account$ | async as account"></cina-account-button>
 * ```
 */
@Component({
  selector: 'cina-account-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="account && account.address; else connectPrompt"
      class="cina-account-button"
    >
      <button
        class="cina-account-button__address"
        [class.cina-account-button--size-sm]="size === 'sm'"
        [class.cina-account-button--size-md]="size === 'md'"
        [class.cina-account-button--size-lg]="size === 'lg'"
        (click)="toggleDropdown()"
      >
        <span class="cina-account-button__dot"></span>
        {{ account.address | slice: 0: 6 }}...{{ account.address | slice: -4 }}
      </button>
      <button
        class="cina-account-button__disconnect"
        (click)="disconnect()"
        title="Disconnect"
      >
        ✕
      </button>
    </div>
    <ng-template #connectPrompt>
      <span class="cina-account-button__placeholder">Not connected</span>
    </ng-template>
  `,
  styles: [
    `
      .cina-account-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        background: #1e293b;
        border-radius: 0.75rem;
        border: 1px solid #334155;
      }
      .cina-account-button__address {
        background: none;
        border: none;
        color: #e2e8f0;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        font-family: monospace;
      }
      .cina-account-button__disconnect {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 0.875rem;
        padding: 0.125rem;
        line-height: 1;
      }
      .cina-account-button__disconnect:hover {
        color: #ef4444;
      }
      .cina-account-button__dot {
        display: inline-block;
        width: 0.5rem;
        height: 0.5rem;
        background: #22c55e;
        border-radius: 50%;
      }
      .cina-account-button__placeholder {
        color: #64748b;
        font-size: 0.875rem;
      }
      .cina-account-button--size-sm {
        font-size: 0.75rem;
      }
      .cina-account-button--size-md {
        font-size: 0.875rem;
      }
      .cina-account-button--size-lg {
        font-size: 1rem;
      }
    `,
  ],
})
export class AccountButtonComponent implements OnInit, OnDestroy {
  /** Button size: 'sm', 'md', or 'lg'. Defaults to 'md'. */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  account: Account | null = null;

  private _subscription?: Subscription;

  constructor(private _service: CinacoinService) {}

  ngOnInit(): void {
    this._subscription = this._service.account$.subscribe(
      (account) => (this.account = account)
    );
  }

  ngOnDestroy(): void {
    this._subscription?.unsubscribe();
  }

  toggleDropdown(): void {
    // Future: open account dropdown with copy address, switch network, etc.
  }

  disconnect(): void {
    this._service.disconnect().catch(console.error);
  }
}
