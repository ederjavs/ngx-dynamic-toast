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
  theme = input<'light' | 'dark'>('dark');
  anchorWidth = input<number>(0);
  anchorHeight = input<number>(0);
  pillAlign = input<PillAlign>("left");
  expandEdge = input<ExpandEdge>("bottom");
  canExpand = input<boolean>(true);
  interruptKey = input<string | undefined>(undefined);
  dismissed = output<string>();
  entered = output<string>();
  left = output<string>();

  resolvedFill = computed(() => {
    return this.theme() === 'light' ? '#ffffff' : '#151515';
  });

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
  private rafHeader: number | null = null;
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

  resolvedPillWidth = computed(() => {
    const w = this.pillWidth();
    const aw = this.anchorWidth();
    if (aw > 0) {
      return Math.max(w, aw + 4);
    }
    return Math.max(w || HEIGHT, HEIGHT);
  });

  pillHeight = computed(() => {
    const ah = this.anchorHeight();
    const baseHeight = ah > 0 ? ah + 4 : HEIGHT;
    return baseHeight + this.blur() * 3;
  });

  pillX = computed(() => {
    const align = this.pillAlign();
    const pw = this.resolvedPillWidth();
    const aw = this.anchorWidth();
    
    if (aw > 0) {
      return (WIDTH - pw) / 2;
    }

    if (align === "left") return 0;
    if (align === "right") return WIDTH - pw;
    return (WIDTH - pw) / 2;
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
        const next: View = {
          title: t.title,
          description: t.description,
          contentTemplate: t.contentTemplate,
          state: t.state,
          iconSvg: t.iconSvg,
          styles: t.styles,
          button: t.button,
          fill: t.fill ?? this.resolvedFill(),
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

        if (!hasDesc) return;
        if (exiting || !allowExpand) {
          this.isExpanded.set(false);
          return;
        }

        const expandDelay = toast.autoExpandDelayMs;
        const collapseDelay = toast.autoCollapseDelayMs;

        if (expandDelay == null && collapseDelay == null) return;

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

    effect(
      () => {
        if (this.open()) {
          this.frozenExpanded.set(this.rawExpanded());
        }
      },
      { allowSignalWrites: true },
    );

    queueMicrotask(() => {
      this.ready.set(true);
      this.ensureMeasurements();
    });
  }

  ngAfterViewInit() {
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

  ngOnDestroy() {
    this.roHeader?.disconnect();
    this.roContent?.disconnect();
    if (this.headerExitTimer) window.clearTimeout(this.headerExitTimer);
    if (this.autoExpandTimer) window.clearTimeout(this.autoExpandTimer);
    if (this.autoCollapseTimer) window.clearTimeout(this.autoCollapseTimer);
    if (this.swapTimer) window.clearTimeout(this.swapTimer);
    if (this.rafHeader) cancelAnimationFrame(this.rafHeader);
  }

  private ensureMeasurements() {
    if (this.hasMeasured) return;
    this.hasMeasured = true;

    this.ngZone.runOutsideAngular(() => {
      const root = this.hostEl.nativeElement;
      const inner = root.querySelector<HTMLElement>(
        "[data-dt-header-inner][data-layer='current']",
      );
      const header = root.querySelector<HTMLElement>("[data-dt-header]");
      const content = root.querySelector<HTMLElement>("[data-dt-description]");

      const measureHeader = () => {
        if (this.rafHeader) return;
        this.rafHeader = requestAnimationFrame(() => {
          this.rafHeader = null;
          if (!inner || !header) return;
          const cs = getComputedStyle(header);
          const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
          
          let w = inner.scrollWidth + pad + PILL_PADDING;
          
          const aw = this.anchorWidth();
          if (aw > 0) {
            w += aw; 
          }
          
          if (Math.abs(w - this.pillWidth()) > 1.5) {
            this.pillWidth.set(w);
            this.cdr.detectChanges();
          }
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

      this.roHeader = new ResizeObserver(() => measureHeader());
      this.roContent = new ResizeObserver(() => measureContent());
      
      if (inner) this.roHeader.observe(inner);
      if (content) this.roContent.observe(content);
    });
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

  handleClose(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dismissed.emit(this.toast().id);
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
