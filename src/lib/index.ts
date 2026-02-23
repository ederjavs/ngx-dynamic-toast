import {
  APP_INITIALIZER,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
} from "@angular/core";
import type { DynamicToastConfig } from "./types";
import { DynamicToastService } from "./dynamic-toast.service";
import { registerDynamicToast } from "./toast";
import { SileoToastService } from "../sileo-toast/sileo-toast.service";

export function provideDynamicToast(config: DynamicToastConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SileoToastService,
      useExisting: DynamicToastService,
    },
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

export { DynamicToastService } from "./dynamic-toast.service";
export { dynamicToast } from "./toast";
export * from "./types";
