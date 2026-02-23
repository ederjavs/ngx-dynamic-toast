import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { DynamicToastComponent } from "./dynamic-toast.component";
import { DynamicToastService } from "./dynamic-toast.service";
import type { DynamicToastOffsetConfig, DynamicToastPosition } from "./types";

type PillAlign = "left" | "center" | "right";
type ExpandEdge = "top" | "bottom";

const pillAlign = (pos: DynamicToastPosition): PillAlign =>
  pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";

const expandDir = (pos: DynamicToastPosition): ExpandEdge =>
  pos.startsWith("top") ? "bottom" : "top";

@Component({
  selector: "dt-viewport",
  standalone: true,
  imports: [DynamicToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: "./dynamic-toast-viewport.component.html",
  styleUrls: ["./styles.css"],
})
export class DynamicToastViewportComponent {
  position = input<DynamicToastPosition>("top-right");
  offset = input<DynamicToastOffsetConfig | string | number | undefined>(undefined);

  readonly service = inject(DynamicToastService);
  private hovering = signal(new Set<string>());

  activeId = signal<string | undefined>(undefined);

  private latestId = computed(() => {
    const list = this.service.toasts();
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].exiting) return list[i].id;
    }
    return undefined;
  });

  groups = computed(() => {
    const toasts = this.service.toasts();
    const byPos = new Map<DynamicToastPosition, typeof toasts>();
    for (const t of toasts) {
      const p = (t.position ?? this.position()) as DynamicToastPosition;
      const arr = byPos.get(p);
      if (arr) arr.push(t);
      else byPos.set(p, [t]);
    }

    const offset = this.offset();
    const off: DynamicToastOffsetConfig | undefined =
      offset === undefined
        ? undefined
        : typeof offset === "object"
          ? offset
          : { top: offset, right: offset, bottom: offset, left: offset };

    const px = (v: string | number | undefined) =>
      v === undefined ? undefined : typeof v === "number" ? `${v}px` : v;

    const res: Array<{
      pos: DynamicToastPosition;
      items: typeof toasts;
      pill: PillAlign;
      expand: ExpandEdge;
      style?: { top?: string; right?: string; bottom?: string; left?: string };
    }> = [];

    for (const [pos, items] of byPos) {
      const style: any = {};
      if (off) {
        if (pos.startsWith("top") && off.top !== undefined) style.top = px(off.top);
        if (pos.startsWith("bottom") && off.bottom !== undefined)
          style.bottom = px(off.bottom);
        if (pos.endsWith("left") && off.left !== undefined) style.left = px(off.left);
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
  });

  onToastEnter(id: string) {
    const next = new Set(this.hovering());
    next.add(id);
    this.hovering.set(next);
    this.activeId.set(id);
    this.service.pauseTimers();
  }

  onToastLeave(id: string) {
    const next = new Set(this.hovering());
    next.delete(id);
    this.hovering.set(next);
    if (next.size > 0) return;

    queueMicrotask(() => {
      if (this.hovering().size > 0) return;
      this.activeId.set(this.latestId());
      this.service.resumeTimers();
    });
  }
}
