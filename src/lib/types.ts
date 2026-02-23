import { TemplateRef } from "@angular/core";

export type DynamicToastState =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading"
  | "action";

export type DynamicToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type DynamicToastOffsetValue = number | string;

export type DynamicToastOffsetConfig = Partial<
  Record<"top" | "right" | "bottom" | "left", DynamicToastOffsetValue>
>;

export interface DynamicToastButton {
  title: string;
  onClick: () => void;
}

export interface DynamicToastStyles {
  badge?: string;
  title?: string;
  description?: string;
  button?: string;
}

export interface DynamicToastOptions {
  id?: string;
  title: string;
  description?: string;
  contentTemplate?: TemplateRef<unknown>;
  iconSvg?: string | null;
  button?: DynamicToastButton;
  position?: DynamicToastPosition;
  duration?: number | null;
  autopilot?: boolean | { expand?: number; collapse?: number };
  fill?: string;
  roundness?: number;
  styles?: DynamicToastStyles;
  className?: string;
}

export interface DynamicToastItem extends DynamicToastOptions {
  id: string;
  instanceId: string;
  state: DynamicToastState;
  exiting?: boolean;
  autoExpandDelayMs?: number;
  autoCollapseDelayMs?: number;
}

export interface DynamicToastConfig {
  position?: DynamicToastPosition;
  offset?: DynamicToastOffsetValue | DynamicToastOffsetConfig;
  options?: Partial<DynamicToastOptions>;
}

export interface DynamicToastPromiseOptions<T = unknown> {
  loading: Pick<DynamicToastOptions, "title" | "iconSvg">;
  success: DynamicToastOptions | ((data: T) => DynamicToastOptions);
  error: DynamicToastOptions | ((err: unknown) => DynamicToastOptions);
  action?: DynamicToastOptions | ((data: T) => DynamicToastOptions);
  position?: DynamicToastPosition;
}

