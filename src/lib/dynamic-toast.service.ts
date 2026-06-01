import {
  ApplicationRef,
  ComponentRef,
  ElementRef,
  EnvironmentInjector,
  Injectable,
  NgZone,
  createComponent,
  inject,
  signal,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import {
  AUTO_COLLAPSE_DELAY,
  AUTO_EXPAND_DELAY,
  DEFAULT_TOAST_DURATION,
  EXIT_DURATION,
} from "./constants";
import {
  DynamicToastConfig,
  DynamicToastItem,
  DynamicToastOptions,
  DynamicToastPosition,
  DynamicToastPromiseOptions,
  DynamicToastState,
  DynamicToastTheme,
} from "./types";
import { DynamicToastViewportComponent } from "./dynamic-toast-viewport.component";

const timeoutKey = (t: DynamicToastItem) => `${t.id}:${t.instanceId}`;

let idCounter = 0;
const generateId = () =>
  `${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

@Injectable({ providedIn: "root" })
export class DynamicToastService {
  private _toasts = signal<DynamicToastItem[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private config: DynamicToastConfig = { position: "top-right", theme: "dark" };
  private viewportRef: ComponentRef<DynamicToastViewportComponent> | null = null;
  private timers = new Map<string, number>();
  private paused = false;
  private isPendingCD = false;
  private loopCount = 0;
  private loopResetTimer: any;

  /** Registry of Dynamic Island anchors */
  private anchors = new Map<string, ElementRef<HTMLElement>>();

  private appRef = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);
  private document = inject(DOCUMENT);
  private ngZone = inject(NgZone);

  private registeredViewport: DynamicToastViewportComponent | null = null;

  registerViewport(cmp: DynamicToastViewportComponent) {
    this.registeredViewport = cmp;
  }

  unregisterViewport(cmp: DynamicToastViewportComponent) {
    if (this.registeredViewport === cmp) {
      this.registeredViewport = null;
    }
  }

  configure(cfg: DynamicToastConfig) {
    this.config = { ...this.config, ...cfg };
    if (this.viewportRef) {
      this.viewportRef.setInput("position", this.config.position ?? "top-right");
      this.viewportRef.setInput("offset", this.config.offset);
      this.viewportRef.setInput("theme", this.config.theme ?? "dark");
    }
  }

  /** Register a Dynamic Island anchor element */
  registerAnchor(id: string, elementRef: ElementRef<HTMLElement>) {
    this.anchors.set(id, elementRef);
  }

  /** Unregister a Dynamic Island anchor element */
  unregisterAnchor(id: string) {
    this.anchors.delete(id);
  }

  /** Get anchor element by ID */
  getAnchor(id: string): ElementRef<HTMLElement> | undefined {
    return this.anchors.get(id);
  }

  private ensureViewport() {
    if (this.viewportRef || this.registeredViewport) return;
    const ref = createComponent(DynamicToastViewportComponent, {
      environmentInjector: this.envInjector,
    });
    ref.setInput("position", this.config.position ?? "top-right");
    ref.setInput("offset", this.config.offset);
    ref.setInput("theme", this.config.theme ?? "dark");

    const el = ref.location.nativeElement;
    el.setAttribute("data-dt-root", "");

    this.appRef.attachView(ref.hostView);
    this.document.body.appendChild(el);
    this.viewportRef = ref;
  }

  private resolveAutopilot(
    opts: DynamicToastOptions,
    duration: number | null,
  ): { expandDelayMs?: number; collapseDelayMs?: number } {
    if (opts.autopilot === false || !duration || duration <= 0) return {};
    const cfg = typeof opts.autopilot === "object" ? opts.autopilot : undefined;
    const clamp = (v: number) => Math.min(duration, Math.max(0, v));
    return {
      expandDelayMs: clamp(cfg?.expand ?? AUTO_EXPAND_DELAY),
      collapseDelayMs: clamp(cfg?.collapse ?? AUTO_COLLAPSE_DELAY),
    };
  }

  private mergeOptions(options: DynamicToastOptions): DynamicToastOptions {
    return {
      ...(this.config.options ?? {}),
      ...options,
      styles: { ...(this.config.options?.styles ?? {}), ...(options.styles ?? {}) },
    };
  }

  private buildItem(
    merged: DynamicToastOptions,
    id: string,
    state: DynamicToastState,
    fallbackPosition?: DynamicToastPosition,
  ): DynamicToastItem {
    const duration = merged.duration ?? DEFAULT_TOAST_DURATION;
    const auto = this.resolveAutopilot(merged, duration);
    return {
      ...merged,
      id,
      instanceId: generateId(),
      state,
      position:
        merged.position ?? fallbackPosition ?? this.config.position ?? "top-right",
      duration,
      autoExpandDelayMs: auto.expandDelayMs,
      autoCollapseDelayMs: auto.collapseDelayMs,
      exiting: false,
      fill: merged.fill,
    };
  }

  private upsert(item: DynamicToastItem) {
    // Circuit breaker for infinite loops
    this.loopCount++;
    if (this.loopCount > 50) {
      console.warn("[DynamicToast] Loop detected (50+ updates/sec). Blocking update.");
      return;
    }
    if (!this.loopResetTimer) {
      this.loopResetTimer = setTimeout(() => {
        this.loopCount = 0;
        this.loopResetTimer = null;
      }, 1000);
    }

    // Optimization: check if item really changed before anything else
    const currentList = this._toasts();
    const existing = currentList.find((t) => t.id === item.id);
    if (existing && JSON.stringify(existing) === JSON.stringify(item)) {
      return;
    }

    this.ensureViewport();

    this.ngZone.runOutsideAngular(() => {
      this._toasts.update((prev) => {
        const live = prev.filter((t) => !t.exiting);
        const exist = live.find((t) => t.id === item.id);
        if (exist) {
          return prev.map((t) => (t.id === item.id ? { ...item } : t));
        }
        return [...prev.filter((t) => t.id !== item.id), item];
      });
    });

    // Coalesce CD updates to one per frame
    if (!this.isPendingCD) {
      this.isPendingCD = true;
      this.ngZone.runOutsideAngular(() => {
        requestAnimationFrame(() => {
          this.isPendingCD = false;
          if (this.viewportRef) {
            this.viewportRef.changeDetectorRef.detectChanges();
          } else if (this.registeredViewport) {
            // Signal-based components will naturally update, but we can force tick if necessary
          }
        });
      });
    }

    this.scheduleAll();
  }

  show(options: DynamicToastOptions & { state: DynamicToastState }) {
    const merged = this.mergeOptions(options);
    const id = merged.id ?? "dynamicToast-default";
    const prev = this._toasts().find((t) => t.id === id && !t.exiting);
    const item = this.buildItem(merged, id, options.state, prev?.position);
    this.upsert(item);
    return id;
  }

  info(opts: DynamicToastOptions): string;
  info(title: string, opts?: Partial<DynamicToastOptions>): string;
  info(a: any, b?: any) {
    const opts: DynamicToastOptions =
      typeof a === "string" ? { ...(b ?? {}), title: a } : a;
    return this.show({ ...opts, state: "info" });
  }

  success(opts: DynamicToastOptions): string;
  success(title: string, opts?: Partial<DynamicToastOptions>): string;
  success(a: any, b?: any) {
    const opts: DynamicToastOptions =
      typeof a === "string" ? { ...(b ?? {}), title: a } : a;
    return this.show({ ...opts, state: "success" });
  }

  warning(opts: DynamicToastOptions): string;
  warning(title: string, opts?: Partial<DynamicToastOptions>): string;
  warning(a: any, b?: any) {
    const opts: DynamicToastOptions =
      typeof a === "string" ? { ...(b ?? {}), title: a } : a;
    return this.show({ ...opts, state: "warning" });
  }

  error(opts: DynamicToastOptions): string;
  error(title: string, opts?: Partial<DynamicToastOptions>): string;
  error(a: any, b?: any) {
    const opts: DynamicToastOptions =
      typeof a === "string" ? { ...(b ?? {}), title: a } : a;
    return this.show({ ...opts, state: "error" });
  }

  loading(opts: DynamicToastOptions): string;
  loading(title: string, opts?: Partial<DynamicToastOptions>): string;
  loading(a: any, b?: any) {
    const opts: DynamicToastOptions =
      typeof a === "string" ? { ...(b ?? {}), title: a } : a;
    return this.show({ ...opts, state: "loading", duration: null });
  }

  action(opts: DynamicToastOptions): string;
  action(title: string, opts?: Partial<DynamicToastOptions>): string;
  action(a: any, b?: any) {
    const opts: DynamicToastOptions =
      typeof a === "string" ? { ...(b ?? {}), title: a } : a;
    return this.show({ ...opts, state: "action", duration: null });
  }

  update(id: string, patch: DynamicToastOptions & { state?: DynamicToastState }) {
    const existing = this._toasts().find((t) => t.id === id);
    if (!existing) return;
    const merged = this.mergeOptions({ ...existing, ...patch, id });
    const state = patch.state ?? existing.state;
    const item = this.buildItem(merged, id, state, existing.position);
    this.upsert(item);
  }

  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    opts: DynamicToastPromiseOptions<T>,
  ): Promise<T> {
    const id = this.show({
      ...opts.loading,
      state: "loading",
      duration: null,
      position: opts.position,
    });

    const p = typeof promise === "function" ? promise() : promise;

    p.then((data) => {
      if (opts.action) {
        const actionOpts =
          typeof opts.action === "function" ? opts.action(data) : opts.action;
        this.update(id, { ...actionOpts, state: "action", id });
      } else {
        const successOpts =
          typeof opts.success === "function" ? opts.success(data) : opts.success;
        this.update(id, { ...successOpts, state: "success", id });
      }
    }).catch((err) => {
      const errorOpts =
        typeof opts.error === "function" ? opts.error(err) : opts.error;
      this.update(id, { ...errorOpts, state: "error", id });
    });

    return p;
  }

  dismiss(id: string) {
    const item = this._toasts().find((t) => t.id === id);
    if (!item || item.exiting) return;

    this.ngZone.runOutsideAngular(() => {
      this._toasts.update((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
    });

    if (this.viewportRef) {
      this.viewportRef.changeDetectorRef.detectChanges();
    }

    this.ngZone.runOutsideAngular(() => {
      window.setTimeout(() => {
        this._toasts.update((prev) => prev.filter((t) => t.id !== id));
        this.clearTimers();
        this.scheduleAll();
        if (this.viewportRef) {
          this.viewportRef.changeDetectorRef.detectChanges();
        }
      }, EXIT_DURATION);
    });
  }

  clear(position?: DynamicToastPosition) {
    this._toasts.update((prev) =>
      position ? prev.filter((t) => t.position !== position) : [],
    );
    this.clearTimers();
  }

  pauseTimers() {
    if (this.paused) return;
    this.paused = true;
    this.clearTimers();
  }

  resumeTimers() {
    if (!this.paused) return;
    this.paused = false;
    this.scheduleAll();
  }

  private clearTimers() {
    for (const t of this.timers.values()) window.clearTimeout(t);
    this.timers.clear();
  }

  private scheduleAll() {
    if (this.paused) return;
    this.ngZone.runOutsideAngular(() => {
      const items = this._toasts();
      for (const item of items) {
        if (item.exiting) continue;
        const key = timeoutKey(item);
        if (this.timers.has(key)) continue;
        const dur = item.duration ?? DEFAULT_TOAST_DURATION;
        if (dur === null || dur <= 0) continue;
        this.timers.set(
          key,
          window.setTimeout(() => {
            this.dismiss(item.id);
          }, dur),
        );
      }

      const alive = new Set(items.map(timeoutKey));
      for (const [key, timer] of this.timers) {
        if (!alive.has(key)) {
          window.clearTimeout(timer);
          this.timers.delete(key);
        }
      }
    });
  }
}
