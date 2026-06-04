import * as i0 from '@angular/core';
import { input, output, computed, inject, ElementRef, NgZone, ChangeDetectorRef, signal, effect, untracked, ViewChild, ViewEncapsulation, ChangeDetectionStrategy, Component, ApplicationRef, EnvironmentInjector, createComponent, Injectable, Renderer2, ViewContainerRef, Injector, Directive, makeEnvironmentProviders, APP_INITIALIZER } from '@angular/core';
import { NgTemplateOutlet, DOCUMENT } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

/* --------------------------------- Layout --------------------------------- */
const HEIGHT = 40;
const WIDTH = 350;
const DEFAULT_ROUNDNESS = 16;
/* --------------------------------- Timing --------------------------------- */
const DURATION_MS = 600;
const DURATION_S = DURATION_MS / 1000;
const DEFAULT_TOAST_DURATION = 6000;
const EXIT_DURATION = DEFAULT_TOAST_DURATION * 0.1;
const AUTO_EXPAND_DELAY = DEFAULT_TOAST_DURATION * 0.025;
const AUTO_COLLAPSE_DELAY = DEFAULT_TOAST_DURATION - 2000;
/* --------------------------------- Spring --------------------------------- */
const SPRING = {
    type: "spring",
    bounce: 0.25,
    duration: DURATION_S,
};
/* --------------------------------- Render --------------------------------- */
const BLUR_RATIO = 0.5;
const PILL_PADDING = 10;
const MIN_EXPAND_RATIO = 2.25;
const SWAP_COLLAPSE_MS = 200;
const HEADER_EXIT_MS = DURATION_MS * 0.7;

const baseSvg = (title, body, extra) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra ?? ""}><title>${title}</title>${body}</svg>`;
const ICONS = {
    arrowRight: baseSvg("Arrow Right", `<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />`),
    lifeBuoy: baseSvg("Life Buoy", `<circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 4.24 4.24" /><path d="m14.83 9.17 4.24-4.24" /><path d="m14.83 14.83 4.24 4.24" /><path d="m9.17 14.83-4.24 4.24" /><circle cx="12" cy="12" r="4" />`),
    loaderCircle: (extra) => baseSvg("Loader Circle", `<path d="M21 12a9 9 0 1 1-6.219-8.56" />`, extra),
    x: baseSvg("X", `<path d="M18 6 6 18" /><path d="m6 6 12 12" />`),
    circleAlert: baseSvg("Circle Alert", `<circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />`),
    check: baseSvg("Check", `<path d="M20 6 9 17l-5-5" />`),
};

