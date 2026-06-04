import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DynamicToastViewportComponent,
  DynamicToastService,
  DynamicIslandDirective,
  DynamicToastTheme,
  DynamicToastPosition,
} from 'ngx-dynamic-toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicToastViewportComponent, DynamicIslandDirective],
  template: `
    <div class="app-container">
      <!-- Minimalist Clean Header -->
      <header class="header">
        <div class="logo-area">
          <div class="logo-text-icon">ND</div>
          <div>
            <h1>ngx-dynamic-toast Playground</h1>
            <p class="subtitle">Liquid-smooth spring-physics notifications for Angular</p>
          </div>
        </div>
      </header>

      <!-- Dismissal Instructions -->
      <section class="instructions-banner">
        <h3>Dismissal Interactions</h3>
        <p>This library supports three intuitive ways to close notifications:</p>
        <ul>
          <li>
            <strong>Hover Close:</strong> Move your mouse over any active toast to reveal the
            <strong>&times; Close</strong> button on the right.
          </li>
          <li>
            <strong>Tactile Gesture:</strong> Press and swipe up or down (30px threshold) on any
            active toast to dismiss it.
          </li>
          <li>
            <strong>Click Interaction:</strong> Simply click any non-expandable toast, or click the
            primary action button to dismiss.
          </li>
        </ul>
      </section>

      <main class="grid-layout">
        <!-- Configuration Control Panel -->
        <section class="panel config-panel">
          <h2>Viewport Settings</h2>
          <p class="panel-desc">Configure the viewport positioning and theme options.</p>

          <div class="control-group">
            <label>Theme</label>
            <div class="theme-selector">
              <button [class.active]="theme() === 'dark'" (click)="theme.set('dark')">Dark</button>
              <button [class.active]="theme() === 'light'" (click)="theme.set('light')">
                Light
              </button>
              <button [class.active]="theme() === 'system'" (click)="theme.set('system')">
                System
              </button>
            </div>
          </div>

          <div class="control-group">
            <label>Global Position</label>
            <select
              [ngModel]="position()"
              (ngModelChange)="position.set($event)"
              class="select-input"
            >
              <option value="top-left">Top Left</option>
              <option value="top-center">Top Center</option>
              <option value="top-right">Top Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-right">Bottom Right</option>
            </select>
          </div>

          <div class="control-group">
            <label>Custom Offsets (px)</label>
            <div class="offset-inputs">
              <div>
                <span>Top</span>
                <input
                  type="number"
                  [ngModel]="toastOffsetTop()"
                  (ngModelChange)="toastOffsetTop.set($event)"
                  class="num-input"
                />
              </div>
              <div>
                <span>Bottom</span>
                <input
                  type="number"
                  [ngModel]="toastOffsetBottom()"
                  (ngModelChange)="toastOffsetBottom.set($event)"
                  class="num-input"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Standard Toasts Panel -->
        <section class="panel action-panel">
          <h2>Standard Notifications</h2>
          <p class="panel-desc">Trigger spring animated toasts with beautiful entry transitions.</p>

          <div class="btn-grid">
            <button class="btn btn-success" (click)="triggerSuccess()">Success Toast</button>
            <button class="btn btn-danger" (click)="triggerError()">Error Toast</button>
            <button class="btn btn-info" (click)="triggerInfo()">Info Toast</button>
            <button class="btn btn-warning" (click)="triggerWarning()">Warning Toast</button>
            <button class="btn btn-secondary" (click)="triggerLoading()">
              Loading (Async Resolve)
            </button>
            <button class="btn btn-secondary" (click)="triggerActionToast()">
              Toast with Action
            </button>
          </div>

          <hr class="divider" />

          <h3>Create Custom Toast</h3>
          <div class="custom-toast-form">
            <input
              type="text"
              [(ngModel)]="customTitle"
              placeholder="Toast Title..."
              class="text-input"
            />
            <textarea
              [(ngModel)]="customDesc"
              placeholder="Toast Description (optional)..."
              class="textarea-input"
            ></textarea>
            <button class="btn btn-primary" (click)="triggerCustom()">Launch Custom Toast</button>
          </div>

          <div class="global-actions">
            <button class="btn btn-secondary danger-text" (click)="clearAll()">
              Clear All Toasts
            </button>
          </div>
        </section>

        <!-- Dynamic Island / Element-Anchored Toasts Panel -->
        <section class="panel action-panel wide-panel">
          <div
            class="island-panel-header"
            style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;"
          >
            <div style="flex: 1; min-width: 280px;">
              <h2>Dynamic Island Anchors</h2>
              <p class="panel-desc" style="margin-bottom: 0.5rem;">
                Toasts morph directly around the DOM element that triggered them, functioning
                similarly to the iOS Dynamic Island.
              </p>
              <div
                style="background: rgba(245, 158, 11, 0.1); border: 1px dashed rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #d97706; display: inline-block;"
              >
                <strong>Experimental:</strong> Anchor alignments might vary under certain layout
                setups. We would love your help to improve this feature! Feel free to contribute to
                our repository.
              </div>
            </div>

            <div class="control-group" style="margin-bottom: 0;">
              <label
                style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem;"
                >Anchor Mode</label
              >
              <div class="theme-selector" style="min-width: 260px;">
                <button
                  [class.active]="islandMode() === 'island'"
                  (click)="islandMode.set('island')"
                >
                  Island (Border Wrap)
                </button>
                <button
                  [class.active]="islandMode() === 'inline'"
                  (click)="islandMode.set('inline')"
                >
                  Inline (Morph Element)
                </button>
              </div>
            </div>
          </div>

          <div class="island-showcase-grid">
            <!-- Case 1: Save Action -->
            <div class="island-card">
              <div class="card-header">
                <h4>Dynamic Saving State</h4>
                <p>
                  Anchors a loading toast that completes and transforms into a success checkmark.
                </p>
              </div>
              <div class="card-body">
                <div
                  dtDynamicIsland
                  [dtIslandMode]="islandMode()"
                  dtIslandId="save-island"
                  class="island-anchor-wrapper"
                >
                  <button class="btn btn-primary" (click)="runSaveSimulation()">
                    Save Document
                  </button>
                </div>
              </div>
            </div>

            <!-- Case 2: Confirmation Modal inside Toast -->
            <div class="island-card">
              <div class="card-header">
                <h4>In-Context Action Confirmation</h4>
                <p>
                  Launches a danger toast directly surrounding the button, prompting the user for
                  instant confirmation.
                </p>
              </div>
              <div class="card-body">
                <div
                  dtDynamicIsland
                  [dtIslandMode]="islandMode()"
                  dtIslandId="confirm-island"
                  class="island-anchor-wrapper"
                >
                  <button class="btn btn-danger" (click)="runConfirmationPrompt()">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

            <!-- Case 3: Music Playback Indicator -->
            <div class="island-card">
              <div class="card-header">
                <h4>System Diagnostic Connection</h4>
                <p>
                  Expands into a custom status monitor attached directly to the diagnostic action.
                </p>
              </div>
              <div class="card-body">
                <div
                  dtDynamicIsland
                  [dtIslandMode]="islandMode()"
                  dtIslandId="music-island"
                  class="island-anchor-wrapper"
                >
                  <button class="btn btn-info" (click)="toggleMusicPlayback()">
                    {{ isPlaying ? 'Stop Diagnostic' : 'Start Diagnostic' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p>Built with Angular and Motion. Pure spring equations for premium performance.</p>
      </footer>
    </div>

    <!-- Global Toast Viewport Component -->
    <dt-viewport [theme]="theme()" [position]="position()" [offset]="resolvedOffset()">
    </dt-viewport>
  `,
  styles: [
    `
      .app-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2.5rem 1.5rem;
      }

      .header {
        margin-bottom: 2rem;
        border-bottom: 1px solid var(--header-border);
        padding-bottom: 1.5rem;
      }

      .logo-area {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .logo-text-icon {
        font-size: 1.25rem;
        font-weight: 700;
        color: #ffffff;
        background: #3b82f6;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
      }

      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      .subtitle {
        color: var(--text-muted);
        font-size: 0.875rem;
        margin-top: 0.125rem;
      }

      .instructions-banner {
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: 10px;
        padding: 1.25rem;
        margin-bottom: 2rem;
      }

      .instructions-banner h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      .instructions-banner p {
        font-size: 0.875rem;
        color: var(--text-muted);
        margin-bottom: 0.75rem;
      }

      .instructions-banner ul {
        margin-left: 1.25rem;
        font-size: 0.875rem;
        color: var(--text-muted);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .grid-layout {
        display: grid;
        grid-template-columns: 1fr 1.75fr;
        gap: 1.5rem;
      }

      @media (max-width: 900px) {
        .grid-layout {
          grid-template-columns: 1fr;
        }
      }

      .wide-panel {
        grid-column: 1 / -1;
      }

      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      h3 {
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
      }

      .panel-desc {
        color: var(--text-muted);
        font-size: 0.825rem;
        margin-bottom: 1.25rem;
      }

      .control-group {
        margin-bottom: 1.25rem;
      }

      .control-group label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        margin-bottom: 0.375rem;
      }

      .theme-selector {
        display: flex;
        gap: 0.375rem;
        background: var(--theme-btn-bg);
        padding: 0.25rem;
        border-radius: 8px;
        border: 1px solid var(--panel-border);
      }

      .theme-selector button {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-muted);
        padding: 0.375rem;
        font-size: 0.8rem;
        font-weight: 500;
        border-radius: 6px;
        cursor: pointer;
        font-family: var(--font-family);
        transition: all 0.15s ease;
      }

      .theme-selector button.active {
        background: var(--theme-btn-active);
        color: var(--text-color);
        box-shadow: var(--theme-btn-active-shadow);
      }

      .select-input,
      .text-input,
      .textarea-input,
      .num-input {
        width: 100%;
        background: var(--input-bg);
        border: 1px solid var(--input-border);
        border-radius: 6px;
        color: var(--text-color);
        font-family: var(--font-family);
        padding: 0.5rem 0.75rem;
        font-size: 0.85rem;
        outline: none;
      }

      .select-input:focus,
      .text-input:focus,
      .textarea-input:focus,
      .num-input:focus {
        border-color: var(--accent-color);
      }

      .offset-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .offset-inputs span {
        display: block;
        font-size: 0.7rem;
        color: var(--text-muted);
        margin-bottom: 0.125rem;
      }

      .btn-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      @media (max-width: 600px) {
        .btn-grid {
          grid-template-columns: 1fr;
        }
      }

      .divider {
        border: 0;
        height: 1px;
        background: var(--panel-border);
        margin: 1.5rem 0;
      }

      .custom-toast-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .textarea-input {
        resize: vertical;
        min-height: 60px;
      }

      .global-actions {
        margin-top: 1.25rem;
        display: flex;
        justify-content: flex-end;
      }

      .danger-text {
        color: #ef4444;
      }
      .danger-text:hover {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.15);
      }

      .island-showcase-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
        margin-top: 1.25rem;
      }

      .island-card {
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: 10px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 180px;
      }

      .island-card h4 {
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 0.125rem;
      }

      .island-card p {
        font-size: 0.775rem;
        color: var(--text-muted);
        margin-bottom: 1rem;
      }

      .card-body {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0.75rem 0;
      }

      .island-anchor-wrapper {
        display: inline-block;
      }

      .footer {
        text-align: center;
        margin-top: 4rem;
        padding: 1.5rem 0;
        color: var(--text-muted);
        font-size: 0.75rem;
        border-top: 1px solid var(--card-border);
      }
    `,
  ],
})
export class App {
  private toastService = inject(DynamicToastService);
  private document = inject(DOCUMENT);

