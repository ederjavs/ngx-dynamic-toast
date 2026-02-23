# ngx-dynamic-toast

An elegant, liquid-smooth toast notification library for Angular, heavily inspired by the beautiful [Sileo](https://github.com/hiaaryan/sileo) project. This is an attempt to port its fluid animations and API to the Angular ecosystem.

## Credits & Inspiration

The original concept, design, CSS animations (including the gooey SVG filter), and API structure are credited to **Aryan Hia** and the amazing work on the [Sileo](https://github.com/hiaaryan/sileo) repository. This package aims to bring that precise aesthetic and DX (Developer Experience) to Angular developers.

## Installation

```bash
npm install ngx-dynamic-toast
```

## Basic Usage

Inject the `DynamicToastService` into your component and start firing toasts!

```ts
import { Component, inject } from "@angular/core";
import { DynamicToastService } from "ngx-dynamic-toast";

@Component({
  selector: "app-root",
  standalone: true,
  template: `<button (click)="showToast()">Show Toast</button>`,
})
export class AppComponent {
  private toastService = inject(DynamicToastService);

  showToast() {
    this.toastService.success("Hello World!", {
      description: "This is a beautifully animated toast notification.",
    });
  }
}
```

## License

MIT - See the Sileo repository for original conceptual licensing.