class DynamicToastComponent {
    toast = input.required(...(ngDevMode ? [{ debugName: "toast" }] : /* istanbul ignore next */ []));
    theme = input('dark', ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    anchorWidth = input(0, ...(ngDevMode ? [{ debugName: "anchorWidth" }] : /* istanbul ignore next */ []));
    anchorHeight = input(0, ...(ngDevMode ? [{ debugName: "anchorHeight" }] : /* istanbul ignore next */ []));
    pillAlign = input("left", ...(ngDevMode ? [{ debugName: "pillAlign" }] : /* istanbul ignore next */ []));
    expandEdge = input("bottom", ...(ngDevMode ? [{ debugName: "expandEdge" }] : /* istanbul ignore next */ []));
    canExpand = input(true, ...(ngDevMode ? [{ debugName: "canExpand" }] : /* istanbul ignore next */ []));
    interruptKey = input(undefined, ...(ngDevMode ? [{ debugName: "interruptKey" }] : /* istanbul ignore next */ []));
    dismissed = output();
    entered = output();
    left = output();
    resolvedFill = computed(() => {
        return this.theme() === 'light' ? '#ffffff' : '#151515';
    }, ...(ngDevMode ? [{ debugName: "resolvedFill" }] : /* istanbul ignore next */ []));
    HEIGHT = HEIGHT;
    WIDTH = WIDTH;
    sanitizer = inject(DomSanitizer);
    hostEl = inject(ElementRef);
    ngZone = inject(NgZone);
    cdr = inject(ChangeDetectorRef);
    hasMeasured = false;
    roHeader = null;
    roContent = null;
    headerExitTimer = null;
    autoExpandTimer = null;
    autoCollapseTimer = null;
    swapTimer = null;
    rafHeader = null;
    pendingSwap = null;
    pointerStartY = null;
    pillRectRef;
    bodyRectRef;
    ready = signal(false, ...(ngDevMode ? [{ debugName: "ready" }] : /* istanbul ignore next */ []));
    isExpanded = signal(false, ...(ngDevMode ? [{ debugName: "isExpanded" }] : /* istanbul ignore next */ []));
    pillWidth = signal(0, ...(ngDevMode ? [{ debugName: "pillWidth" }] : /* istanbul ignore next */ []));
    contentHeight = signal(0, ...(ngDevMode ? [{ debugName: "contentHeight" }] : /* istanbul ignore next */ []));
    // View as a signal so we can swap it for header crossfade animation
    view = signal({
        title: "",
        state: "info",
        fill: "#151515",
    }, ...(ngDevMode ? [{ debugName: "view" }] : /* istanbul ignore next */ []));
    // Header layer system for crossfade animation
    headerLayerCurrent = signal({
        key: "",
        view: this.view(),
    }, ...(ngDevMode ? [{ debugName: "headerLayerCurrent" }] : /* istanbul ignore next */ []));
    headerLayerPrev = signal(null, ...(ngDevMode ? [{ debugName: "headerLayerPrev" }] : /* istanbul ignore next */ []));
    filterId = `dt-gooey-${Math.random().toString(36).slice(2, 8)}`;
    hasDesc = computed(() => {
        const v = this.view();
        return (Boolean(v.description) || Boolean(v.contentTemplate) || Boolean(v.button));
    }, ...(ngDevMode ? [{ debugName: "hasDesc" }] : /* istanbul ignore next */ []));
    isLoading = computed(() => this.view().state === "loading", ...(ngDevMode ? [{ debugName: "isLoading" }] : /* istanbul ignore next */ []));
    allowExpand = computed(() => {
        if (this.isLoading())
            return false;
        const interrupt = this.interruptKey();
        const id = this.toast().id;
        return this.canExpand() ?? (!interrupt || interrupt === id);
    }, ...(ngDevMode ? [{ debugName: "allowExpand" }] : /* istanbul ignore next */ []));
    open = computed(() => this.hasDesc() && this.isExpanded() && !this.isLoading(), ...(ngDevMode ? [{ debugName: "open" }] : /* istanbul ignore next */ []));
    resolvedRoundness = computed(() => {
        try {
            return Math.max(0, this.toast().roundness ?? DEFAULT_ROUNDNESS);
        }
        catch {
            return DEFAULT_ROUNDNESS;
        }
    }, ...(ngDevMode ? [{ debugName: "resolvedRoundness" }] : /* istanbul ignore next */ []));
    blur = computed(() => this.resolvedRoundness() * BLUR_RATIO, ...(ngDevMode ? [{ debugName: "blur" }] : /* istanbul ignore next */ []));
    minExpanded = computed(() => HEIGHT * MIN_EXPAND_RATIO, ...(ngDevMode ? [{ debugName: "minExpanded" }] : /* istanbul ignore next */ []));
    rawExpanded = computed(() => {
        const min = this.minExpanded();
        try {
            if (!this.hasDesc())
                return min;
            return Math.max(min, HEIGHT + this.contentHeight());
        }
        catch {
            return min;
        }
    }, ...(ngDevMode ? [{ debugName: "rawExpanded" }] : /* istanbul ignore next */ []));
    frozenExpanded = signal(HEIGHT * MIN_EXPAND_RATIO, ...(ngDevMode ? [{ debugName: "frozenExpanded" }] : /* istanbul ignore next */ []));
    expanded = computed(() => this.open() ? this.rawExpanded() : this.frozenExpanded(), ...(ngDevMode ? [{ debugName: "expanded" }] : /* istanbul ignore next */ []));
    svgHeight = computed(() => this.hasDesc() ? Math.max(this.expanded(), this.minExpanded()) : HEIGHT, ...(ngDevMode ? [{ debugName: "svgHeight" }] : /* istanbul ignore next */ []));
    expandedContent = computed(() => Math.max(0, this.expanded() - HEIGHT), ...(ngDevMode ? [{ debugName: "expandedContent" }] : /* istanbul ignore next */ []));
    resolvedPillWidth = computed(() => {
        const w = this.pillWidth();
        const aw = this.anchorWidth();
        if (aw > 0) {
            return Math.max(w, aw + 4);
        }
        return Math.max(w || HEIGHT, HEIGHT);
    }, ...(ngDevMode ? [{ debugName: "resolvedPillWidth" }] : /* istanbul ignore next */ []));
    pillHeight = computed(() => {
        const ah = this.anchorHeight();
        const baseHeight = ah > 0 ? ah + 4 : HEIGHT;
        return baseHeight + this.blur() * 3;
    }, ...(ngDevMode ? [{ debugName: "pillHeight" }] : /* istanbul ignore next */ []));
    pillX = computed(() => {
        const align = this.pillAlign();
        const pw = this.resolvedPillWidth();
        const aw = this.anchorWidth();
        if (aw > 0) {
            return (WIDTH - pw) / 2;
        }
        if (align === "left")
            return 0;
        if (align === "right")
            return WIDTH - pw;
        return (WIDTH - pw) / 2;
    }, ...(ngDevMode ? [{ debugName: "pillX" }] : /* istanbul ignore next */ []));
    headerTransform = computed(() => {
        const open = this.open();
        const expand = this.expandEdge();
        const ty = open ? (expand === "bottom" ? 3 : -3) : 0;
        const scale = open ? 0.9 : 1;
        return `translateY(${ty}px) scale(${scale})`;
    }, ...(ngDevMode ? [{ debugName: "headerTransform" }] : /* istanbul ignore next */ []));
    rootHeight = computed(() => (this.open() ? this.expanded() : HEIGHT), ...(ngDevMode ? [{ debugName: "rootHeight" }] : /* istanbul ignore next */ []));
    constructor() {
        // Sync view from toast input
        effect(() => {
            const t = this.toast();
            const next = {
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
        }, { allowSignalWrites: true });
        // Auto-expand/auto-collapse logic
        effect(() => {
            const hasDesc = this.hasDesc();
            const allowExpand = this.allowExpand();
            const toast = this.toast();
            const exiting = toast.exiting;
            if (!hasDesc)
                return;
            if (exiting || !allowExpand) {
                this.isExpanded.set(false);
                return;
            }
            const expandDelay = toast.autoExpandDelayMs;
            const collapseDelay = toast.autoCollapseDelayMs;
            if (expandDelay == null && collapseDelay == null)
                return;
            if (this.autoExpandTimer) {
                window.clearTimeout(this.autoExpandTimer);
                this.autoExpandTimer = null;
            }
            if (this.autoCollapseTimer) {
                window.clearTimeout(this.autoCollapseTimer);
                this.autoCollapseTimer = null;
            }
            if (expandDelay != null && expandDelay > 0) {
                this.autoExpandTimer = window.setTimeout(() => this.isExpanded.set(true), expandDelay);
            }
            else {
                this.isExpanded.set(true);
            }
            if (collapseDelay != null && collapseDelay > 0) {
                this.autoCollapseTimer = window.setTimeout(() => this.isExpanded.set(false), collapseDelay);
            }
        }, { allowSignalWrites: true });
        effect(() => {
            if (this.open()) {
                this.frozenExpanded.set(this.rawExpanded());
            }
        }, { allowSignalWrites: true });
        queueMicrotask(() => {
            this.ready.set(true);
            this.ensureMeasurements();
        });
    }
    ngAfterViewInit() {
    }
    applyView(next) {
        const prev = untracked(() => this.view());
        const headerKey = `${next.state}-${next.title}`;
        const prevKey = `${prev.state}-${prev.title}`;
        this.view.set(next);
        if (headerKey !== prevKey) {
            const currentLayer = { key: headerKey, view: next };
            const prevLayer = { key: prevKey, view: prev };
            this.headerLayerPrev.set(prevLayer);
            this.headerLayerCurrent.set(currentLayer);
            if (this.headerExitTimer)
                window.clearTimeout(this.headerExitTimer);
            this.headerExitTimer = window.setTimeout(() => {
                this.headerExitTimer = null;
                this.headerLayerPrev.set(null);
                this.cdr.detectChanges();
            }, HEADER_EXIT_MS);
        }
        else {
            this.headerLayerCurrent.set({ key: headerKey, view: next });
        }
    }
    ngOnDestroy() {
        this.roHeader?.disconnect();
        this.roContent?.disconnect();
        if (this.headerExitTimer)
            window.clearTimeout(this.headerExitTimer);
        if (this.autoExpandTimer)
            window.clearTimeout(this.autoExpandTimer);
        if (this.autoCollapseTimer)
            window.clearTimeout(this.autoCollapseTimer);
        if (this.swapTimer)
            window.clearTimeout(this.swapTimer);
        if (this.rafHeader)
            cancelAnimationFrame(this.rafHeader);
    }
    ensureMeasurements() {
        if (this.hasMeasured)
            return;
        this.hasMeasured = true;
        this.ngZone.runOutsideAngular(() => {
            const root = this.hostEl.nativeElement;
            const inner = root.querySelector("[data-dt-header-inner][data-layer='current']");
            const header = root.querySelector("[data-dt-header]");
            const content = root.querySelector("[data-dt-description]");
            const measureHeader = () => {
                if (this.rafHeader)
                    return;
                this.rafHeader = requestAnimationFrame(() => {
                    this.rafHeader = null;
                    if (!inner || !header)
                        return;
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
            let rafContent = null;
            const measureContent = () => {
                const el = root.querySelector("[data-dt-description]");
                if (!el)
                    return;
                if (rafContent)
                    return;
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
            if (inner)
                this.roHeader.observe(inner);
            if (content)
                this.roContent.observe(content);
        });
    }
    resolvedIcon(v) {
        const icon = v.iconSvg ??
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
        if (this.hasDesc())
            this.isExpanded.set(true);
    }
    handleLeave() {
        this.left.emit(this.toast().id);
        this.isExpanded.set(false);
    }
    handleTransitionEnd(e) {
        if (e.propertyName !== "height" && e.propertyName !== "transform")
            return;
        if (this.open())
            return;
        const pending = this.pendingSwap;
        if (!pending)
            return;
        if (this.swapTimer) {
            window.clearTimeout(this.swapTimer);
            this.swapTimer = null;
        }
        this.applyView(pending.payload);
        this.pendingSwap = null;
    }
    handleButtonClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.view().button?.onClick();
    }
    handleClose(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dismissed.emit(this.toast().id);
    }
    handlePointerDown(e) {
        if (this.toast().exiting)
            return;
        const target = e.target;
        if (target.closest("[data-dt-button]"))
            return;
        this.pointerStartY = e.clientY;
        const el = e.currentTarget;
        const SWIPE_DISMISS = 30;
        const SWIPE_MAX = 20;
        const onMove = (ev) => {
            if (this.pointerStartY == null)
                return;
            const dy = ev.clientY - this.pointerStartY;
            const sign = dy > 0 ? 1 : -1;
            const clamped = Math.min(Math.abs(dy), SWIPE_MAX) * sign;
            el.style.transform = `translateY(${clamped}px)`;
        };
        const onUp = (ev) => {
            if (this.pointerStartY == null)
                return;
            const dy = ev.clientY - this.pointerStartY;
            this.pointerStartY = null;
            el.style.transform = "";
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            if (Math.abs(dy) > SWIPE_DISMISS) {
                this.dismissed.emit(this.toast().id);
            }
            else if (Math.abs(dy) < 5) {
                this.handleTap();
            }
        };
        el.setPointerCapture(e.pointerId);
        el.addEventListener("pointermove", onMove, { passive: true });
        el.addEventListener("pointerup", onUp, { passive: true });
    }
    handleTap() {
        if (this.hasDesc()) {
            if (this.isExpanded()) {
                this.isExpanded.set(false);
            }
            else {
                this.dismissed.emit(this.toast().id);
            }
        }
        else {
            this.dismissed.emit(this.toast().id);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicToastComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "21.2.14", type: DynamicToastComponent, isStandalone: true, selector: "dt-toast", inputs: { toast: { classPropertyName: "toast", publicName: "toast", isSignal: true, isRequired: true, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null }, anchorWidth: { classPropertyName: "anchorWidth", publicName: "anchorWidth", isSignal: true, isRequired: false, transformFunction: null }, anchorHeight: { classPropertyName: "anchorHeight", publicName: "anchorHeight", isSignal: true, isRequired: false, transformFunction: null }, pillAlign: { classPropertyName: "pillAlign", publicName: "pillAlign", isSignal: true, isRequired: false, transformFunction: null }, expandEdge: { classPropertyName: "expandEdge", publicName: "expandEdge", isSignal: true, isRequired: false, transformFunction: null }, canExpand: { classPropertyName: "canExpand", publicName: "canExpand", isSignal: true, isRequired: false, transformFunction: null }, interruptKey: { classPropertyName: "interruptKey", publicName: "interruptKey", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { dismissed: "dismissed", entered: "entered", left: "left" }, viewQueries: [{ propertyName: "pillRectRef", first: true, predicate: ["pillRect"], descendants: true }, { propertyName: "bodyRectRef", first: true, predicate: ["bodyRect"], descendants: true }], ngImport: i0, template: "<button\n  type=\"button\"\n  data-dt-toast\n  [attr.data-ready]=\"ready()\"\n  [attr.data-expanded]=\"open()\"\n  [attr.data-exiting]=\"toast().exiting || false\"\n  [attr.data-edge]=\"expandEdge()\"\n  [attr.data-position]=\"pillAlign()\"\n  [attr.data-state]=\"view().state\"\n  [class]=\"toast().className || ''\"\n  [style.--_h]=\"rootHeight() + 'px'\"\n  [style.--_pw]=\"resolvedPillWidth() + 'px'\"\n  [style.--_px]=\"pillX() + 'px'\"\n  [style.--_ht]=\"headerTransform()\"\n  [style.--_co]=\"open() ? 1 : 0\"\n  (mouseenter)=\"handleEnter()\"\n  (mouseleave)=\"handleLeave()\"\n  (transitionend)=\"handleTransitionEnd($event)\"\n  (pointerdown)=\"handlePointerDown($event)\"\n>\n  <div data-dt-canvas-wrapper>\n    <div\n      data-dt-canvas\n      [attr.data-edge]=\"expandEdge()\"\n      [style.filter]=\"'url(#' + filterId + ')'\"\n    >\n      <svg\n        data-dt-svg\n        [attr.width]=\"WIDTH\"\n        [attr.height]=\"svgHeight()\"\n        [attr.viewBox]=\"'0 0 ' + WIDTH + ' ' + svgHeight()\"\n      >\n        <title>Toast Notification</title>\n        <defs>\n          <filter\n            [id]=\"filterId\"\n            x=\"-20%\"\n            y=\"-20%\"\n            width=\"140%\"\n            height=\"140%\"\n            colorInterpolationFilters=\"sRGB\"\n          >\n            <feGaussianBlur\n              in=\"SourceGraphic\"\n              [attr.stdDeviation]=\"blur()\"\n              result=\"blur\"\n            />\n            <feColorMatrix\n              in=\"blur\"\n              mode=\"matrix\"\n              values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10\"\n              result=\"goo\"\n            />\n            <feComposite in=\"SourceGraphic\" in2=\"goo\" operator=\"atop\" />\n          </filter>\n        </defs>\n\n        <!-- Pill: animated <rect> via Motion -->\n        <rect\n          #pillRect\n          data-dt-pill\n          [attr.rx]=\"resolvedRoundness()\"\n          [attr.ry]=\"resolvedRoundness()\"\n          [attr.fill]=\"view().fill\"\n          y=\"0\"\n          [style.x.px]=\"pillX()\"\n          [style.width.px]=\"resolvedPillWidth()\"\n          [style.height.px]=\"open() ? pillHeight() : HEIGHT\"\n        />\n\n        <!-- Body: animated <rect> via Motion -->\n        <rect\n          #bodyRect\n          data-dt-body\n          [attr.y]=\"HEIGHT\"\n          [attr.width]=\"WIDTH\"\n          [attr.rx]=\"resolvedRoundness()\"\n          [attr.ry]=\"resolvedRoundness()\"\n          [attr.fill]=\"view().fill\"\n          [style.height.px]=\"open() ? expandedContent() : 0\"\n          [style.opacity]=\"open() ? 1 : 0\"\n        />\n      </svg>\n    </div>\n  </div>\n\n  <div data-dt-header [attr.data-edge]=\"expandEdge()\">\n    <div data-dt-header-stack>\n      <!-- Current header layer -->\n      <div\n        data-dt-header-inner\n        data-layer=\"current\"\n        [attr.key]=\"headerLayerCurrent().key\"\n      >\n        <div\n          data-dt-badge\n          [attr.data-state]=\"headerLayerCurrent().view.state\"\n          [class]=\"headerLayerCurrent().view.styles?.badge || ''\"\n          [innerHTML]=\"resolvedIcon(headerLayerCurrent().view)\"\n        ></div>\n        <span\n          data-dt-title\n          [attr.data-state]=\"headerLayerCurrent().view.state\"\n          [class]=\"headerLayerCurrent().view.styles?.title || ''\"\n        >\n          {{ headerLayerCurrent().view.title }}\n        </span>\n      </div>\n\n      <!-- Previous header layer (crossfade exit) -->\n      @if (headerLayerPrev(); as prev) {\n        <div data-dt-header-inner data-layer=\"prev\" data-exiting=\"true\">\n          <div\n            data-dt-badge\n            [attr.data-state]=\"prev.view.state\"\n            [class]=\"prev.view.styles?.badge || ''\"\n            [innerHTML]=\"resolvedIcon(prev.view)\"\n          ></div>\n          <span\n            data-dt-title\n            [attr.data-state]=\"prev.view.state\"\n            [class]=\"prev.view.styles?.title || ''\"\n          >\n            {{ prev.view.title }}\n          </span>\n        </div>\n      }\n    </div>\n  </div>\n\n  @if (hasDesc()) {\n    <div\n      data-dt-content\n      [attr.data-edge]=\"expandEdge()\"\n      [attr.data-visible]=\"open()\"\n    >\n      <div\n        data-dt-description\n        [class]=\"view().styles?.description || ''\"\n      >\n        @if (view().description) {\n          <span>{{ view().description }}</span>\n        }\n        @if (view().contentTemplate) {\n          <ng-container\n            [ngTemplateOutlet]=\"view().contentTemplate\"\n          ></ng-container>\n        }\n        @if (view().button) {\n          <a\n            href=\"#\"\n            data-dt-button\n            [attr.data-state]=\"view().state\"\n            [class]=\"view().styles?.button || ''\"\n            (click)=\"handleButtonClick($event)\"\n          >\n            {{ view().button?.title }}\n          </a>\n        }\n      </div>\n    </div>\n  }\n\n  <!-- Close button (fades in on hover) -->\n  <button\n    type=\"button\"\n    data-dt-close\n    (click)=\"handleClose($event)\"\n    aria-label=\"Dismiss notification\"\n  >\n    <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"></line><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"></line></svg>\n  </button>\n</button>\n", dependencies: [{ kind: "directive", type: NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicToastComponent, decorators: [{
            type: Component,
            args: [{ selector: "dt-toast", standalone: true, imports: [NgTemplateOutlet], changeDetection: ChangeDetectionStrategy.OnPush, encapsulation: ViewEncapsulation.None, template: "<button\n  type=\"button\"\n  data-dt-toast\n  [attr.data-ready]=\"ready()\"\n  [attr.data-expanded]=\"open()\"\n  [attr.data-exiting]=\"toast().exiting || false\"\n  [attr.data-edge]=\"expandEdge()\"\n  [attr.data-position]=\"pillAlign()\"\n  [attr.data-state]=\"view().state\"\n  [class]=\"toast().className || ''\"\n  [style.--_h]=\"rootHeight() + 'px'\"\n  [style.--_pw]=\"resolvedPillWidth() + 'px'\"\n  [style.--_px]=\"pillX() + 'px'\"\n  [style.--_ht]=\"headerTransform()\"\n  [style.--_co]=\"open() ? 1 : 0\"\n  (mouseenter)=\"handleEnter()\"\n  (mouseleave)=\"handleLeave()\"\n  (transitionend)=\"handleTransitionEnd($event)\"\n  (pointerdown)=\"handlePointerDown($event)\"\n>\n  <div data-dt-canvas-wrapper>\n    <div\n      data-dt-canvas\n      [attr.data-edge]=\"expandEdge()\"\n      [style.filter]=\"'url(#' + filterId + ')'\"\n    >\n      <svg\n        data-dt-svg\n        [attr.width]=\"WIDTH\"\n        [attr.height]=\"svgHeight()\"\n        [attr.viewBox]=\"'0 0 ' + WIDTH + ' ' + svgHeight()\"\n      >\n        <title>Toast Notification</title>\n        <defs>\n          <filter\n            [id]=\"filterId\"\n            x=\"-20%\"\n            y=\"-20%\"\n            width=\"140%\"\n            height=\"140%\"\n            colorInterpolationFilters=\"sRGB\"\n          >\n            <feGaussianBlur\n              in=\"SourceGraphic\"\n              [attr.stdDeviation]=\"blur()\"\n              result=\"blur\"\n            />\n            <feColorMatrix\n              in=\"blur\"\n              mode=\"matrix\"\n              values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10\"\n              result=\"goo\"\n            />\n            <feComposite in=\"SourceGraphic\" in2=\"goo\" operator=\"atop\" />\n          </filter>\n        </defs>\n\n        <!-- Pill: animated <rect> via Motion -->\n        <rect\n          #pillRect\n          data-dt-pill\n          [attr.rx]=\"resolvedRoundness()\"\n          [attr.ry]=\"resolvedRoundness()\"\n          [attr.fill]=\"view().fill\"\n          y=\"0\"\n          [style.x.px]=\"pillX()\"\n          [style.width.px]=\"resolvedPillWidth()\"\n          [style.height.px]=\"open() ? pillHeight() : HEIGHT\"\n        />\n\n        <!-- Body: animated <rect> via Motion -->\n        <rect\n          #bodyRect\n          data-dt-body\n          [attr.y]=\"HEIGHT\"\n          [attr.width]=\"WIDTH\"\n          [attr.rx]=\"resolvedRoundness()\"\n          [attr.ry]=\"resolvedRoundness()\"\n          [attr.fill]=\"view().fill\"\n          [style.height.px]=\"open() ? expandedContent() : 0\"\n          [style.opacity]=\"open() ? 1 : 0\"\n        />\n      </svg>\n    </div>\n  </div>\n\n  <div data-dt-header [attr.data-edge]=\"expandEdge()\">\n    <div data-dt-header-stack>\n      <!-- Current header layer -->\n      <div\n        data-dt-header-inner\n        data-layer=\"current\"\n        [attr.key]=\"headerLayerCurrent().key\"\n      >\n        <div\n          data-dt-badge\n          [attr.data-state]=\"headerLayerCurrent().view.state\"\n          [class]=\"headerLayerCurrent().view.styles?.badge || ''\"\n          [innerHTML]=\"resolvedIcon(headerLayerCurrent().view)\"\n        ></div>\n        <span\n          data-dt-title\n          [attr.data-state]=\"headerLayerCurrent().view.state\"\n          [class]=\"headerLayerCurrent().view.styles?.title || ''\"\n        >\n          {{ headerLayerCurrent().view.title }}\n        </span>\n      </div>\n\n      <!-- Previous header layer (crossfade exit) -->\n      @if (headerLayerPrev(); as prev) {\n        <div data-dt-header-inner data-layer=\"prev\" data-exiting=\"true\">\n          <div\n            data-dt-badge\n            [attr.data-state]=\"prev.view.state\"\n            [class]=\"prev.view.styles?.badge || ''\"\n            [innerHTML]=\"resolvedIcon(prev.view)\"\n          ></div>\n          <span\n            data-dt-title\n            [attr.data-state]=\"prev.view.state\"\n            [class]=\"prev.view.styles?.title || ''\"\n          >\n            {{ prev.view.title }}\n          </span>\n        </div>\n      }\n    </div>\n  </div>\n\n  @if (hasDesc()) {\n    <div\n      data-dt-content\n      [attr.data-edge]=\"expandEdge()\"\n      [attr.data-visible]=\"open()\"\n    >\n      <div\n        data-dt-description\n        [class]=\"view().styles?.description || ''\"\n      >\n        @if (view().description) {\n          <span>{{ view().description }}</span>\n        }\n        @if (view().contentTemplate) {\n          <ng-container\n            [ngTemplateOutlet]=\"view().contentTemplate\"\n          ></ng-container>\n        }\n        @if (view().button) {\n          <a\n            href=\"#\"\n            data-dt-button\n            [attr.data-state]=\"view().state\"\n            [class]=\"view().styles?.button || ''\"\n            (click)=\"handleButtonClick($event)\"\n          >\n            {{ view().button?.title }}\n          </a>\n        }\n      </div>\n    </div>\n  }\n\n  <!-- Close button (fades in on hover) -->\n  <button\n    type=\"button\"\n    data-dt-close\n    (click)=\"handleClose($event)\"\n    aria-label=\"Dismiss notification\"\n  >\n    <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"></line><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"></line></svg>\n  </button>\n</button>\n" }]
        }], ctorParameters: () => [], propDecorators: { toast: [{ type: i0.Input, args: [{ isSignal: true, alias: "toast", required: true }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }], anchorWidth: [{ type: i0.Input, args: [{ isSignal: true, alias: "anchorWidth", required: false }] }], anchorHeight: [{ type: i0.Input, args: [{ isSignal: true, alias: "anchorHeight", required: false }] }], pillAlign: [{ type: i0.Input, args: [{ isSignal: true, alias: "pillAlign", required: false }] }], expandEdge: [{ type: i0.Input, args: [{ isSignal: true, alias: "expandEdge", required: false }] }], canExpand: [{ type: i0.Input, args: [{ isSignal: true, alias: "canExpand", required: false }] }], interruptKey: [{ type: i0.Input, args: [{ isSignal: true, alias: "interruptKey", required: false }] }], dismissed: [{ type: i0.Output, args: ["dismissed"] }], entered: [{ type: i0.Output, args: ["entered"] }], left: [{ type: i0.Output, args: ["left"] }], pillRectRef: [{
                type: ViewChild,
                args: ["pillRect"]
            }], bodyRectRef: [{
                type: ViewChild,
                args: ["bodyRect"]
            }] } });

const pillAlign = (pos) => pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";
const expandDir = (pos) => pos.startsWith("top") ? "bottom" : "top";
class DynamicToastViewportComponent {
    position = input("top-right", ...(ngDevMode ? [{ debugName: "position" }] : /* istanbul ignore next */ []));
    offset = input(undefined, ...(ngDevMode ? [{ debugName: "offset" }] : /* istanbul ignore next */ []));
    theme = input("dark", ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    service = inject(DynamicToastService);
    hovering = signal(new Set(), ...(ngDevMode ? [{ debugName: "hovering" }] : /* istanbul ignore next */ []));
    systemThemeMql = null;
    systemThemeListener = null;
    activeId = signal(undefined, ...(ngDevMode ? [{ debugName: "activeId" }] : /* istanbul ignore next */ []));
    /** Resolved theme (handles 'system' by listening to prefers-color-scheme) */
    systemIsDark = signal(true, ...(ngDevMode ? [{ debugName: "systemIsDark" }] : /* istanbul ignore next */ []));
    resolvedTheme = computed(() => {
        const t = this.theme();
        if (t === "system") {
            return this.systemIsDark() ? "dark" : "light";
        }
        return t;
    }, ...(ngDevMode ? [{ debugName: "resolvedTheme" }] : /* istanbul ignore next */ []));
    latestId = computed(() => {
        const list = this.service.toasts();
        for (let i = list.length - 1; i >= 0; i--) {
            if (!list[i].exiting)
                return list[i].id;
        }
        return undefined;
    }, ...(ngDevMode ? [{ debugName: "latestId" }] : /* istanbul ignore next */ []));
    groups = computed(() => {
        const toasts = this.service.toasts();
        // Filter out toasts that have an anchorId (those go to Dynamic Islands)
        const viewportToasts = toasts.filter((t) => !t.anchorId);
        const byPos = new Map();
        for (const t of viewportToasts) {
            const p = (t.position ?? this.position());
            const arr = byPos.get(p);
            if (arr)
                arr.push(t);
            else
                byPos.set(p, [t]);
        }
        const offset = this.offset();
        const off = offset === undefined
            ? undefined
            : typeof offset === "object"
                ? offset
                : { top: offset, right: offset, bottom: offset, left: offset };
        const px = (v) => v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;
        const res = [];
        for (const [pos, items] of byPos) {
            const style = {};
            if (off) {
                if (pos.startsWith("top") && off.top !== undefined)
                    style.top = px(off.top);
                if (pos.startsWith("bottom") && off.bottom !== undefined)
                    style.bottom = px(off.bottom);
                if (pos.endsWith("left") && off.left !== undefined)
                    style.left = px(off.left);
                if (pos.endsWith("right") && off.right !== undefined)
                    style.right = px(off.right);
            }
            res.push({
                pos,
                items,
                pill: pillAlign(pos),
                expand: expandDir(pos),
                style: off ? style : undefined,
            });
        }
        return res;
    }, ...(ngDevMode ? [{ debugName: "groups" }] : /* istanbul ignore next */ []));
    ngOnInit() {
        this.service.registerViewport(this);
        // Listen for system theme changes
        if (typeof window !== "undefined" && window.matchMedia) {
            this.systemThemeMql = window.matchMedia("(prefers-color-scheme: dark)");
            this.systemIsDark.set(this.systemThemeMql.matches);
            this.systemThemeListener = (e) => this.systemIsDark.set(e.matches);
            this.systemThemeMql.addEventListener("change", this.systemThemeListener);
        }
    }
    ngOnDestroy() {
        this.service.unregisterViewport(this);
        if (this.systemThemeMql && this.systemThemeListener) {
            this.systemThemeMql.removeEventListener("change", this.systemThemeListener);
        }
    }
    onToastEnter(id) {
        const next = new Set(this.hovering());
        next.add(id);
        this.hovering.set(next);
        this.activeId.set(id);
        this.service.pauseTimers();
    }
    onToastLeave(id) {
        const next = new Set(this.hovering());
        next.delete(id);
        this.hovering.set(next);
        if (next.size > 0)
            return;
        queueMicrotask(() => {
            if (this.hovering().size > 0)
                return;
            this.activeId.set(this.latestId());
            this.service.resumeTimers();
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicToastViewportComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "21.2.14", type: DynamicToastViewportComponent, isStandalone: true, selector: "dt-viewport", inputs: { position: { classPropertyName: "position", publicName: "position", isSignal: true, isRequired: false, transformFunction: null }, offset: { classPropertyName: "offset", publicName: "offset", isSignal: true, isRequired: false, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0, template: "@for (group of groups(); track group.pos) {\n  <section\n    data-dt-viewport\n    [attr.data-position]=\"group.pos\"\n    [attr.data-theme]=\"resolvedTheme()\"\n    aria-live=\"polite\"\n    [style.top]=\"group.style?.top\"\n    [style.right]=\"group.style?.right\"\n    [style.bottom]=\"group.style?.bottom\"\n    [style.left]=\"group.style?.left\"\n  >\n    @for (t of group.items; track t.id) {\n      <dt-toast\n        [toast]=\"t\"\n        [theme]=\"resolvedTheme()\"\n        [pillAlign]=\"group.pill\"\n        [expandEdge]=\"group.expand\"\n        [canExpand]=\"activeId() === undefined || activeId() === t.id\"\n        (entered)=\"onToastEnter($event)\"\n        (left)=\"onToastLeave($event)\"\n        (dismissed)=\"service.dismiss($event)\"\n      />\n    }\n  </section>\n}\n", styles: ["[data-dt-viewport]{--sileo-spring-easing: linear( 0, .002 .6%, .007 1.2%, .015 1.8%, .026 2.4%, .041 3.1%, .06 3.8%, .108 5.3%, .157 6.6%, .214 8%, .467 13.7%, .577 16.3%, .631 17.7%, .682 19.1%, .73 20.5%, .771 21.8%, .808 23.1%, .844 24.5%, .874 25.8%, .903 27.2%, .928 28.6%, .952 30.1%, .972 31.6%, .988 33.1%, 1.01 35.7%, 1.025 38.5%, 1.034 41.6%, 1.038 45%, 1.035 50.1%, 1.012 64.2%, 1.003 73%, .999 83.7%, 1 );--sileo-duration: .6s;--sileo-height: 40px;--sileo-width: 350px;--sileo-state-success: oklch(.723 .219 142.136);--sileo-state-loading: oklch(.556 0 0);--sileo-state-error: oklch(.637 .237 25.331);--sileo-state-warning: oklch(.795 .184 86.047);--sileo-state-info: oklch(.685 .169 237.323);--sileo-state-action: oklch(.623 .214 259.815)}[data-dt-toast]{position:relative;cursor:pointer;pointer-events:auto;touch-action:none;border:0;background:transparent;padding:0;width:var(--sileo-width);height:var(--_h, var(--sileo-height));opacity:0;transform:translateZ(0) scale(.95);transform-origin:center;contain:layout style;overflow:visible;color:#fff}[data-dt-toast][data-state=loading]{cursor:default}[data-dt-toast][data-ready=true]{opacity:1;transform:translateZ(0) scale(1);transition:transform calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),opacity calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),margin-bottom calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),margin-top calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),height var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-toast][data-ready=true]:active{transform:translateZ(0) scale(.97);transition:transform .1s cubic-bezier(.25,.8,.25,1)}[data-dt-viewport][data-position^=top] [data-dt-toast]:not([data-ready=true]){transform:translateY(-6px) scale(.95)}[data-dt-viewport][data-position^=bottom] [data-dt-toast]:not([data-ready=true]){transform:translateY(6px) scale(.95)}[data-dt-toast][data-ready=true][data-exiting=true]{opacity:0;pointer-events:none}[data-dt-viewport][data-position^=top] [data-dt-toast][data-ready=true][data-exiting=true]{transform:translateY(-6px) scale(.95)}[data-dt-viewport][data-position^=bottom] [data-dt-toast][data-ready=true][data-exiting=true]{transform:translateY(6px) scale(.95)}[data-dt-canvas]{position:absolute;left:0;right:0;pointer-events:none;transform:translateZ(0);contain:layout style;overflow:visible}[data-dt-canvas][data-edge=top]{bottom:0;transform:scaleY(-1) translateZ(0)}[data-dt-canvas][data-edge=bottom]{top:0}[data-dt-svg]{overflow:visible}[data-dt-toast][data-ready=true] [data-dt-pill]{transition:x var(--sileo-duration) var(--sileo-spring-easing),width var(--sileo-duration) var(--sileo-spring-easing),height var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-toast][data-ready=true] [data-dt-body]{transition:height var(--sileo-duration) var(--sileo-spring-easing),opacity calc(var(--sileo-duration) * .8) var(--sileo-spring-easing)}[data-dt-header]{position:absolute;z-index:20;display:flex;align-items:center;padding:.5rem;height:var(--sileo-height);overflow:hidden;left:var(--_px, 0px);transform:var(--_ht);max-width:var(--_pw);box-sizing:border-box}[data-dt-toast]:not([data-state=loading]) [data-dt-header]{padding-right:22px}[data-dt-toast][data-ready=true] [data-dt-header]{transition:transform var(--sileo-duration) var(--sileo-spring-easing),left var(--sileo-duration) var(--sileo-spring-easing),max-width var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-header][data-edge=top]{bottom:0}[data-dt-header][data-edge=bottom]{top:0}[data-dt-header-stack]{position:relative;display:inline-flex;align-items:center;height:100%}[data-dt-close]{position:absolute;z-index:30;top:10px;left:calc(var(--_px, 0px) + var(--_pw, 350px) - 25px);display:flex;align-items:center;justify-content:center;border:0;opacity:0;pointer-events:none;width:20px;height:20px;border-radius:9999px;cursor:pointer;padding:0;flex-shrink:0;transition:opacity .15s ease,background-color .15s ease,color .15s ease,transform .15s ease,left var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-viewport][data-theme=dark] [data-dt-close]{color:#ffffff80;background:#ffffff1a}[data-dt-viewport][data-theme=dark] [data-dt-close]:hover{color:#fff;background:#ffffff40}[data-dt-viewport][data-theme=light] [data-dt-close]{color:#0f172a80;background:#0000000f}[data-dt-viewport][data-theme=light] [data-dt-close]:hover{color:#0f172a;background:#00000026}[data-dt-close] svg{width:12px;height:12px;stroke-width:2.5}[data-dt-toast]:hover [data-dt-close]{opacity:1;pointer-events:auto}[data-dt-toast][data-state=loading] [data-dt-close]{display:none!important}[data-dt-header-inner]{display:flex;align-items:center;gap:.5rem;white-space:nowrap;opacity:1;filter:blur(0px);transform:translateZ(0)}[data-dt-header-inner][data-layer=current]{position:relative;z-index:1;animation:dt-header-enter var(--sileo-duration) var(--sileo-spring-easing) both}[data-dt-header-inner][data-exiting=true],[data-dt-header-inner][data-layer=current]:not(:only-child){will-change:opacity,filter}[data-dt-header-inner][data-layer=prev]{position:absolute;left:0;top:0;z-index:0;pointer-events:none}[data-dt-header-inner][data-exiting=true]{animation:dt-header-exit calc(var(--sileo-duration) * .7) ease forwards}[data-dt-badge]{display:flex;height:24px;width:24px;flex-shrink:0;align-items:center;justify-content:center;padding:2px;box-sizing:border-box;border-radius:9999px;color:var(--sileo-tone, currentColor);background-color:var(--sileo-tone-bg, transparent)}[data-dt-title]{font-size:.825rem;line-height:1rem;font-weight:500;text-transform:capitalize;color:var(--sileo-tone, currentColor)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state]{--_c: var(--sileo-state-success)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=loading]{--_c: var(--sileo-state-loading)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=error]{--_c: var(--sileo-state-error)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=warning]{--_c: var(--sileo-state-warning)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=info]{--_c: var(--sileo-state-info)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=action]{--_c: var(--sileo-state-action)}:is([data-dt-badge],[data-dt-title])[data-state]{--sileo-tone: var(--_c);--sileo-tone-bg: color-mix(in oklch, var(--_c) 20%, transparent)}[data-dt-content]{position:absolute;left:0;z-index:10;width:100%;pointer-events:none;opacity:var(--_co, 0)}[data-dt-content]:not([data-visible=true]){visibility:hidden}[data-dt-toast][data-ready=true] [data-dt-content]{transition:opacity calc(var(--sileo-duration) * .08) ease calc(var(--sileo-duration) * .04)}[data-dt-content][data-edge=top]{top:0}[data-dt-content][data-edge=bottom]{top:var(--sileo-height)}[data-dt-content][data-visible=true]{pointer-events:auto}[data-dt-toast][data-ready=true] [data-dt-content][data-visible=true]{transition:opacity calc(var(--sileo-duration) * .6) ease calc(var(--sileo-duration) * .3)}[data-dt-description]{width:100%;text-align:left;padding:1rem;font-size:.875rem;line-height:1.25rem;contain:layout style paint}[data-dt-button]{display:flex;align-items:center;justify-content:center;height:1.75rem;padding:0 .625rem;margin-top:.75rem;border-radius:9999px;border:0;font-size:.75rem;font-weight:500;cursor:pointer;color:var(--sileo-btn-color, currentColor);background-color:var(--sileo-btn-bg, transparent);transition:background-color .15s ease}[data-dt-button]:hover{background-color:var(--sileo-btn-bg-hover, transparent)}[data-dt-button][data-state]{--sileo-btn-color: var(--_c);--sileo-btn-bg: color-mix(in oklch, var(--_c) 15%, transparent);--sileo-btn-bg-hover: color-mix(in oklch, var(--_c) 25%, transparent)}[data-dt-icon=spin]{animation:dt-spin 1s linear infinite}@keyframes dt-spin{to{transform:rotate(360deg)}}@keyframes dt-header-enter{0%{opacity:0;filter:blur(6px)}to{opacity:1;filter:blur(0px)}}@keyframes dt-header-exit{0%{opacity:1;filter:blur(0px)}to{opacity:0;filter:blur(6px)}}[data-dt-viewport]{position:fixed;z-index:50;display:flex;gap:.75rem;padding:.75rem;pointer-events:none;max-width:calc(100vw - 1.5rem);contain:layout style}[data-dt-toast]{pointer-events:auto}[data-dt-viewport][data-position^=top] [data-dt-toast]:not([data-ready=true]){margin-bottom:calc(-1 * (var(--sileo-height) + .75rem))}[data-dt-viewport][data-position^=bottom] [data-dt-toast]:not([data-ready=true]){margin-top:calc(-1 * (var(--sileo-height) + .75rem))}[data-dt-viewport][data-position^=top]{top:0;flex-direction:column-reverse}[data-dt-viewport][data-position^=bottom]{bottom:0;flex-direction:column}[data-dt-viewport][data-position$=left]{left:0;align-items:flex-start}[data-dt-viewport][data-position$=right]{right:0;align-items:flex-end}[data-dt-viewport][data-position$=center]{left:50%;transform:translate(-50%);align-items:center}[data-dt-canvas-wrapper]{position:absolute;inset:0;pointer-events:none;overflow:visible}[data-dt-viewport][data-theme=light] [data-dt-canvas-wrapper]{filter:drop-shadow(0 0 1px rgba(0,0,0,.12)) drop-shadow(0 4px 16px rgba(0,0,0,.08))}[data-dt-viewport][data-theme=dark] [data-dt-toast]{color:#fff}[data-dt-viewport][data-theme=dark] [data-dt-description]{color:#fff9}[data-dt-viewport][data-theme=light] [data-dt-toast]{color:#0f172a}[data-dt-viewport][data-theme=light] [data-dt-description]{color:#0f172a99}@media(prefers-reduced-motion:no-preference){[data-dt-toast][data-ready=true]:hover,[data-dt-toast][data-ready=true][data-exiting=true]{will-change:transform,opacity,height}}@media(prefers-reduced-motion:reduce){[data-dt-viewport],[data-dt-viewport] *,[data-dt-viewport] *:before,[data-dt-viewport] *:after{animation-duration:.01ms;animation-iteration-count:1;transition-duration:.01ms}}[data-dt-island]{position:relative;display:inline-block}[data-dt-island-container]{position:absolute;z-index:50;pointer-events:none;left:50%;transform:translate(-50%)}[data-dt-island-container][data-expand=bottom]{top:0}[data-dt-island-container][data-expand=top]{bottom:0}[data-dt-island-container] [data-dt-toast]{pointer-events:auto}\n"], dependencies: [{ kind: "component", type: DynamicToastComponent, selector: "dt-toast", inputs: ["toast", "theme", "anchorWidth", "anchorHeight", "pillAlign", "expandEdge", "canExpand", "interruptKey"], outputs: ["dismissed", "entered", "left"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicToastViewportComponent, decorators: [{
            type: Component,
            args: [{ selector: "dt-viewport", standalone: true, imports: [DynamicToastComponent], changeDetection: ChangeDetectionStrategy.OnPush, encapsulation: ViewEncapsulation.None, template: "@for (group of groups(); track group.pos) {\n  <section\n    data-dt-viewport\n    [attr.data-position]=\"group.pos\"\n    [attr.data-theme]=\"resolvedTheme()\"\n    aria-live=\"polite\"\n    [style.top]=\"group.style?.top\"\n    [style.right]=\"group.style?.right\"\n    [style.bottom]=\"group.style?.bottom\"\n    [style.left]=\"group.style?.left\"\n  >\n    @for (t of group.items; track t.id) {\n      <dt-toast\n        [toast]=\"t\"\n        [theme]=\"resolvedTheme()\"\n        [pillAlign]=\"group.pill\"\n        [expandEdge]=\"group.expand\"\n        [canExpand]=\"activeId() === undefined || activeId() === t.id\"\n        (entered)=\"onToastEnter($event)\"\n        (left)=\"onToastLeave($event)\"\n        (dismissed)=\"service.dismiss($event)\"\n      />\n    }\n  </section>\n}\n", styles: ["[data-dt-viewport]{--sileo-spring-easing: linear( 0, .002 .6%, .007 1.2%, .015 1.8%, .026 2.4%, .041 3.1%, .06 3.8%, .108 5.3%, .157 6.6%, .214 8%, .467 13.7%, .577 16.3%, .631 17.7%, .682 19.1%, .73 20.5%, .771 21.8%, .808 23.1%, .844 24.5%, .874 25.8%, .903 27.2%, .928 28.6%, .952 30.1%, .972 31.6%, .988 33.1%, 1.01 35.7%, 1.025 38.5%, 1.034 41.6%, 1.038 45%, 1.035 50.1%, 1.012 64.2%, 1.003 73%, .999 83.7%, 1 );--sileo-duration: .6s;--sileo-height: 40px;--sileo-width: 350px;--sileo-state-success: oklch(.723 .219 142.136);--sileo-state-loading: oklch(.556 0 0);--sileo-state-error: oklch(.637 .237 25.331);--sileo-state-warning: oklch(.795 .184 86.047);--sileo-state-info: oklch(.685 .169 237.323);--sileo-state-action: oklch(.623 .214 259.815)}[data-dt-toast]{position:relative;cursor:pointer;pointer-events:auto;touch-action:none;border:0;background:transparent;padding:0;width:var(--sileo-width);height:var(--_h, var(--sileo-height));opacity:0;transform:translateZ(0) scale(.95);transform-origin:center;contain:layout style;overflow:visible;color:#fff}[data-dt-toast][data-state=loading]{cursor:default}[data-dt-toast][data-ready=true]{opacity:1;transform:translateZ(0) scale(1);transition:transform calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),opacity calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),margin-bottom calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),margin-top calc(var(--sileo-duration) * .66) var(--sileo-spring-easing),height var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-toast][data-ready=true]:active{transform:translateZ(0) scale(.97);transition:transform .1s cubic-bezier(.25,.8,.25,1)}[data-dt-viewport][data-position^=top] [data-dt-toast]:not([data-ready=true]){transform:translateY(-6px) scale(.95)}[data-dt-viewport][data-position^=bottom] [data-dt-toast]:not([data-ready=true]){transform:translateY(6px) scale(.95)}[data-dt-toast][data-ready=true][data-exiting=true]{opacity:0;pointer-events:none}[data-dt-viewport][data-position^=top] [data-dt-toast][data-ready=true][data-exiting=true]{transform:translateY(-6px) scale(.95)}[data-dt-viewport][data-position^=bottom] [data-dt-toast][data-ready=true][data-exiting=true]{transform:translateY(6px) scale(.95)}[data-dt-canvas]{position:absolute;left:0;right:0;pointer-events:none;transform:translateZ(0);contain:layout style;overflow:visible}[data-dt-canvas][data-edge=top]{bottom:0;transform:scaleY(-1) translateZ(0)}[data-dt-canvas][data-edge=bottom]{top:0}[data-dt-svg]{overflow:visible}[data-dt-toast][data-ready=true] [data-dt-pill]{transition:x var(--sileo-duration) var(--sileo-spring-easing),width var(--sileo-duration) var(--sileo-spring-easing),height var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-toast][data-ready=true] [data-dt-body]{transition:height var(--sileo-duration) var(--sileo-spring-easing),opacity calc(var(--sileo-duration) * .8) var(--sileo-spring-easing)}[data-dt-header]{position:absolute;z-index:20;display:flex;align-items:center;padding:.5rem;height:var(--sileo-height);overflow:hidden;left:var(--_px, 0px);transform:var(--_ht);max-width:var(--_pw);box-sizing:border-box}[data-dt-toast]:not([data-state=loading]) [data-dt-header]{padding-right:22px}[data-dt-toast][data-ready=true] [data-dt-header]{transition:transform var(--sileo-duration) var(--sileo-spring-easing),left var(--sileo-duration) var(--sileo-spring-easing),max-width var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-header][data-edge=top]{bottom:0}[data-dt-header][data-edge=bottom]{top:0}[data-dt-header-stack]{position:relative;display:inline-flex;align-items:center;height:100%}[data-dt-close]{position:absolute;z-index:30;top:10px;left:calc(var(--_px, 0px) + var(--_pw, 350px) - 25px);display:flex;align-items:center;justify-content:center;border:0;opacity:0;pointer-events:none;width:20px;height:20px;border-radius:9999px;cursor:pointer;padding:0;flex-shrink:0;transition:opacity .15s ease,background-color .15s ease,color .15s ease,transform .15s ease,left var(--sileo-duration) var(--sileo-spring-easing)}[data-dt-viewport][data-theme=dark] [data-dt-close]{color:#ffffff80;background:#ffffff1a}[data-dt-viewport][data-theme=dark] [data-dt-close]:hover{color:#fff;background:#ffffff40}[data-dt-viewport][data-theme=light] [data-dt-close]{color:#0f172a80;background:#0000000f}[data-dt-viewport][data-theme=light] [data-dt-close]:hover{color:#0f172a;background:#00000026}[data-dt-close] svg{width:12px;height:12px;stroke-width:2.5}[data-dt-toast]:hover [data-dt-close]{opacity:1;pointer-events:auto}[data-dt-toast][data-state=loading] [data-dt-close]{display:none!important}[data-dt-header-inner]{display:flex;align-items:center;gap:.5rem;white-space:nowrap;opacity:1;filter:blur(0px);transform:translateZ(0)}[data-dt-header-inner][data-layer=current]{position:relative;z-index:1;animation:dt-header-enter var(--sileo-duration) var(--sileo-spring-easing) both}[data-dt-header-inner][data-exiting=true],[data-dt-header-inner][data-layer=current]:not(:only-child){will-change:opacity,filter}[data-dt-header-inner][data-layer=prev]{position:absolute;left:0;top:0;z-index:0;pointer-events:none}[data-dt-header-inner][data-exiting=true]{animation:dt-header-exit calc(var(--sileo-duration) * .7) ease forwards}[data-dt-badge]{display:flex;height:24px;width:24px;flex-shrink:0;align-items:center;justify-content:center;padding:2px;box-sizing:border-box;border-radius:9999px;color:var(--sileo-tone, currentColor);background-color:var(--sileo-tone-bg, transparent)}[data-dt-title]{font-size:.825rem;line-height:1rem;font-weight:500;text-transform:capitalize;color:var(--sileo-tone, currentColor)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state]{--_c: var(--sileo-state-success)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=loading]{--_c: var(--sileo-state-loading)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=error]{--_c: var(--sileo-state-error)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=warning]{--_c: var(--sileo-state-warning)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=info]{--_c: var(--sileo-state-info)}:is([data-dt-badge],[data-dt-title],[data-dt-button])[data-state=action]{--_c: var(--sileo-state-action)}:is([data-dt-badge],[data-dt-title])[data-state]{--sileo-tone: var(--_c);--sileo-tone-bg: color-mix(in oklch, var(--_c) 20%, transparent)}[data-dt-content]{position:absolute;left:0;z-index:10;width:100%;pointer-events:none;opacity:var(--_co, 0)}[data-dt-content]:not([data-visible=true]){visibility:hidden}[data-dt-toast][data-ready=true] [data-dt-content]{transition:opacity calc(var(--sileo-duration) * .08) ease calc(var(--sileo-duration) * .04)}[data-dt-content][data-edge=top]{top:0}[data-dt-content][data-edge=bottom]{top:var(--sileo-height)}[data-dt-content][data-visible=true]{pointer-events:auto}[data-dt-toast][data-ready=true] [data-dt-content][data-visible=true]{transition:opacity calc(var(--sileo-duration) * .6) ease calc(var(--sileo-duration) * .3)}[data-dt-description]{width:100%;text-align:left;padding:1rem;font-size:.875rem;line-height:1.25rem;contain:layout style paint}[data-dt-button]{display:flex;align-items:center;justify-content:center;height:1.75rem;padding:0 .625rem;margin-top:.75rem;border-radius:9999px;border:0;font-size:.75rem;font-weight:500;cursor:pointer;color:var(--sileo-btn-color, currentColor);background-color:var(--sileo-btn-bg, transparent);transition:background-color .15s ease}[data-dt-button]:hover{background-color:var(--sileo-btn-bg-hover, transparent)}[data-dt-button][data-state]{--sileo-btn-color: var(--_c);--sileo-btn-bg: color-mix(in oklch, var(--_c) 15%, transparent);--sileo-btn-bg-hover: color-mix(in oklch, var(--_c) 25%, transparent)}[data-dt-icon=spin]{animation:dt-spin 1s linear infinite}@keyframes dt-spin{to{transform:rotate(360deg)}}@keyframes dt-header-enter{0%{opacity:0;filter:blur(6px)}to{opacity:1;filter:blur(0px)}}@keyframes dt-header-exit{0%{opacity:1;filter:blur(0px)}to{opacity:0;filter:blur(6px)}}[data-dt-viewport]{position:fixed;z-index:50;display:flex;gap:.75rem;padding:.75rem;pointer-events:none;max-width:calc(100vw - 1.5rem);contain:layout style}[data-dt-toast]{pointer-events:auto}[data-dt-viewport][data-position^=top] [data-dt-toast]:not([data-ready=true]){margin-bottom:calc(-1 * (var(--sileo-height) + .75rem))}[data-dt-viewport][data-position^=bottom] [data-dt-toast]:not([data-ready=true]){margin-top:calc(-1 * (var(--sileo-height) + .75rem))}[data-dt-viewport][data-position^=top]{top:0;flex-direction:column-reverse}[data-dt-viewport][data-position^=bottom]{bottom:0;flex-direction:column}[data-dt-viewport][data-position$=left]{left:0;align-items:flex-start}[data-dt-viewport][data-position$=right]{right:0;align-items:flex-end}[data-dt-viewport][data-position$=center]{left:50%;transform:translate(-50%);align-items:center}[data-dt-canvas-wrapper]{position:absolute;inset:0;pointer-events:none;overflow:visible}[data-dt-viewport][data-theme=light] [data-dt-canvas-wrapper]{filter:drop-shadow(0 0 1px rgba(0,0,0,.12)) drop-shadow(0 4px 16px rgba(0,0,0,.08))}[data-dt-viewport][data-theme=dark] [data-dt-toast]{color:#fff}[data-dt-viewport][data-theme=dark] [data-dt-description]{color:#fff9}[data-dt-viewport][data-theme=light] [data-dt-toast]{color:#0f172a}[data-dt-viewport][data-theme=light] [data-dt-description]{color:#0f172a99}@media(prefers-reduced-motion:no-preference){[data-dt-toast][data-ready=true]:hover,[data-dt-toast][data-ready=true][data-exiting=true]{will-change:transform,opacity,height}}@media(prefers-reduced-motion:reduce){[data-dt-viewport],[data-dt-viewport] *,[data-dt-viewport] *:before,[data-dt-viewport] *:after{animation-duration:.01ms;animation-iteration-count:1;transition-duration:.01ms}}[data-dt-island]{position:relative;display:inline-block}[data-dt-island-container]{position:absolute;z-index:50;pointer-events:none;left:50%;transform:translate(-50%)}[data-dt-island-container][data-expand=bottom]{top:0}[data-dt-island-container][data-expand=top]{bottom:0}[data-dt-island-container] [data-dt-toast]{pointer-events:auto}\n"] }]
        }], propDecorators: { position: [{ type: i0.Input, args: [{ isSignal: true, alias: "position", required: false }] }], offset: [{ type: i0.Input, args: [{ isSignal: true, alias: "offset", required: false }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }] } });

const timeoutKey = (t) => `${t.id}:${t.instanceId}`;
let idCounter = 0;
const generateId = () => `${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
class DynamicToastService {
    _toasts = signal([], ...(ngDevMode ? [{ debugName: "_toasts" }] : /* istanbul ignore next */ []));
    toasts = this._toasts.asReadonly();
    config = { position: "top-right", theme: "dark" };
    viewportRef = null;
    timers = new Map();
    paused = false;
    isPendingCD = false;
    loopCount = 0;
    loopResetTimer;
    /** Registry of Dynamic Island anchors */
    anchors = new Map();
    appRef = inject(ApplicationRef);
    envInjector = inject(EnvironmentInjector);
    document = inject(DOCUMENT);
    ngZone = inject(NgZone);
    registeredViewport = null;
    registerViewport(cmp) {
        this.registeredViewport = cmp;
    }
    unregisterViewport(cmp) {
        if (this.registeredViewport === cmp) {
            this.registeredViewport = null;
        }
    }
    configure(cfg) {
        this.config = { ...this.config, ...cfg };
        if (this.viewportRef) {
            this.viewportRef.setInput("position", this.config.position ?? "top-right");
            this.viewportRef.setInput("offset", this.config.offset);
            this.viewportRef.setInput("theme", this.config.theme ?? "dark");
        }
    }
    /** Register a Dynamic Island anchor element */
    registerAnchor(id, elementRef) {
        this.anchors.set(id, elementRef);
    }
    /** Unregister a Dynamic Island anchor element */
    unregisterAnchor(id) {
        this.anchors.delete(id);
    }
    /** Get anchor element by ID */
    getAnchor(id) {
        return this.anchors.get(id);
    }
    ensureViewport() {
        if (this.viewportRef || this.registeredViewport)
            return;
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
    resolveAutopilot(opts, duration) {
        if (opts.autopilot === false || !duration || duration <= 0)
            return {};
        const cfg = typeof opts.autopilot === "object" ? opts.autopilot : undefined;
        const clamp = (v) => Math.min(duration, Math.max(0, v));
        return {
            expandDelayMs: clamp(cfg?.expand ?? AUTO_EXPAND_DELAY),
            collapseDelayMs: clamp(cfg?.collapse ?? AUTO_COLLAPSE_DELAY),
        };
    }
    mergeOptions(options) {
        return {
            ...(this.config.options ?? {}),
            ...options,
            styles: { ...(this.config.options?.styles ?? {}), ...(options.styles ?? {}) },
        };
    }
    buildItem(merged, id, state, fallbackPosition) {
        const duration = merged.duration ?? DEFAULT_TOAST_DURATION;
        const auto = this.resolveAutopilot(merged, duration);
        return {
            ...merged,
            id,
            instanceId: generateId(),
            state,
            position: merged.position ?? fallbackPosition ?? this.config.position ?? "top-right",
            duration,
            autoExpandDelayMs: auto.expandDelayMs,
            autoCollapseDelayMs: auto.collapseDelayMs,
            exiting: false,
            fill: merged.fill,
        };
    }
    upsert(item) {
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
                    }
                    else if (this.registeredViewport) {
                        // Signal-based components will naturally update, but we can force tick if necessary
                    }
                });
            });
        }
        this.scheduleAll();
    }
    show(options) {
        const merged = this.mergeOptions(options);
        const id = merged.id ?? "dynamicToast-default";
        const prev = this._toasts().find((t) => t.id === id && !t.exiting);
        const item = this.buildItem(merged, id, options.state, prev?.position);
        this.upsert(item);
        return id;
    }
    info(a, b) {
        const opts = typeof a === "string" ? { ...(b ?? {}), title: a } : a;
        return this.show({ ...opts, state: "info" });
    }
    success(a, b) {
        const opts = typeof a === "string" ? { ...(b ?? {}), title: a } : a;
        return this.show({ ...opts, state: "success" });
    }
    warning(a, b) {
        const opts = typeof a === "string" ? { ...(b ?? {}), title: a } : a;
        return this.show({ ...opts, state: "warning" });
    }
    error(a, b) {
        const opts = typeof a === "string" ? { ...(b ?? {}), title: a } : a;
        return this.show({ ...opts, state: "error" });
    }
    loading(a, b) {
        const opts = typeof a === "string" ? { ...(b ?? {}), title: a } : a;
        return this.show({ ...opts, state: "loading", duration: null });
    }
    action(a, b) {
        const opts = typeof a === "string" ? { ...(b ?? {}), title: a } : a;
        return this.show({ ...opts, state: "action", duration: null });
    }
    update(id, patch) {
        const existing = this._toasts().find((t) => t.id === id);
        if (!existing)
            return;
        const merged = this.mergeOptions({ ...existing, ...patch, id });
        const state = patch.state ?? existing.state;
        const item = this.buildItem(merged, id, state, existing.position);
        this.upsert(item);
    }
    promise(promise, opts) {
        const id = this.show({
            ...opts.loading,
            state: "loading",
            duration: null,
            position: opts.position,
        });
        const p = typeof promise === "function" ? promise() : promise;
        p.then((data) => {
            if (opts.action) {
                const actionOpts = typeof opts.action === "function" ? opts.action(data) : opts.action;
                this.update(id, { ...actionOpts, state: "action", id });
            }
            else {
                const successOpts = typeof opts.success === "function" ? opts.success(data) : opts.success;
                this.update(id, { ...successOpts, state: "success", id });
            }
        }).catch((err) => {
            const errorOpts = typeof opts.error === "function" ? opts.error(err) : opts.error;
            this.update(id, { ...errorOpts, state: "error", id });
        });
        return p;
    }
    dismiss(id) {
        const item = this._toasts().find((t) => t.id === id);
        if (!item || item.exiting)
            return;
        this.ngZone.runOutsideAngular(() => {
            this._toasts.update((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
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
    clear(position) {
        this._toasts.update((prev) => position ? prev.filter((t) => t.position !== position) : []);
        this.clearTimers();
    }
    pauseTimers() {
        if (this.paused)
            return;
        this.paused = true;
        this.clearTimers();
    }
    resumeTimers() {
        if (!this.paused)
            return;
        this.paused = false;
        this.scheduleAll();
    }
    clearTimers() {
        for (const t of this.timers.values())
            window.clearTimeout(t);
        this.timers.clear();
    }
    scheduleAll() {
        if (this.paused)
            return;
        this.ngZone.runOutsideAngular(() => {
            const items = this._toasts();
            for (const item of items) {
                if (item.exiting)
                    continue;
                const key = timeoutKey(item);
                if (this.timers.has(key))
                    continue;
                const dur = item.duration ?? DEFAULT_TOAST_DURATION;
                if (dur === null || dur <= 0)
                    continue;
                this.timers.set(key, window.setTimeout(() => {
                    this.dismiss(item.id);
                }, dur));
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
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicToastService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicToastService, providedIn: "root" });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicToastService, decorators: [{
            type: Injectable,
            args: [{ providedIn: "root" }]
        }] });

class DynamicIslandDirective {
    /** The ID used to match toasts to this island anchor */
    dtIslandId = input.required(...(ngDevMode ? [{ debugName: "dtIslandId" }] : /* istanbul ignore next */ []));
    /** Direction the toast expands: 'bottom' (default) or 'top' */
    dtIslandExpand = input("bottom", ...(ngDevMode ? [{ debugName: "dtIslandExpand" }] : /* istanbul ignore next */ []));
    /** Theme override for this island */
    dtIslandTheme = input("dark", ...(ngDevMode ? [{ debugName: "dtIslandTheme" }] : /* istanbul ignore next */ []));
    /** The mode of the island: 'island' (border wrap) or 'inline' (element replacement) */
    dtIslandMode = input("island", ...(ngDevMode ? [{ debugName: "dtIslandMode" }] : /* istanbul ignore next */ []));
    el = inject(ElementRef);
    service = inject(DynamicToastService);
    renderer = inject(Renderer2);
    vcr = inject(ViewContainerRef);
    cdr = inject(ChangeDetectorRef);
    ngZone = inject(NgZone);
    injector = inject(Injector);
    container = null;
    toastCompRef = null;
    ro = null;
    /** Current toast bound to this island */
    currentToast = signal(null, ...(ngDevMode ? [{ debugName: "currentToast" }] : /* istanbul ignore next */ []));
    ngOnInit() {
        // Register this anchor with the service
        this.service.registerAnchor(this.dtIslandId(), this.el);
        // Mark the host element
        this.renderer.setAttribute(this.el.nativeElement, "data-dt-island", this.dtIslandId());
        // Create the overlay container
        this.container = this.renderer.createElement("div");
        this.renderer.setAttribute(this.container, "data-dt-island-container", "");
        this.renderer.setAttribute(this.container, "data-dt-viewport", "");
        this.renderer.setAttribute(this.container, "data-expand", this.dtIslandExpand());
        this.renderer.setAttribute(this.container, "data-theme", this.dtIslandTheme() === "system" ? "dark" : this.dtIslandTheme());
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
            this.renderer.setStyle(this.el.nativeElement, "transition", "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)");
            wrapper.appendChild(this.el.nativeElement);
            // Put the container behind it initially
            this.renderer.setStyle(this.container, "z-index", "40");
            wrapper.appendChild(this.container);
        }
        // Watch for toasts targeting this island
        effect(() => {
            const toasts = this.service.toasts();
            const islandId = this.dtIslandId();
            const match = toasts.find((t) => t.anchorId === islandId && !t.exiting);
            const exiting = toasts.find((t) => t.anchorId === islandId && t.exiting);
            this.ngZone.runOutsideAngular(() => {
                queueMicrotask(() => {
                    if (match) {
                        this.showToast(match);
                    }
                    else if (exiting) {
                        this.updateToast(exiting);
                    }
                    else {
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
    showToast(item) {
        if (!this.container)
            return;
        const mode = this.dtIslandMode();
        if (mode === "inline") {
            this.renderer.addClass(this.el.nativeElement, "dt-island-inline-active");
            this.renderer.setStyle(this.el.nativeElement, "opacity", "0");
            this.renderer.setStyle(this.el.nativeElement, "pointer-events", "none");
            this.renderer.setStyle(this.container, "z-index", "60");
        }
        else {
            this.renderer.setStyle(this.el.nativeElement, "opacity", "1");
            this.renderer.setStyle(this.el.nativeElement, "pointer-events", "auto");
            this.renderer.setStyle(this.container, "z-index", "40");
        }
        if (!this.toastCompRef) {
            this.toastCompRef = this.vcr.createComponent(DynamicToastComponent);
            this.container.appendChild(this.toastCompRef.location.nativeElement);
            // Subscribe to dismiss
            this.toastCompRef.instance.dismissed.subscribe((id) => {
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
    updateToast(item) {
        if (!this.toastCompRef)
            return;
        this.toastCompRef.setInput("toast", item);
        this.toastCompRef.changeDetectorRef.detectChanges();
    }
    hideToast() {
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
    updateContainerPosition() {
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
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicIslandDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "17.1.0", version: "21.2.14", type: DynamicIslandDirective, isStandalone: true, selector: "[dtDynamicIsland]", inputs: { dtIslandId: { classPropertyName: "dtIslandId", publicName: "dtIslandId", isSignal: true, isRequired: true, transformFunction: null }, dtIslandExpand: { classPropertyName: "dtIslandExpand", publicName: "dtIslandExpand", isSignal: true, isRequired: false, transformFunction: null }, dtIslandTheme: { classPropertyName: "dtIslandTheme", publicName: "dtIslandTheme", isSignal: true, isRequired: false, transformFunction: null }, dtIslandMode: { classPropertyName: "dtIslandMode", publicName: "dtIslandMode", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "21.2.14", ngImport: i0, type: DynamicIslandDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: "[dtDynamicIsland]",
                    standalone: true,
                }]
        }], propDecorators: { dtIslandId: [{ type: i0.Input, args: [{ isSignal: true, alias: "dtIslandId", required: true }] }], dtIslandExpand: [{ type: i0.Input, args: [{ isSignal: true, alias: "dtIslandExpand", required: false }] }], dtIslandTheme: [{ type: i0.Input, args: [{ isSignal: true, alias: "dtIslandTheme", required: false }] }], dtIslandMode: [{ type: i0.Input, args: [{ isSignal: true, alias: "dtIslandMode", required: false }] }] } });

let instance = null;
function registerDynamicToast(service) {
    instance = service;
}
const ensure = () => {
    if (!instance) {
        throw new Error("dynamicToast no está inicializado. Agrega provideDynamicToast(...) en app.config.ts");
    }
    return instance;
};
const dynamicToast = {
    show: (opts) => ensure().show(opts),
    success: (opts) => ensure().success(opts),
    error: (opts) => ensure().error(opts),
    warning: (opts) => ensure().warning(opts),
    info: (opts) => ensure().info(opts),
    loading: (opts) => ensure().loading(opts),
    action: (opts) => ensure().action(opts),
    promise: (p, opts) => ensure().promise(p, opts),
    dismiss: (id) => ensure().dismiss(id),
    clear: (pos) => ensure().clear(pos),
};

function provideDynamicToast(config = {}) {
    return makeEnvironmentProviders([
        {
            provide: APP_INITIALIZER,
            useFactory: () => {
                const service = inject(DynamicToastService);
                return () => {
                    service.configure(config);
                    registerDynamicToast(service);
                };
            },
            multi: true,
        },
    ]);
}

/*
 * Public API Surface of ngx-dynamic-toast
 */

/**
 * Generated bundle index. Do not edit.
 */

export { AUTO_COLLAPSE_DELAY, AUTO_EXPAND_DELAY, BLUR_RATIO, DEFAULT_ROUNDNESS, DEFAULT_TOAST_DURATION, DURATION_MS, DURATION_S, DynamicIslandDirective, DynamicToastComponent, DynamicToastService, DynamicToastViewportComponent, EXIT_DURATION, HEADER_EXIT_MS, HEIGHT, ICONS, MIN_EXPAND_RATIO, PILL_PADDING, SPRING, SWAP_COLLAPSE_MS, WIDTH, dynamicToast, provideDynamicToast };
//# sourceMappingURL=ngx-dynamic-toast.mjs.map