  // States
  theme = signal<DynamicToastTheme>('light');
  islandMode = signal<'island' | 'inline'>('island');
  position = signal<DynamicToastPosition>('top-right');
  toastOffsetTop = signal(16);
  toastOffsetBottom = signal(16);

  customTitle = '';
  customDesc = '';
  isPlaying = false;

  resolvedOffset = computed(() => {
    return {
      top: `${this.toastOffsetTop()}px`,
      bottom: `${this.toastOffsetBottom()}px`,
      left: '16px',
      right: '16px',
    };
  });

  constructor() {
    const body = this.document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
  }

  // Action methods
  triggerSuccess() {
    this.toastService.success('Database sync complete', {
      description: 'All local transactions successfully synchronized with replica-us-east.',
      duration: 4000,
    });
  }

  triggerError() {
    this.toastService.error('Deployment failed', {
      description: 'Production deploy failed at step "Build Assets" due to webpack exit code 1.',
      duration: 5000,
    });
  }

  triggerInfo() {
    this.toastService.info('System maintenance', {
      description: 'Scheduled maintenance will commence on Sunday at 02:00 UTC.',
      duration: 4000,
    });
  }

  triggerWarning() {
    this.toastService.warning('API Rate limits', {
      description: 'Client requests have reached 85% of allowed volume for the current window.',
      duration: 4500,
    });
  }

