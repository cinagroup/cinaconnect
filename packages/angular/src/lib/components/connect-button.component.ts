import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CinacoinService } from '../cinacoin.service.js';
import { Observable, Subscription } from 'rxjs';

/**
 * Button component that triggers the wallet connection modal.
 *
 * ```html
 * <cina-connect-button></cina-connect-button>
 * <cina-connect-button [disabled]="isConnecting" size="lg" label="Connect Wallet"></cina-connect-button>
 * ```
 */
@Component({
  selector: 'cina-connect-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="cina-connect-button"
      [class.cina-connect-button--loading]="loading"
      [class.cina-connect-button--size-sm]="size === 'sm'"
      [class.cina-connect-button--size-md]="size === 'md'"
      [class.cina-connect-button--size-lg]="size === 'lg'"
      [disabled]="disabled || loading"
      (click)="handleClick()"
    >
      <ng-container *ngIf="loading; else defaultContent">
        <span class="cina-connect-button__spinner"></span>
        Connecting...
      </ng-container>
      <ng-template #defaultContent>
        {{ displayLabel }}
      </ng-template>
    </button>
  `,
  styles: [
    `
      .cina-connect-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        font-weight: 600;
        border: none;
        border-radius: 0.75rem;
        cursor: pointer;
        background: #3b82f6;
        color: #ffffff;
        transition: background-color 0.15s ease, opacity 0.15s ease;
      }
      .cina-connect-button:hover:not(:disabled) {
        background: #2563eb;
      }
      .cina-connect-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .cina-connect-button--size-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
      }
      .cina-connect-button--size-md {
        padding: 0.625rem 1.25rem;
        font-size: 1rem;
      }
      .cina-connect-button--size-lg {
        padding: 0.875rem 1.75rem;
        font-size: 1.125rem;
      }
      .cina-connect-button__spinner {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: cina-spin 0.6s linear infinite;
      }
      @keyframes cina-spin {
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class ConnectButtonComponent implements OnInit, OnDestroy {
  /** Whether the button is disabled. */
  @Input() disabled = false;

  /** Button size: 'sm', 'md', or 'lg'. Defaults to 'md'. */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Custom button label. Defaults to 'Connect Wallet'. */
  @Input() label?: string;

  loading = false;

  private _subscription?: Subscription;

  constructor(private _service: CinacoinService) {}

  ngOnInit(): void {
    this._subscription = this._service.account$.subscribe((account) => {
      // Update button state based on account
      if (account.address) {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this._subscription?.unsubscribe();
  }

  get displayLabel(): string {
    return this.label ?? 'Connect Wallet';
  }

  handleClick(): void {
    if (this.disabled || this.loading) return;
    this.loading = true;
    this._service.connect().catch(() => {
      this.loading = false;
    }).then(() => {
      this.loading = false;
    });
  }
}
