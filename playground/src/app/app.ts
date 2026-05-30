import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DynamicToastViewportComponent,
  DynamicToastService,
  DynamicIslandDirective,
  DynamicToastTheme,
  DynamicToastPosition
} from 'ngx-dynamic-toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DynamicToastViewportComponent,
    DynamicIslandDirective
  ],
  template: `
    <div class="app-container">
      <!-- Ambient decorative gradient shapes -->
      <div class="blob-1"></div>
      <div class="blob-2"></div>

      <!-- Main Layout -->
      <header class="header">
        <div class="logo-area">
          <div class="logo-icon">🏝️</div>
          <div>
            <h1>ngx-dynamic-toast</h1>
            <p class="subtitle">Liquid-smooth spring-physics notifications & Dynamic Islands for Angular</p>
          </div>
        </div>
        <div class="badge">Inspired by Sileo</div>
      </header>

      <main class="grid-layout">
        <!-- Configuration Control Panel -->
        <section class="glass-panel config-panel">
          <h2>Viewport Configuration</h2>
          <p class="panel-desc">Customize the global viewport behavior. These configurations apply to non-anchored (generic) toasts.</p>

          <div class="control-group">
            <label>Theme</label>
            <div class="theme-selector">
              <button 
                [class.active]="theme() === 'dark'" 
                (click)="theme.set('dark')">
                🌙 Dark
              </button>
              <button 
                [class.active]="theme() === 'light'" 
                (click)="theme.set('light')">
                ☀️ Light
              </button>
              <button 
                [class.active]="theme() === 'system'" 
                (click)="theme.set('system')">
                💻 System
              </button>
            </div>
          </div>

          <div class="control-group">
            <label>Global Position</label>
            <select [ngModel]="position()" (ngModelChange)="position.set($event)" class="select-input">
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
                <input type="number" [ngModel]="toastOffsetTop()" (ngModelChange)="toastOffsetTop.set($event)" class="num-input" />
              </div>
              <div>
                <span>Bottom</span>
                <input type="number" [ngModel]="toastOffsetBottom()" (ngModelChange)="toastOffsetBottom.set($event)" class="num-input" />
              </div>
            </div>
          </div>
        </section>

        <!-- Standard Toasts Panel -->
        <section class="glass-panel action-panel">
          <h2>Generic Notifications</h2>
          <p class="panel-desc">Trigger high-fidelity spring animated toasts with beautiful gooey entry transitions.</p>

          <div class="btn-grid">
            <button class="btn btn-success" (click)="triggerSuccess()">
              <span>🟢</span> Success Toast
            </button>
            <button class="btn btn-danger" (click)="triggerError()">
              <span>🔴</span> Error Toast
            </button>
            <button class="btn btn-info" (click)="triggerInfo()">
              <span>🔵</span> Info Toast
            </button>
            <button class="btn btn-warning" (click)="triggerWarning()">
              <span>🟡</span> Warning Toast
            </button>
            <button class="btn btn-secondary" (click)="triggerLoading()">
              <span>⏳</span> Loading (Async Resolve)
            </button>
            <button class="btn btn-secondary" (click)="triggerActionToast()">
              <span>🔄</span> Toast with Undo Action
            </button>
          </div>

          <hr class="divider" />

          <h3>Create Custom Toast</h3>
          <div class="custom-toast-form">
            <input type="text" [(ngModel)]="customTitle" placeholder="Toast Title..." class="text-input" />
            <textarea [(ngModel)]="customDesc" placeholder="Toast Description (optional)..." class="textarea-input"></textarea>
            <button class="btn btn-primary" (click)="triggerCustom()">
              🚀 Launch Custom Toast
            </button>
          </div>

          <div class="global-actions">
            <button class="btn btn-secondary danger-text" (click)="clearAll()">
              🗑️ Clear All Toasts
            </button>
          </div>
        </section>

        <!-- Dynamic Island / Element-Anchored Toasts Panel -->
        <section class="glass-panel action-panel wide-panel">
          <h2>Dynamic Island Anchors</h2>
          <p class="panel-desc">
            Toasts will warp and expand **directly around the button or element** that triggered them, just like the iOS Dynamic Island! 
            The element remains perfectly active and styled inside the card.
          </p>

          <div class="island-showcase-grid">
            <!-- Case 1: Save Action -->
            <div class="island-card">
              <div class="card-header">
                <h4>Dynamic Saving State</h4>
                <p>Anchors a loading toast that completes and transforms into a success checkmark.</p>
              </div>
              <div class="card-body">
                <div dtDynamicIsland dtIslandId="save-island" class="island-anchor-wrapper">
                  <button class="btn btn-primary" (click)="runSaveSimulation()">
                    💾 Save Document
                  </button>
                </div>
              </div>
            </div>

            <!-- Case 2: Confirmation Modal inside Toast -->
            <div class="island-card">
              <div class="card-header">
                <h4>In-Context Action Confirmation</h4>
                <p>Launches a danger toast directly surrounding the button, prompting the user for instant confirmation.</p>
              </div>
              <div class="card-body">
                <div dtDynamicIsland dtIslandId="confirm-island" class="island-anchor-wrapper">
                  <button class="btn btn-danger" (click)="runConfirmationPrompt()">
                    ⚠️ Delete Account
                  </button>
                </div>
              </div>
            </div>

            <!-- Case 3: Music Playback Indicator -->
            <div class="island-card">
              <div class="card-header">
                <h4>Media Status Controller</h4>
                <p>Expands into a fully custom floating notification directly attached to a card layout.</p>
              </div>
              <div class="card-body">
                <div dtDynamicIsland dtIslandId="music-island" class="island-anchor-wrapper">
                  <button class="btn btn-info" (click)="toggleMusicPlayback()">
                    🎵 {{ isPlaying ? 'Pause Track' : 'Play Music Track' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p>Built with Angular & Motion JS. 100% custom spring equations.</p>
      </footer>
    </div>

    <!-- Global Toast Viewport Component -->
    <dt-viewport 
      [theme]="theme()" 
      [position]="position()" 
      [offset]="resolvedOffset()">
    </dt-viewport>
  `,
  styles: [`
    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      position: relative;
      z-index: 1;
    }

    /* Ambient animated blobs */
    .blob-1, .blob-2 {
      position: fixed;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      filter: blur(100px);
      z-index: -1;
      opacity: var(--blob-opacity, 0.12);
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .blob-1 {
      top: -100px;
      left: -100px;
      background: #4f46e5;
    }
    .blob-2 {
      bottom: -100px;
      right: -100px;
      background: #06b6d4;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
      border-bottom: 1px solid var(--header-border);
      padding-bottom: 1.5rem;
      transition: border-bottom-color 0.3s ease;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo-icon {
      font-size: 2.5rem;
      background: var(--card-bg);
      padding: 0.5rem;
      border-radius: 16px;
      border: 1px solid var(--card-border);
      transition: background 0.3s ease, border-color 0.3s ease;
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, var(--text-color), var(--text-muted));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      transition: color 0.3s ease;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-top: 0.25rem;
      transition: color 0.3s ease;
    }

    .badge {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.25);
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .grid-layout {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 2rem;
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
      font-size: 1.35rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text-color);
      transition: color 0.3s ease;
    }

    h3 {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 1rem;
      color: var(--text-color);
      transition: color 0.3s ease;
    }

    .panel-desc {
      color: var(--text-muted);
      font-size: 0.88rem;
      margin-bottom: 1.5rem;
      transition: color 0.3s ease;
    }

    .control-group {
      margin-bottom: 1.5rem;
    }

    .control-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .theme-selector {
      display: flex;
      gap: 0.5rem;
      background: var(--theme-btn-bg);
      padding: 0.25rem;
      border-radius: 12px;
      border: 1px solid var(--panel-border);
      transition: background 0.3s ease, border-color 0.3s ease;
    }

    .theme-selector button {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.5rem;
      font-size: 0.85rem;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      font-family: var(--font-family);
      transition: all 0.2s ease;
    }

    .theme-selector button.active {
      background: var(--theme-btn-active);
      color: var(--text-color);
      box-shadow: var(--theme-btn-active-shadow);
    }

    .select-input, .text-input, .textarea-input, .num-input {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 10px;
      color: var(--text-color);
      font-family: var(--font-family);
      padding: 0.7rem 1rem;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s ease, background 0.3s ease, color 0.3s ease;
    }

    .select-input:focus, .text-input:focus, .textarea-input:focus, .num-input:focus {
      border-color: var(--accent-color);
    }

    .offset-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .offset-inputs span {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .btn-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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
      margin: 2rem 0;
      transition: background 0.3s ease;
    }

    .custom-toast-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .textarea-input {
      resize: vertical;
      min-height: 80px;
    }

    .global-actions {
      margin-top: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }

    .danger-text {
      color: #f87171;
    }
    .danger-text:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
    }

    /* Island cards layout */
    .island-showcase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .island-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 200px;
      transition: background 0.3s ease, border-color 0.3s ease;
    }

    .island-card h4 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 0.25rem;
      transition: color 0.3s ease;
    }

    .island-card p {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
      transition: color 0.3s ease;
    }

    .card-body {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem 0;
    }

    .island-anchor-wrapper {
      display: inline-block;
    }

    .footer {
      text-align: center;
      margin-top: 5rem;
      padding: 2rem 0;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--card-border);
      transition: border-color 0.3s ease, color 0.3s ease;
    }
  `]
})
export class App {
  private toastService = inject(DynamicToastService);
  private document = inject(DOCUMENT);

