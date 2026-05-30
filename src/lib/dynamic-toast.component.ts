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
  untracked,
  ViewEncapsulation,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
  AfterViewInit,
  ViewChild,
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
  SPRING,
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
export class DynamicToastComponent implements AfterViewInit, OnDestroy {
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
  private pendingSwap: { key?: string; payload: View } | null = null;
  private pointerStartY: number | null = null;

  @ViewChild("pillRect") pillRectRef!: ElementRef<SVGRectElement>;
  @ViewChild("bodyRect") bodyRectRef!: ElementRef<SVGRectElement>;

  ready = signal(false);
  isExpanded = signal(false);
  pillWidth = signal(0);
  contentHeight = signal(0);

  // View as a signal so we can swap it for header crossfade animation
  view = signal<View>({
    title: "",
    state: "info",
    fill: "#151515",
  });

  // Header layer system for crossfade animation
  headerLayerCurrent = signal<HeaderLayer>({
    key: "",
    view: this.view(),
  });
  headerLayerPrev = signal<HeaderLayer | null>(null);

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

  headerTransform = computed(() => {
    const open = this.open();
    const expand = this.expandEdge();
    const ty = open ? (expand === "bottom" ? 3 : -3) : 0;
    const scale = open ? 0.9 : 1;
    return `translateY(${ty}px) scale(${scale})`;
  });

  rootHeight = computed(() => (this.open() ? this.expanded() : HEIGHT));

  constructor() {
    // Sync view from toast input
    effect(
      () => {
        const t = this.toast();
        console.log('[DynamicToast] View sync effect triggered for:', t.id);
        const next: View = {
          title: t.title,
          description: t.description,
          contentTemplate: t.contentTemplate,
          state: t.state,
          iconSvg: t.iconSvg,
          styles: t.styles,
          button: t.button,
          fill: t.fill ?? "#151515",
        };
        this.applyView(next);
      },
      { allowSignalWrites: true },
    );

    // Auto-expand/auto-collapse logic
    effect(
      () => {
        const hasDesc = this.hasDesc();
        const allowExpand = this.allowExpand();
        const toast = this.toast();
        const exiting = toast.exiting;

        console.log('[DynamicToast] Auto-expand effect triggered for:', toast.id, { hasDesc, allowExpand, exiting });

        if (!hasDesc) return;
        if (exiting || !allowExpand) {
          this.isExpanded.set(false);
          return;
        }

        const expandDelay = toast.autoExpandDelayMs;
        const collapseDelay = toast.autoCollapseDelayMs;

        if (expandDelay == null && collapseDelay == null) return;

        // Clear previous timers
        if (this.autoExpandTimer) {
          window.clearTimeout(this.autoExpandTimer);
          this.autoExpandTimer = null;
        }
        if (this.autoCollapseTimer) {
          window.clearTimeout(this.autoCollapseTimer);
          this.autoCollapseTimer = null;
        }

        if (expandDelay != null && expandDelay > 0) {
          this.autoExpandTimer = window.setTimeout(
            () => this.isExpanded.set(true),
            expandDelay,
          );
        } else {
          this.isExpanded.set(true);
        }

        if (collapseDelay != null && collapseDelay > 0) {
          this.autoCollapseTimer = window.setTimeout(
            () => this.isExpanded.set(false),
            collapseDelay,
          );
        }
      },
      { allowSignalWrites: true },
    );

    // Freeze expanded height when closing for smooth animation
    effect(
      () => {
        if (this.open()) {
          this.frozenExpanded.set(this.rawExpanded());
        }
      },
      { allowSignalWrites: true },
    );

    // Removed manual motionAnimate calls since CSS handles transitions.

    // Mark ready after first render
    queueMicrotask(() => {
      this.ready.set(true);
      this.ensureMeasurements();
    });
  }

  ngAfterViewInit() {
    // No-op since we migrated to CSS transitions
  }

  private applyView(next: View) {
    const prev = untracked(() => this.view());
    const headerKey = `${next.state}-${next.title}`;
    const prevKey = `${prev.state}-${prev.title}`;

    this.view.set(next);

    if (headerKey !== prevKey) {
      const currentLayer: HeaderLayer = { key: headerKey, view: next };
      const prevLayer: HeaderLayer = { key: prevKey, view: prev };
      this.headerLayerPrev.set(prevLayer);
      this.headerLayerCurrent.set(currentLayer);

      if (this.headerExitTimer) window.clearTimeout(this.headerExitTimer);
      this.headerExitTimer = window.setTimeout(() => {
        this.headerExitTimer = null;
        this.headerLayerPrev.set(null);
        this.cdr.detectChanges();
      }, HEADER_EXIT_MS);
    } else {
      this.headerLayerCurrent.set({ key: headerKey, view: next });
    }
  }

  // SVG animations are now completely handled by CSS transitions.

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
      this.ngZone.runOutsideAngular(() => {
        rafHeader = requestAnimationFrame(() => {
          rafHeader = null;
          const cs = getComputedStyle(header);
          const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
          const w = inner.scrollWidth + pad + PILL_PADDING;
          if (Math.abs(w - this.pillWidth()) > 1.5) {
            this.pillWidth.set(w);
            this.cdr.detectChanges();
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
    this.applyView(pending.payload);
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
        this.isExpanded.set(false);
      } else {
        this.dismissed.emit(this.toast().id);
      }
    } else {
      this.dismissed.emit(this.toast().id);
    }
  }
}
