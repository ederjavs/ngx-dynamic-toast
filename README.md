# ngx-dynamic-toast

An elegant, liquid-smooth notification library for Angular featuring spring-physics transitions and interactive Dynamic Island anchoring. Heavily inspired by the premium aesthetics of the [Sileo](https://github.com/hiaaryan/sileo) project, bringing fluid motion and state-swapping interfaces to the Angular ecosystem.

## Key Features

- **Liquid-Smooth Physics**: Powered by spring animations (`motion`), producing natural, elastic card expansions and fluid transformations.
- **Dynamic Island Anchoring**: Bind notifications to specific DOM elements (buttons, inputs, status indicators) using a declarative directive. The notification expands directly from and around the element.
- **Stateful Upgrades**: Instantly morph a loading toast into a success or error notification with gorgeous crossfade layer swaps.
- **System-Aware Theme Engine**: Seamlessly switch between Light, Dark, and System-preferred styles.
- **Developer-Centric DX**: Injectable service with complete type-safety.

---

## Installation

Install the package via npm along with its motion animation peer dependency:

```bash
npm install ngx-dynamic-toast motion
```

Add the global styles to your application's stylesheet configuration (e.g. `styles.css` or `angular.json` styles array):

```css
@import "ngx-dynamic-toast/styles.css";
```

---

## Setup & Initialization

Ensure the viewport component is present at your application's root template (typically `app.component.html`), and inject the global viewport styles.

### 1. Configure the Viewport in `app.component.ts`

```typescript
import { Component } from '@angular/core';
import { DynamicToastViewportComponent } from 'ngx-dynamic-toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DynamicToastViewportComponent],
  template: `
    <div class="main-layout">
      <!-- Your application route or contents -->
    </div>

    <!-- Global Toast Viewport -->
    <dt-viewport 
      theme="system" 
      position="top-right" 
      [offset]="{ top: '16px', right: '16px' }">
    </dt-viewport>
  `
})
export class AppComponent {}
```

### 2. Global Configuration via Dependency Injection Providers

You can configure global settings (such as theme, position, default durations, etc.) during application bootstrap using the `provideDynamicToast` provider function in your `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideDynamicToast } from 'ngx-dynamic-toast';

export const appConfig: ApplicationConfig = {
  providers: [
    // Configure default properties globally
    provideDynamicToast({
      theme: 'system',
      position: 'top-right',
      offset: { top: '24px', right: '24px' }
    })
  ]
};
```

---

## Basic Usage

Inject the `DynamicToastService` inside any component or service to trigger generic notifications.

```typescript
import { Component, inject } from '@angular/core';
import { DynamicToastService } from 'ngx-dynamic-toast';

@Component({
  selector: 'app-telemetry-trigger',
  standalone: true,
  template: `<button (click)="notifySync()">Sync Database</button>`
})
export class TelemetryTriggerComponent {
  private toast = inject(DynamicToastService);

  notifySync() {
    this.toast.success('Database sync complete', {
      description: 'All local transactions successfully synchronized with replica-us-east.',
      duration: 4000
    });
  }
}
```

---

## Advanced Usage

### 1. Stateful Async Loading & Upgrading

Launch a persistent loading toast and programmatically morph it upon resolution:

```typescript
import { Component, inject } from '@angular/core';
import { DynamicToastService } from 'ngx-dynamic-toast';

@Component({
  selector: 'app-bundle-compiler',
  standalone: true,
  template: `<button (click)="compileBundle()">Compile Bundle</button>`
})
export class BundleCompilerComponent {
  private toast = inject(DynamicToastService);

  compileBundle() {
    // 1. Trigger the persistent loading status
    const toastId = this.toast.loading('Compiling bundle...', {
      description: 'Optimizing modules (48%)'
    });

    // 2. Perform long-running asynchronous logic
    setTimeout(() => {
      // 3. Upgrade the toast directly to success
      this.toast.update(toastId, {
        state: 'success',
        title: 'Bundle compiled',
        description: 'Production build complete. Output size is 142KB.',
        duration: 3000
      });
    }, 2000);
  }
}
```

### 2. Dynamic Island Anchors

Warp notifications directly around specific interactive DOM elements. The target element remains perfectly nested and interactive inside the expanding card:

```typescript
import { Component, inject } from '@angular/core';
import { DynamicToastService, DynamicIslandDirective } from 'ngx-dynamic-toast';

@Component({
  selector: 'app-secure-vault',
  standalone: true,
  imports: [DynamicIslandDirective],
  template: `
    <!-- Bind directive with a unique identifier -->
    <div dtDynamicIsland dtIslandId="vault-anchor" class="anchor-container">
      <button (click)="saveConfigurations()">Save System Config</button>
    </div>
  `,
  styles: [`
    .anchor-container {
      display: inline-block;
      position: relative; /* Stacking context wrapper for island anchors */
    }
  `]
})
export class SecureVaultComponent {
  private toast = inject(DynamicToastService);

  saveConfigurations() {
    const toastId = this.toast.loading('Saving details...', {
      anchorId: 'vault-anchor',
      duration: 999999
    });

    setTimeout(() => {
      this.toast.update(toastId, {
        state: 'success',
        title: 'Configurations saved',
        description: 'Global system variables written to cloud vault.',
        duration: 2500
      });
    }, 2000);
  }
}
```


---

## Dismissing & Interaction

`ngx-dynamic-toast` provides multiple intuitive options to dismiss or interact with active notifications:

1. **Hover to Reveal Close (X) Button**: Hovering over an active toast smoothly fades in a micro-close `X` icon on the right side of the pill. Clicking this button immediately dismisses the toast.
2. **Elastic Swipe Gestures**: You can drag or flick any toast up or down using touch/pointer controls. Swiping past a threshold of `30px` triggers an elastic dismissal animation.
3. **Tactile Click Feedback**: Standard click actions on the toast trigger a subtle iOS-style `:active` scaling press feedback (`0.97` scale) to confirm the user's action before dismissal.

---

## API Reference

### `DynamicToastService`

| Method | Signature | Description |
| :--- | :--- | :--- |
| `success(title, options?)` | `string` | Fires a success notification |
| `error(title, options?)` | `string` | Fires an error notification |
| `info(title, options?)` | `string` | Fires an information notification |
| `warning(title, options?)` | `string` | Fires a warning notification |
| `loading(title, options?)` | `string` | Fires a persistent loading notification |
| `show(config)` | `string` | Fires a custom notification based on full config state |
| `update(id, config)` | `void` | Transitions an existing notification to a new state |
| `dismiss(id)` | `void` | Dismisses a specific notification |
| `clear()` | `void` | Dismisses all active notifications |

### `DynamicToastOptions`

```typescript
export interface DynamicToastOptions {
  description?: string;
  duration?: number; // ms
  anchorId?: string; // Target Dynamic Island anchor ID
  button?: {
    title: string;
    onClick: () => void;
  };
}
```

---

## Design Customization

The layout leverages CSS custom properties for effortless theme integration. You can overwrite these variables globally:

```css
:root {
  --dt-font-sans: 'Inter', sans-serif;
  --dt-radius-pill: 16px;
  --dt-color-success: #10b981;
  --dt-color-error: #ef4444;
  --dt-color-info: #06b6d4;
  --dt-color-warning: #f59e0b;
}
```

---

## Credits & Inspiration

The original concept, styling formulas, custom SVG gooey filter transitions, and API architectures are credited to **Aryan Hia** and the amazing work on the [Sileo](https://github.com/hiaaryan/sileo) project. This library brings that precise level of UI engineering and developer experience to Angular.

## License

This project is licensed under the MIT License.
