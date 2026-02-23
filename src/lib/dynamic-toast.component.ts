import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
  untracked,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import {
  BLUR_RATIO,
  DEFAULT_ROUNDNESS,
  HEADER_EXIT_MS,
  HEIGHT,
  MIN_EXPAND_RATIO,
  PILL_PADDING,
  SWAP_COLLAPSE_MS,
  WIDTH,
} from "./constants";
import { ICONS } from "./icons";
import type {
  DynamicToastItem,
  DynamicToastState,
  DynamicToastStyles,
} from "./types";

type PillAlign = "left" | "center" | "right";
type ExpandEdge = "top" | "bottom";

interface View {
  title?: string;
  description?: string;
  state: DynamicToastState;
  iconSvg?: string | null;
  styles?: DynamicToastStyles;
  button?: { title: string; onClick: () => void };
  fill: string;
  contentTemplate?: any;
}

interface HeaderLayer {
  key: string;
  view: View;
}

@Component({
  selector: "dt-toast",
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: "./dynamic-toast.component.html",
})
export class DynamicToastComponent implements OnDestroy {
  toast = input.required<DynamicToastItem>();
  pillAlign = input<PillAlign>("left");
  expandEdge = input<ExpandEdge>("bottom");
  canExpand = input<boolean>(true);
  interruptKey = input<string | undefined>(undefined);
  dismissed = output<string>();
  entered = output<string>();
  left = output<string>();

  readonly HEIGHT = HEIGHT;
  readonly WIDTH = WIDTH;

  private readonly sanitizer = inject(DomSanitizer);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  private hasMeasured = false;
  private roHeader: ResizeObserver | null = null;
  private roContent: ResizeObserver | null = null;
  private headerExitTimer: number | null = null;
  private autoExpandTimer: number | null = null;
  private autoCollapseTimer: number | null = null;
  private swapTimer: number | null = null;
  private lastRefreshKey: string | undefined;
  private pendingSwap: { key?: string; payload: View } | null = null;
  private pointerStartY: number | null = null;

  ready = signal(false);
  isExpanded = signal(true); // Default to expanded if description exists
  pillWidth = signal(0);
  contentHeight = signal(0);

  // view = signal<View>({
  //   title: "",
  //   description: "",
  //   state: "success",
  //   iconSvg: null,
  //   fill: "#FFFFFF",
  // });

  // Use a default toast state to avoid NG0950 during initialization
  view = computed<View>(() => {
    try {
      const t = this.toast();
      return {
        title: t.title,
        description: t.description,
        contentTemplate: t.contentTemplate,
        state: t.state,
        iconSvg: t.iconSvg,
        styles: t.styles,
        button: t.button,
        fill: t.fill ?? "#151515",
      };
    } catch (e) {
      // Return safe default if input is not yet bound
      return {
        title: "",
        state: "info",
        fill: "#151515",
      };
    }
  });

  // headerLayerCurrent = signal<HeaderLayer>({
  //   key: "",
  //   view: this.view(),
  // });

  // headerLayerPrev = signal<HeaderLayer | null>(null);

  filterId = `dt-gooey-${Math.random().toString(36).slice(2, 8)}`;

  hasDesc = computed(() => {
    const v = this.view();
    return (
      Boolean(v.description) || Boolean(v.contentTemplate) || Boolean(v.button)
    );
  });

  isLoading = computed(() => this.view().state === "loading");

  allowExpand = computed(() => {
    if (this.isLoading()) return false;
    const interrupt = this.interruptKey();
    const id = this.toast().id;
    return this.canExpand() ?? (!interrupt || interrupt === id);
  });

  open = computed(
    () => this.hasDesc() && this.isExpanded() && !this.isLoading(),
  );

  resolvedRoundness = computed(() => {
    try {
      return Math.max(0, this.toast().roundness ?? DEFAULT_ROUNDNESS);
    } catch {
      return DEFAULT_ROUNDNESS;
    }
  });

  blur = computed(() => this.resolvedRoundness() * BLUR_RATIO);

  minExpanded = computed(() => HEIGHT * MIN_EXPAND_RATIO);

  rawExpanded = computed(() => {
    const min = this.minExpanded();
    try {
      if (!this.hasDesc()) return min;
      return Math.max(min, HEIGHT + this.contentHeight());
    } catch {
      return min;
    }
  });

  frozenExpanded = signal(HEIGHT * MIN_EXPAND_RATIO);

  expanded = computed(() =>
    this.open() ? this.rawExpanded() : this.frozenExpanded(),
  );
  svgHeight = computed(() =>
    this.hasDesc() ? Math.max(this.expanded(), this.minExpanded()) : HEIGHT,
  );
  expandedContent = computed(() => Math.max(0, this.expanded() - HEIGHT));
  resolvedPillWidth = computed(() =>
    Math.max(this.pillWidth() || HEIGHT, HEIGHT),
  );
  pillHeight = computed(() => HEIGHT + this.blur() * 3);

