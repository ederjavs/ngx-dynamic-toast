import {
  Directive,
  ElementRef,
  inject,
  input,
  OnInit,
  OnDestroy,
  Renderer2,
  ComponentRef,
  ViewContainerRef,
  computed,
  effect,
  signal,
  ChangeDetectorRef,
  NgZone,
  Injector
} from "@angular/core";
import { DynamicToastService } from "./dynamic-toast.service";
import { DynamicToastComponent } from "./dynamic-toast.component";
import type { DynamicToastItem, DynamicToastTheme, DynamicIslandMode } from "./types";

@Directive({
  selector: "[dtDynamicIsland]",
  standalone: true,
})
export class DynamicIslandDirective implements OnInit, OnDestroy {
  /** The ID used to match toasts to this island anchor */
  dtIslandId = input.required<string>();

  /** Direction the toast expands: 'bottom' (default) or 'top' */
  dtIslandExpand = input<"top" | "bottom">("bottom");

  /** Theme override for this island */
  dtIslandTheme = input<DynamicToastTheme>("dark");

  /** The mode of the island: 'island' (border wrap) or 'inline' (element replacement) */
  dtIslandMode = input<DynamicIslandMode>("island");

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly service = inject(DynamicToastService);
  private readonly renderer = inject(Renderer2);
  private readonly vcr = inject(ViewContainerRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly injector = inject(Injector);

  private container: HTMLElement | null = null;
  private toastCompRef: ComponentRef<DynamicToastComponent> | null = null;
  private ro: ResizeObserver | null = null;

  /** Current toast bound to this island */
  private currentToast = signal<DynamicToastItem | null>(null);

  ngOnInit() {
    // Register this anchor with the service
    this.service.registerAnchor(this.dtIslandId(), this.el);

    // Mark the host element
    this.renderer.setAttribute(
      this.el.nativeElement,
      "data-dt-island",
      this.dtIslandId(),
    );

    // Create the overlay container
    this.container = this.renderer.createElement("div");
    this.renderer.setAttribute(this.container, "data-dt-island-container", "");
    this.renderer.setAttribute(this.container, "data-dt-viewport", "");
    this.renderer.setAttribute(
      this.container,
      "data-expand",
      this.dtIslandExpand(),
    );
    this.renderer.setAttribute(
      this.container,
      "data-theme",
      this.dtIslandTheme() === "system" ? "dark" : this.dtIslandTheme(),
    );

    // Insert container as sibling after the host
    const parent = this.el.nativeElement.parentNode;
    if (parent) {
      // Wrap host in a relative container if not already
      const wrapper = this.renderer.createElement("div");
      this.renderer.setStyle(wrapper, "position", "relative");
      this.renderer.setStyle(wrapper, "display", "inline-flex");
      this.renderer.setStyle(wrapper, "justify-content", "center");
      
      parent.insertBefore(wrapper, this.el.nativeElement);
      
      // Make the host element transition opacity smoothly
      this.renderer.setStyle(this.el.nativeElement, "position", "relative");
      this.renderer.setStyle(this.el.nativeElement, "z-index", "60");
      this.renderer.setStyle(
        this.el.nativeElement,
        "transition",
        "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      );
      
      wrapper.appendChild(this.el.nativeElement);
      
      // Put the container behind it initially
      this.renderer.setStyle(this.container, "z-index", "40");
      wrapper.appendChild(this.container!);
    }

    // Watch for toasts targeting this island
    effect(() => {
      const toasts = this.service.toasts();
      const islandId = this.dtIslandId();
      const match = toasts.find(
        (t) => t.anchorId === islandId && !t.exiting,
      );
      const exiting = toasts.find(
        (t) => t.anchorId === islandId && t.exiting,
      );

      this.ngZone.runOutsideAngular(() => {
        queueMicrotask(() => {
          if (match) {
            this.showToast(match);
          } else if (exiting) {
            this.updateToast(exiting);
          } else {
            this.hideToast();
          }
        });
      });
    }, { injector: this.injector });

    // Observe anchor size changes to update pill width
    this.ro = new ResizeObserver(() => {
      this.updateContainerPosition();
    });
    this.ro.observe(this.el.nativeElement);
  }

  private showToast(item: DynamicToastItem) {
    if (!this.container) return;

    const mode = this.dtIslandMode();

    if (mode === "inline") {
      this.renderer.addClass(this.el.nativeElement, "dt-island-inline-active");
      this.renderer.setStyle(this.el.nativeElement, "opacity", "0");
      this.renderer.setStyle(this.el.nativeElement, "pointer-events", "none");
      this.renderer.setStyle(this.container, "z-index", "60");
    } else {
      this.renderer.setStyle(this.el.nativeElement, "opacity", "1");
      this.renderer.setStyle(this.el.nativeElement, "pointer-events", "auto");
      this.renderer.setStyle(this.container, "z-index", "40");
    }

    if (!this.toastCompRef) {
      this.toastCompRef = this.vcr.createComponent(DynamicToastComponent);
      this.container.appendChild(
        this.toastCompRef.location.nativeElement,
      );

      // Subscribe to dismiss
      this.toastCompRef.instance.dismissed.subscribe((id: string) => {
        this.service.dismiss(id);
      });
    }

    // Update inputs
    this.toastCompRef.setInput("toast", item);
    this.toastCompRef.setInput("theme", this.dtIslandTheme() === "system" ? "dark" : this.dtIslandTheme());
    this.toastCompRef.setInput("pillAlign", "center");
    this.toastCompRef.setInput("expandEdge", this.dtIslandExpand());
    this.toastCompRef.setInput("canExpand", true);

    this.toastCompRef.changeDetectorRef.detectChanges();
    this.updateContainerPosition();
  }

  private updateToast(item: DynamicToastItem) {
    if (!this.toastCompRef) return;
    this.toastCompRef.setInput("toast", item);
    this.toastCompRef.changeDetectorRef.detectChanges();
  }

  private hideToast() {
    if (this.toastCompRef) {
      this.toastCompRef.destroy();
      this.toastCompRef = null;
    }
    if (this.container) {
      this.renderer.removeClass(this.el.nativeElement, "dt-island-inline-active");
      this.renderer.setStyle(this.el.nativeElement, "opacity", "1");
      this.renderer.setStyle(this.el.nativeElement, "pointer-events", "auto");
    }
  }

  private updateContainerPosition() {
    // Container is already positioned via CSS (absolute, centered)
    const anchorWidth = this.el.nativeElement.offsetWidth;
    const anchorHeight = this.el.nativeElement.offsetHeight;
    
    // We update the component to know about the anchor's dimensions so it can border it perfectly
    if (this.toastCompRef) {
      this.toastCompRef.setInput("anchorWidth", anchorWidth);
      this.toastCompRef.setInput("anchorHeight", anchorHeight);
    }
  }

  ngOnDestroy() {
    this.service.unregisterAnchor(this.dtIslandId());
    this.ro?.disconnect();
    this.hideToast();
  }
}