  // States
  theme = signal<DynamicToastTheme>('light');
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
      right: '16px'
    };
  });

  constructor() {
    effect(() => {
      const currentTheme = this.theme();
      const body = this.document.body;
      body.classList.remove('light-theme', 'dark-theme');
      if (currentTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
      } else {
        body.classList.add(`${currentTheme}-theme`);
      }
    });
  }

  // Action methods
  triggerSuccess() {
    this.toastService.success('Task Completed Successfully', {
      description: 'Your changes have been correctly saved to the centralized repository.',
      duration: 4000
    });
  }

  triggerError() {
    this.toastService.error('Build Verification Failed', {
      description: 'The unit tests failed with exit code 1. Check compiler logs.',
      duration: 5000
    });
  }

  triggerInfo() {
    this.toastService.info('Update Available', {
      description: 'A newer stable version (v1.4.2) of this toast library is available.',
      duration: 4000
    });
  }

  triggerWarning() {
    this.toastService.warning('High Resource Latency', {
      description: 'We are noticing slower response times from your database region.',
      duration: 4500
    });
  }

  triggerLoading() {
    const toastId = this.toastService.loading('Syncing files to server...', {
      description: 'Uploading asset bundles (48%)'
    });

    // Simulate completion
    setTimeout(() => {
      this.toastService.update(toastId, {
        state: 'success',
        title: 'Assets Synchronized',
        description: 'Successfully uploaded 4 files in 1.8s.',
        duration: 3000
      });
    }, 2000);
  }

  triggerActionToast() {
    const toastId = this.toastService.success('Conversation Deleted', {
      description: 'You can restore this within the next 30 days.',
      duration: 6000,
      button: {
        title: 'Undo Action',
        onClick: () => {
          this.toastService.info('Deletion Cancelled', {
            description: 'The conversation was completely restored.',
            duration: 3000
          });
          this.toastService.dismiss(toastId);
        }
      }
    });
  }

  triggerCustom() {
    if (!this.customTitle.trim()) {
      this.toastService.error('Input Required', {
        description: 'Please enter a title to launch a custom toast.'
      });
      return;
    }
    this.toastService.show({
      title: this.customTitle,
      description: this.customDesc || undefined,
      state: 'info',
      duration: 4000
    });
  }

  clearAll() {
    this.toastService.clear();
  }

  // Dynamic Island Simulations
  runSaveSimulation() {
    const islandToastId = this.toastService.loading('Saving details...', {
      anchorId: 'save-island',
      duration: 999999 // persist while active
    });

    setTimeout(() => {
      this.toastService.update(islandToastId, {
        state: 'success',
        title: 'Successfully Saved',
        description: 'Document compiled & synchronized.',
        duration: 2500
      });
    }, 2500);
  }

  runConfirmationPrompt() {
    const confirmToastId = this.toastService.warning('Confirm Account Deletion?', {
      anchorId: 'confirm-island',
      description: 'This operation is absolute and cannot be undone.',
      duration: 999999, // Keep open for interaction
      button: {
        title: 'Confirm',
        onClick: () => {
          this.toastService.update(confirmToastId, {
            state: 'success',
            title: 'Account Scheduled for Deletion',
            description: 'Data purging process started.',
            duration: 3000
          });
        }
      }
    });
  }

  toggleMusicPlayback() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.toastService.info('Now Playing: "Starlight Spring"', {
        anchorId: 'music-island',
        description: 'Vibe & Coding playlist • 03:42 remaining',
        duration: 5000,
        button: {
          title: 'Pause',
          onClick: () => {
            this.toggleMusicPlayback();
          }
        }
      });
    } else {
      this.toastService.info('Music Playback Paused', {
        anchorId: 'music-island',
        description: 'Vibe playlist',
        duration: 2500
      });
    }
  }
}