  pillX = computed(() => {
    const w = this.resolvedPillWidth();
    const pos = this.pillAlign();
    if (pos === "right") return WIDTH - w;
    if (pos === "center") return (WIDTH - w) / 2;
    return 0;
  });

  pillPath = computed(() => {
    const w = this.resolvedPillWidth();
    const h = HEIGHT;
    const r = this.resolvedRoundness();
    const align = this.pillAlign();
    const open = this.open();
    const x = this.pillX();

    // Helper for rounded corner arc relative
    const arc = (dx: number, dy: number) => `a ${r} ${r} 0 0 1 ${dx} ${dy}`;

    let d = "";

    // Start at Top-Left of the pill (relative to x)
    // We'll draw in absolute coordinates or relative? Path commands usually absolute M x y is easiest.

    // Top Left Corner
    d += `M ${x} ${h - r}`; // Start before top-left corner? No, let's start top-left.
    // Actually, standard rect path:
    // Move to x, y+r
    // Arc to x+r, y
    // Line to x+w-r, y
    // Arc to x+w, y+r
    // Line to x+w, y+h-r
    // Arc to x+w-r, y+h
    // Line to x+r, y+h
    // Arc to x, y+h-r
    // Close

    // Top Left
    d += `M ${x} ${r} ${arc(r, -r)}`;

    // Top Right
    d += `L ${x + w - r} 0 ${arc(r, r)}`;

    // Bottom Right
    if (open && align === "right") {
      d += `L ${x + w} ${h}`; // Sharp corner
    } else {
      d += `L ${x + w} ${h - r} ${arc(-r, r)}`; // Rounded
    }

    // Bottom Left
    if (open && align === "left") {
      d += `L ${x} ${h}`; // Sharp corner
    } else {
      d += `L ${x + r} ${h} ${arc(-r, -r)}`; // Rounded
    }

    d += "Z";
    return d;
  });

  headerTransform = computed(() => {
    const open = this.open();
    const expand = this.expandEdge();
    const ty = open ? (expand === "bottom" ? 3 : -3) : 0;
    const scale = open ? 0.9 : 1;
    return `translateY(${ty}px) scale(${scale})`;
  });

  bodyPath = computed(() => {
    const w = WIDTH;
    const h = this.open() ? this.expandedContent() : 0;
    const r = this.resolvedRoundness();
    const y = HEIGHT - 1; // 1px overlap to ensure connection
    const align = this.pillAlign();

    if (h <= 0) return "";

    // Helper for rounded corner arc
    // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    const arc = (dx: number, dy: number) => `a ${r} ${r} 0 0 1 ${dx} ${dy}`;

    let d = "";

    // Top Left
    if (align === "left") {
      d += `M 0 ${y}`; // Sharp corner
    } else {
      d += `M 0 ${y + r} ${arc(r, -r)}`; // Rounded start
    }

    // Top Right
    if (align === "right") {
      d += `L ${w} ${y}`; // Sharp line to corner
    } else {
      d += `L ${w - r} ${y} ${arc(r, r)}`; // Line then rounded
    }

    // Bottom Right (Always rounded)
    d += `L ${w} ${y + h - r} ${arc(-r, r)}`;

    // Bottom Left (Always rounded)
    d += `L ${r} ${y + h} ${arc(-r, -r)}`;

    // Close path
    d += "Z";

    return d;
  });

  constructor() {
    // If no description, collapse immediately
    effect(
      () => {
        if (!this.hasDesc()) {
          this.isExpanded.set(false);
        } else {
          // If has description, start expanded by default
          // But we might want to respect auto-collapse later
          this.isExpanded.set(true);
        }
      },
      { allowSignalWrites: true },
    );

    queueMicrotask(() => {
      this.ready.set(true);
      this.ensureMeasurements();
    });
  }

  // private applyView(next: View) {
  //   const prev = this.view();
  //   const headerKey = `${next.state}-${next.title}`;
  //   const prevKey = `${prev.state}-${prev.title}`;

  //   this.view.set(next);

  //   if (headerKey !== prevKey) {
  //     const currentLayer: HeaderLayer = { key: headerKey, view: next };
  //     const prevLayer: HeaderLayer = { key: prevKey, view: prev };
  //     this.headerLayerPrev.set(prevLayer);
  //     this.headerLayerCurrent.set(currentLayer);

  //     if (this.headerExitTimer) window.clearTimeout(this.headerExitTimer);
  //     this.headerExitTimer = window.setTimeout(() => {
  //       this.headerExitTimer = null;
  //       this.headerLayerPrev.set(null);
  //     }, HEADER_EXIT_MS);
  //   } else {
  //     this.headerLayerCurrent.set({ key: headerKey, view: next });
  //   }
  // }