  triggerLoading() {
    const toastId = this.toastService.loading('Compiling code bundle...', {
      description: 'Optimizing tree-shaking modules (48%)',
    });

    // Simulate completion
    setTimeout(() => {
      this.toastService.update(toastId, {
        state: 'success',
        title: 'Bundle compiled',
        description: 'Production build complete. Output size is 142KB.',
        duration: 3000,
      });
    }, 2000);
  }

  triggerActionToast() {
    const toastId = this.toastService.success('Record removed', {
      description: 'Transaction #89284 has been successfully archived.',
      duration: 6000,
      button: {
        title: 'Undo',
        onClick: () => {
          this.toastService.info('Action reverted', {
            description: 'Transaction #89284 has been restored to active database ledger.',
            duration: 3000,
          });
          this.toastService.dismiss(toastId);
        },
      },
    });
  }

  triggerCustom() {
    if (!this.customTitle.trim()) {
      this.toastService.error('Input Required', {
        description: 'Please enter a title to launch a custom toast.',
      });
      return;
    }
    this.toastService.show({
      title: this.customTitle,
      description: this.customDesc || undefined,
      state: 'info',
      duration: 4000,
    });
  }

  clearAll() {
    this.toastService.clear();
  }

  // Dynamic Island Simulations
  runSaveSimulation() {
    const islandToastId = this.toastService.loading('Saving details...', {
      anchorId: 'save-island',
      duration: 999999, // persist while active
    });

    setTimeout(() => {
      this.toastService.update(islandToastId, {
        state: 'success',
        title: 'Configuration saved',
        description: 'Global system variables written to cloud vault.',
        duration: 2500,
      });
    }, 2500);
  }

  runConfirmationPrompt() {
    const confirmToastId = this.toastService.warning('Confirm delete environment?', {
      anchorId: 'confirm-island',
      description: 'All stack resources will be permanently removed.',
      duration: 999999, // Keep open for interaction
      button: {
        title: 'Confirm',
        onClick: () => {
          this.toastService.update(confirmToastId, {
            state: 'success',
            title: 'Environment stack deleted',
            description: 'Resources released.',
            duration: 3000,
          });
        },
      },
    });
  }

  toggleMusicPlayback() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.toastService.info('Running diagnostic suite...', {
        anchorId: 'music-island',
        description: 'Latency check: 14ms • Thread: 12% • Node active',
        duration: 999999, // Persist while active
        button: {
          title: 'Stop',
          onClick: () => {
            this.toggleMusicPlayback();
          },
        },
      });
    } else {
      this.toastService.info('Diagnostic suite stopped', {
        anchorId: 'music-island',
        description: 'Gateway telemetry connection suspended.',
        duration: 2500,
      });
    }
  }
}
