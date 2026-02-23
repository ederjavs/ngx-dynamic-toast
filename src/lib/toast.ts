import type {
  DynamicToastOptions,
  DynamicToastPosition,
  DynamicToastPromiseOptions,
  DynamicToastState,
} from "./types";
import type { DynamicToastService } from "./dynamic-toast.service";

let instance: DynamicToastService | null = null;

export function registerDynamicToast(service: DynamicToastService) {
  instance = service;
}

const ensure = (): DynamicToastService => {
  if (!instance) {
    throw new Error(
      "dynamicToast no está inicializado. Agrega provideDynamicToast(...) en app.config.ts",
    );
  }
  return instance;
};

export const dynamicToast = {
  show: (opts: DynamicToastOptions & { state: DynamicToastState }) =>
    ensure().show(opts),
  success: (opts: DynamicToastOptions) => ensure().success(opts),
  error: (opts: DynamicToastOptions) => ensure().error(opts),
  warning: (opts: DynamicToastOptions) => ensure().warning(opts),
  info: (opts: DynamicToastOptions) => ensure().info(opts),
  loading: (opts: DynamicToastOptions) => ensure().loading(opts),
  action: (opts: DynamicToastOptions) => ensure().action(opts),
  promise: <T,>(p: Promise<T> | (() => Promise<T>), opts: DynamicToastPromiseOptions<T>) =>
    ensure().promise(p, opts),
  dismiss: (id: string) => ensure().dismiss(id),
  clear: (pos?: DynamicToastPosition) => ensure().clear(pos),
};