  ngOnDestroy() {
    this.roHeader?.disconnect();
    this.roContent?.disconnect();
    if (this.headerExitTimer) window.clearTimeout(this.headerExitTimer);
    if (this.autoExpandTimer) window.clearTimeout(this.autoExpandTimer);
    if (this.autoCollapseTimer) window.clearTimeout(this.autoCollapseTimer);
    if (this.swapTimer) window.clearTimeout(this.swapTimer);
  }

  private ensureMeasurements() {
    if (this.hasMeasured) return;
    this.hasMeasured = true;

    const root = this.hostEl.nativeElement;
    const inner = root.querySelector<HTMLElement>(
      "[data-dt-header-inner][data-layer='current']",
    );
    const header = root.querySelector<HTMLElement>("[data-dt-header]");
    const content = root.querySelector<HTMLElement>("[data-dt-description]");
    if (!inner || !header) return;

    // Throttled measurement
    let rafHeader: number | null = null;
    const measureHeader = () => {
      if (rafHeader) return;
      // Run outside angular to avoid infinite CD loops from RO
      this.ngZone.runOutsideAngular(() => {
        rafHeader = requestAnimationFrame(() => {
          rafHeader = null;
          const cs = getComputedStyle(header);
          const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
          const w = inner.scrollWidth + pad + PILL_PADDING;
          // Only update if difference is significant to stop 1px loops
          if (Math.abs(w - this.pillWidth()) > 1.5) {
            this.pillWidth.set(w);
            this.cdr.detectChanges(); // Local detect changes only
          }
        });
      });
    };

    let rafContent: number | null = null;
    const measureContent = () => {
      const el = root.querySelector<HTMLElement>("[data-dt-description]");
      if (!el) return;
      if (rafContent) return;
      this.ngZone.runOutsideAngular(() => {
        rafContent = requestAnimationFrame(() => {
          rafContent = null;
          if (Math.abs(el.scrollHeight - this.contentHeight()) > 1.5) {
            this.contentHeight.set(el.scrollHeight);
            this.cdr.detectChanges();
          }
        });
      });
    };

    measureHeader();
    measureContent();

    this.roHeader = new ResizeObserver(() => measureHeader());
    this.roHeader.observe(inner);

    if (content) {
      this.roContent = new ResizeObserver(() => measureContent());
      this.roContent.observe(content);
    }
  }

  resolvedIcon(v: View): SafeHtml {
    const icon =
      v.iconSvg ??
      (v.state === "success"
        ? ICONS.check
        : v.state === "loading"
          ? ICONS.loaderCircle('data-dt-icon="spin" aria-hidden="true"')
          : v.state === "error"
            ? ICONS.x
            : v.state === "warning"
              ? ICONS.circleAlert
              : v.state === "info"
                ? ICONS.lifeBuoy
                : ICONS.arrowRight);
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  handleEnter() {
    this.entered.emit(this.toast().id);
    if (this.hasDesc()) this.isExpanded.set(true);
  }

  handleLeave() {
    this.left.emit(this.toast().id);
    this.isExpanded.set(false);
  }

  handleTransitionEnd(e: TransitionEvent) {
    if (e.propertyName !== "height" && e.propertyName !== "transform") return;
    if (this.open()) return;
    const pending = this.pendingSwap;
    if (!pending) return;
    if (this.swapTimer) {
      window.clearTimeout(this.swapTimer);
      this.swapTimer = null;
    }
    // this.applyView(pending.payload);
    this.pendingSwap = null;
  }

  handleButtonClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.view().button?.onClick();
  }

  handlePointerDown(e: PointerEvent) {
    if (this.toast().exiting) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-dt-button]")) return;

    this.pointerStartY = e.clientY;
    const el = e.currentTarget as HTMLElement;
    const SWIPE_DISMISS = 30;
    const SWIPE_MAX = 20;

    const onMove = (ev: PointerEvent) => {
      if (this.pointerStartY == null) return;
      const dy = ev.clientY - this.pointerStartY;
      const sign = dy > 0 ? 1 : -1;
      const clamped = Math.min(Math.abs(dy), SWIPE_MAX) * sign;
      el.style.transform = `translateY(${clamped}px)`;
    };

    const onUp = (ev: PointerEvent) => {
      if (this.pointerStartY == null) return;
      const dy = ev.clientY - this.pointerStartY;
      this.pointerStartY = null;
      el.style.transform = "";
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      if (Math.abs(dy) > SWIPE_DISMISS) {
        this.dismissed.emit(this.toast().id);
      } else if (Math.abs(dy) < 5) {
        // It's a tap
        this.handleTap();
      }
    };

    el.setPointerCapture(e.pointerId);
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerup", onUp, { passive: true });
  }

  private handleTap() {
    if (this.hasDesc()) {
      if (this.isExpanded()) {
        // 1 click to collapse if it has description and is open
        this.isExpanded.set(false);
      } else {
        // If already collapsed, another click closes the toast
        this.dismissed.emit(this.toast().id);
      }
    } else {
      // If no description, a click simply closes it
      this.dismissed.emit(this.toast().id);
    }
  }
}
