import * as _angular_core from '@angular/core';
import { TemplateRef, OnInit, OnDestroy, ElementRef, AfterViewInit, EnvironmentProviders } from '@angular/core';
import * as ngx_dynamic_toast from 'ngx-dynamic-toast';
import { SafeHtml } from '@angular/platform-browser';

type DynamicToastState = "success" | "error" | "warning" | "info" | "loading" | "action";
type DynamicToastPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
type DynamicToastOffsetValue = number | string;
type DynamicToastOffsetConfig = Partial<Record<"top" | "right" | "bottom" | "left", DynamicToastOffsetValue>>;
interface DynamicToastButton {
    title: string;
    onClick: () => void;
}
interface DynamicToastStyles {
    badge?: string;
    title?: string;
    description?: string;
    button?: string;
}
interface DynamicToastOptions {
    id?: string;
    title: string;
    description?: string;
    contentTemplate?: TemplateRef<unknown>;
    iconSvg?: string | null;
    button?: DynamicToastButton;
    position?: DynamicToastPosition;
    duration?: number | null;
    autopilot?: boolean | {
        expand?: number;
        collapse?: number;
    };
    fill?: string;
    roundness?: number;
    styles?: DynamicToastStyles;
    className?: string;
    /** ID of a Dynamic Island anchor element to attach this toast to */
    anchorId?: string;
}
interface DynamicToastItem extends DynamicToastOptions {
    id: string;
    instanceId: string;
    state: DynamicToastState;
    exiting?: boolean;
    autoExpandDelayMs?: number;
    autoCollapseDelayMs?: number;
}
type DynamicToastTheme = "light" | "dark" | "system";
type DynamicIslandMode = "island" | "inline";
interface DynamicToastConfig {
    position?: DynamicToastPosition;
    offset?: DynamicToastOffsetValue | DynamicToastOffsetConfig;
    options?: Partial<DynamicToastOptions>;
    theme?: DynamicToastTheme;
}
interface DynamicToastPromiseOptions<T = unknown> {
    loading: Pick<DynamicToastOptions, "title" | "iconSvg">;
    success: DynamicToastOptions | ((data: T) => DynamicToastOptions);
    error: DynamicToastOptions | ((err: unknown) => DynamicToastOptions);
    action?: DynamicToastOptions | ((data: T) => DynamicToastOptions);
    position?: DynamicToastPosition;
}

type PillAlign$1 = "left" | "center" | "right";
type ExpandEdge$1 = "top" | "bottom";
declare class DynamicToastViewportComponent implements OnInit, OnDestroy {
    position: _angular_core.InputSignal<DynamicToastPosition>;
    offset: _angular_core.InputSignal<string | number | Partial<Record<"top" | "right" | "bottom" | "left", ngx_dynamic_toast.DynamicToastOffsetValue>>>;
    theme: _angular_core.InputSignal<DynamicToastTheme>;
    readonly service: DynamicToastService;
    private hovering;
    private systemThemeMql;
    private systemThemeListener;
    activeId: _angular_core.WritableSignal<string>;
    /** Resolved theme (handles 'system' by listening to prefers-color-scheme) */
    private systemIsDark;
    resolvedTheme: _angular_core.Signal<"light" | "dark">;
    private latestId;
    groups: _angular_core.Signal<{
        pos: DynamicToastPosition;
        items: ngx_dynamic_toast.DynamicToastItem[];
        pill: PillAlign$1;
        expand: ExpandEdge$1;
        style?: {
            top?: string;
            right?: string;
            bottom?: string;
            left?: string;
        };
    }[]>;
    ngOnInit(): void;
    ngOnDestroy(): void;
    onToastEnter(id: string): void;
    onToastLeave(id: string): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<DynamicToastViewportComponent, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<DynamicToastViewportComponent, "dt-viewport", never, { "position": { "alias": "position"; "required": false; "isSignal": true; }; "offset": { "alias": "offset"; "required": false; "isSignal": true; }; "theme": { "alias": "theme"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare class DynamicToastService {
    private _toasts;
    readonly toasts: _angular_core.Signal<DynamicToastItem[]>;
    private config;
    private viewportRef;
    private timers;
    private paused;
    private isPendingCD;
    private loopCount;
    private loopResetTimer;
    /** Registry of Dynamic Island anchors */
    private anchors;
    private appRef;
    private envInjector;
    private document;
    private ngZone;
    private registeredViewport;
    registerViewport(cmp: DynamicToastViewportComponent): void;
    unregisterViewport(cmp: DynamicToastViewportComponent): void;
    configure(cfg: DynamicToastConfig): void;
    /** Register a Dynamic Island anchor element */
    registerAnchor(id: string, elementRef: ElementRef<HTMLElement>): void;
    /** Unregister a Dynamic Island anchor element */
    unregisterAnchor(id: string): void;
    /** Get anchor element by ID */
    getAnchor(id: string): ElementRef<HTMLElement> | undefined;
    private ensureViewport;
    private resolveAutopilot;
    private mergeOptions;
    private buildItem;
    private upsert;
    show(options: DynamicToastOptions & {
        state: DynamicToastState;
    }): string;
    info(opts: DynamicToastOptions): string;
    info(title: string, opts?: Partial<DynamicToastOptions>): string;
    success(opts: DynamicToastOptions): string;
    success(title: string, opts?: Partial<DynamicToastOptions>): string;
    warning(opts: DynamicToastOptions): string;
    warning(title: string, opts?: Partial<DynamicToastOptions>): string;
    error(opts: DynamicToastOptions): string;
    error(title: string, opts?: Partial<DynamicToastOptions>): string;
    loading(opts: DynamicToastOptions): string;
    loading(title: string, opts?: Partial<DynamicToastOptions>): string;
    action(opts: DynamicToastOptions): string;
    action(title: string, opts?: Partial<DynamicToastOptions>): string;
    update(id: string, patch: DynamicToastOptions & {
        state?: DynamicToastState;
    }): void;
    promise<T>(promise: Promise<T> | (() => Promise<T>), opts: DynamicToastPromiseOptions<T>): Promise<T>;
    dismiss(id: string): void;
    clear(position?: DynamicToastPosition): void;
    pauseTimers(): void;
    resumeTimers(): void;
    private clearTimers;
    private scheduleAll;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<DynamicToastService, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<DynamicToastService>;
}

type PillAlign = "left" | "center" | "right";
type ExpandEdge = "top" | "bottom";
interface View {
    title?: string;
    description?: string;
    state: DynamicToastState;
    iconSvg?: string | null;
    styles?: DynamicToastStyles;
    button?: {
        title: string;
        onClick: () => void;
    };
    fill: string;
    contentTemplate?: any;
}
interface HeaderLayer {
    key: string;
    view: View;
}
declare class DynamicToastComponent implements AfterViewInit, OnDestroy {
    toast: _angular_core.InputSignal<DynamicToastItem>;
    theme: _angular_core.InputSignal<"light" | "dark">;
    anchorWidth: _angular_core.InputSignal<number>;
    anchorHeight: _angular_core.InputSignal<number>;
    pillAlign: _angular_core.InputSignal<PillAlign>;
    expandEdge: _angular_core.InputSignal<ExpandEdge>;
    canExpand: _angular_core.InputSignal<boolean>;
    interruptKey: _angular_core.InputSignal<string>;
    dismissed: _angular_core.OutputEmitterRef<string>;
    entered: _angular_core.OutputEmitterRef<string>;
    left: _angular_core.OutputEmitterRef<string>;
    resolvedFill: _angular_core.Signal<"#ffffff" | "#151515">;
    readonly HEIGHT = 40;
    readonly WIDTH = 350;
    private readonly sanitizer;
    private readonly hostEl;
    private ngZone;
    private cdr;
    private hasMeasured;
    private roHeader;
    private roContent;
    private headerExitTimer;
    private autoExpandTimer;
    private autoCollapseTimer;
    private swapTimer;
    private rafHeader;
    private pendingSwap;
    private pointerStartY;
    pillRectRef: ElementRef<SVGRectElement>;
    bodyRectRef: ElementRef<SVGRectElement>;
    ready: _angular_core.WritableSignal<boolean>;
    isExpanded: _angular_core.WritableSignal<boolean>;
    pillWidth: _angular_core.WritableSignal<number>;
    contentHeight: _angular_core.WritableSignal<number>;
    view: _angular_core.WritableSignal<View>;
    headerLayerCurrent: _angular_core.WritableSignal<HeaderLayer>;
    headerLayerPrev: _angular_core.WritableSignal<HeaderLayer>;
    filterId: string;
    hasDesc: _angular_core.Signal<boolean>;
    isLoading: _angular_core.Signal<boolean>;
    allowExpand: _angular_core.Signal<boolean>;
    open: _angular_core.Signal<boolean>;
    resolvedRoundness: _angular_core.Signal<number>;
    blur: _angular_core.Signal<number>;
    minExpanded: _angular_core.Signal<number>;
    rawExpanded: _angular_core.Signal<number>;
    frozenExpanded: _angular_core.WritableSignal<number>;
    expanded: _angular_core.Signal<number>;
    svgHeight: _angular_core.Signal<number>;
    expandedContent: _angular_core.Signal<number>;
    resolvedPillWidth: _angular_core.Signal<number>;
    pillHeight: _angular_core.Signal<number>;
    pillX: _angular_core.Signal<number>;
    headerTransform: _angular_core.Signal<string>;
    rootHeight: _angular_core.Signal<number>;
    constructor();
    ngAfterViewInit(): void;
    private applyView;
    ngOnDestroy(): void;
    private ensureMeasurements;
    resolvedIcon(v: View): SafeHtml;
    handleEnter(): void;
    handleLeave(): void;
    handleTransitionEnd(e: TransitionEvent): void;
    handleButtonClick(e: MouseEvent): void;
    handleClose(e: MouseEvent): void;
    handlePointerDown(e: PointerEvent): void;
    private handleTap;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<DynamicToastComponent, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<DynamicToastComponent, "dt-toast", never, { "toast": { "alias": "toast"; "required": true; "isSignal": true; }; "theme": { "alias": "theme"; "required": false; "isSignal": true; }; "anchorWidth": { "alias": "anchorWidth"; "required": false; "isSignal": true; }; "anchorHeight": { "alias": "anchorHeight"; "required": false; "isSignal": true; }; "pillAlign": { "alias": "pillAlign"; "required": false; "isSignal": true; }; "expandEdge": { "alias": "expandEdge"; "required": false; "isSignal": true; }; "canExpand": { "alias": "canExpand"; "required": false; "isSignal": true; }; "interruptKey": { "alias": "interruptKey"; "required": false; "isSignal": true; }; }, { "dismissed": "dismissed"; "entered": "entered"; "left": "left"; }, never, never, true, never>;
}

declare class DynamicIslandDirective implements OnInit, OnDestroy {
    /** The ID used to match toasts to this island anchor */
    dtIslandId: _angular_core.InputSignal<string>;
    /** Direction the toast expands: 'bottom' (default) or 'top' */
    dtIslandExpand: _angular_core.InputSignal<"top" | "bottom">;
    /** Theme override for this island */
    dtIslandTheme: _angular_core.InputSignal<DynamicToastTheme>;
    /** The mode of the island: 'island' (border wrap) or 'inline' (element replacement) */
    dtIslandMode: _angular_core.InputSignal<DynamicIslandMode>;
    private readonly el;
    private readonly service;
    private readonly renderer;
    private readonly vcr;
    private readonly cdr;
    private readonly ngZone;
    private readonly injector;
    private container;
    private toastCompRef;
    private ro;
    /** Current toast bound to this island */
    private currentToast;
    ngOnInit(): void;
    private showToast;
    private updateToast;
    private hideToast;
    private updateContainerPosition;
    ngOnDestroy(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<DynamicIslandDirective, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<DynamicIslandDirective, "[dtDynamicIsland]", never, { "dtIslandId": { "alias": "dtIslandId"; "required": true; "isSignal": true; }; "dtIslandExpand": { "alias": "dtIslandExpand"; "required": false; "isSignal": true; }; "dtIslandTheme": { "alias": "dtIslandTheme"; "required": false; "isSignal": true; }; "dtIslandMode": { "alias": "dtIslandMode"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare const HEIGHT = 40;
declare const WIDTH = 350;
declare const DEFAULT_ROUNDNESS = 16;
declare const DURATION_MS = 600;
declare const DURATION_S: number;
declare const DEFAULT_TOAST_DURATION = 6000;
declare const EXIT_DURATION: number;
declare const AUTO_EXPAND_DELAY: number;
declare const AUTO_COLLAPSE_DELAY: number;
declare const SPRING: {
    type: "spring";
    bounce: number;
    duration: number;
};
declare const BLUR_RATIO = 0.5;
declare const PILL_PADDING = 10;
declare const MIN_EXPAND_RATIO = 2.25;
declare const SWAP_COLLAPSE_MS = 200;
declare const HEADER_EXIT_MS: number;

declare const ICONS: {
    readonly arrowRight: string;
    readonly lifeBuoy: string;
    readonly loaderCircle: (extra?: string) => string;
    readonly x: string;
    readonly circleAlert: string;
    readonly check: string;
};

declare const dynamicToast: {
    show: (opts: DynamicToastOptions & {
        state: DynamicToastState;
    }) => string;
    success: (opts: DynamicToastOptions) => string;
    error: (opts: DynamicToastOptions) => string;
    warning: (opts: DynamicToastOptions) => string;
    info: (opts: DynamicToastOptions) => string;
    loading: (opts: DynamicToastOptions) => string;
    action: (opts: DynamicToastOptions) => string;
    promise: <T>(p: Promise<T> | (() => Promise<T>), opts: DynamicToastPromiseOptions<T>) => Promise<T>;
    dismiss: (id: string) => void;
    clear: (pos?: DynamicToastPosition) => void;
};

declare function provideDynamicToast(config?: DynamicToastConfig): EnvironmentProviders;

export { AUTO_COLLAPSE_DELAY, AUTO_EXPAND_DELAY, BLUR_RATIO, DEFAULT_ROUNDNESS, DEFAULT_TOAST_DURATION, DURATION_MS, DURATION_S, DynamicIslandDirective, DynamicToastComponent, DynamicToastService, DynamicToastViewportComponent, EXIT_DURATION, HEADER_EXIT_MS, HEIGHT, ICONS, MIN_EXPAND_RATIO, PILL_PADDING, SPRING, SWAP_COLLAPSE_MS, WIDTH, dynamicToast, provideDynamicToast };
export type { DynamicIslandMode, DynamicToastButton, DynamicToastConfig, DynamicToastItem, DynamicToastOffsetConfig, DynamicToastOffsetValue, DynamicToastOptions, DynamicToastPosition, DynamicToastPromiseOptions, DynamicToastState, DynamicToastStyles, DynamicToastTheme };
