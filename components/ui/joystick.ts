const STYLE_ID = 'qt-joy-style';

/** Below this fraction of the stick's travel, input is ignored (stops accidental drift). */
const DEADZONE = 0.2;

const CSS = `
.qt-joy{position:fixed;inset:0;z-index:800;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;--qt-joy:124px;--qt-knob:52px;--qt-act:72px;font-family:"Silkscreen","Courier New",monospace}
.qt-joy *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.qt-joy.qt-joy-hidden{display:none}

.qt-joy-base{position:absolute;left:calc(22px + env(safe-area-inset-left,0px));bottom:calc(26px + env(safe-area-inset-bottom,0px));width:var(--qt-joy);height:var(--qt-joy);border-radius:50%;background:rgba(255,143,232,.55);border:3px solid #8a0f6e;box-shadow:inset 0 0 0 3px rgba(255,240,251,.55),0 3px 0 rgba(138,15,110,.35);pointer-events:auto;touch-action:none;cursor:grab}
.qt-joy-base::before,.qt-joy-base::after{content:"";position:absolute;background:rgba(138,15,110,.35);border-radius:2px}
.qt-joy-base::before{left:50%;top:14px;bottom:14px;width:2px;transform:translateX(-50%)}
.qt-joy-base::after{top:50%;left:14px;right:14px;height:2px;transform:translateY(-50%)}
.qt-joy-knob{position:absolute;left:50%;top:50%;width:var(--qt-knob);height:var(--qt-knob);border-radius:50%;background:#fff0fb;border:3px solid #8a0f6e;box-shadow:inset 0 -4px 0 #ffc8f4,0 2px 0 rgba(138,15,110,.45);transform:translate(-50%,-50%);z-index:1;pointer-events:none;will-change:transform}
.qt-joy-base.qt-held{background:rgba(255,143,232,.75)}
.qt-joy-base.qt-held .qt-joy-knob{background:#ffc8f4}

.qt-joy-act{position:absolute;right:calc(26px + env(safe-area-inset-right,0px));bottom:calc(46px + env(safe-area-inset-bottom,0px));width:var(--qt-act);height:var(--qt-act);padding:0;border-radius:50%;font:inherit;font-size:24px;font-weight:bold;color:#8a0f6e;background:#ff8fe8;border:3px solid #8a0f6e;box-shadow:inset 0 3px 0 #ffc8f4,0 4px 0 #8a0f6e;opacity:.55;pointer-events:auto;touch-action:none;cursor:pointer;transition:opacity .12s,transform .06s,box-shadow .06s}
.qt-joy-act.qt-ready{opacity:1;background:#fff0fb;animation:qt-joy-pulse .9s ease-in-out infinite}
.qt-joy-act.qt-pressed{transform:translateY(3px);box-shadow:inset 0 3px 0 #ffc8f4,0 1px 0 #8a0f6e}
@keyframes qt-joy-pulse{0%,100%{box-shadow:inset 0 3px 0 #ffc8f4,0 4px 0 #8a0f6e,0 0 0 0 rgba(255,143,232,.9)}50%{box-shadow:inset 0 3px 0 #ffc8f4,0 4px 0 #8a0f6e,0 0 0 8px rgba(255,143,232,0)}}

@media (max-height:480px),(max-width:360px){
  .qt-joy{--qt-joy:100px;--qt-knob:44px;--qt-act:62px}
  .qt-joy-base{bottom:calc(16px + env(safe-area-inset-bottom,0px))}
  .qt-joy-act{bottom:calc(28px + env(safe-area-inset-bottom,0px))}
}
`;

/**
 * True when the primary input is a touch screen (phones/tablets), or when the page URL has `?joystick`
 * (handy for testing the controls on a desktop browser).
 */
export function isTouchUI(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('joystick')) return true;
  return window.matchMedia('(pointer: coarse)').matches;
}

export interface JoystickOptions {
  /** Called when the action button is pressed (the touch equivalent of the E key). */
  onAction?: () => void;
  /** Text on the action button. */
  actionLabel?: string;
}

/**
 * On-screen joystick (bottom-left) + action button (bottom-right) for touch devices.
 * Plain DOM like the navbar, so it never fights Phaser's own pointer handling.
 * It only appears on touch screens; on desktop it is created but stays hidden.
 *
 * Usage in the scene:
 *   create():  this.joystick = new Joystick({ onAction: () => this.poi.interact() });
 *   update():  this.joystick.setActive(!overlayOpen);
 *              const { x, y } = this.joystick.vector;   // each in -1..1, (0,0) = not touched
 */
export class Joystick {
  private readonly root: HTMLDivElement;
  private readonly style: HTMLStyleElement;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly action: HTMLButtonElement;
  private readonly mq: MediaQueryList;

  private pointerId: number | null = null;
  private active = true;
  private touchMode = false;
  private readonly vec = { x: 0, y: 0 };

  constructor(private readonly opts: JoystickOptions = {}) {
    this.style = document.createElement('style');
    this.style.id = STYLE_ID;
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.className = 'qt-joy qt-joy-hidden';
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    this.base = document.createElement('div');
    this.base.className = 'qt-joy-base';
    this.base.setAttribute('aria-label', 'Move');
    this.knob = document.createElement('div');
    this.knob.className = 'qt-joy-knob';
    this.base.appendChild(this.knob);

    this.action = document.createElement('button');
    this.action.type = 'button';
    this.action.className = 'qt-joy-act';
    this.action.textContent = opts.actionLabel ?? 'A';
    this.action.setAttribute('aria-label', 'Interact');

    this.root.appendChild(this.base);
    this.root.appendChild(this.action);
    document.body.appendChild(this.root);

    this.base.addEventListener('pointerdown', this.onDown);
    this.base.addEventListener('pointermove', this.onMove);
    this.base.addEventListener('pointerup', this.onUp);
    this.base.addEventListener('pointercancel', this.onUp);
    this.base.addEventListener('lostpointercapture', this.onUp);

    this.action.addEventListener('pointerdown', this.onActionDown);
    this.action.addEventListener('pointerup', this.onActionUp);
    this.action.addEventListener('pointercancel', this.onActionUp);
    this.action.addEventListener('pointerleave', this.onActionUp);

    // Re-check when devtools flips between desktop and device emulation, or a tablet is docked/undocked.
    this.mq = window.matchMedia('(pointer: coarse)');
    this.mq.addEventListener('change', this.refreshMode);
    window.addEventListener('blur', this.release);
    document.addEventListener('visibilitychange', this.release);
    this.refreshMode();
  }

  /** Current stick direction, each axis -1..1. Always (0,0) while untouched, hidden, or inside the dead zone. */
  get vector(): { x: number; y: number } {
    return this.vec;
  }

  /** True while a finger is holding the stick. */
  get isHeld(): boolean {
    return this.pointerId !== null;
  }

  /**
   * Hide the controls while something else owns the screen (dialogue, panel, map, travel animation).
   * Any held input is dropped so the player doesn't keep walking when the controls come back.
   */
  setActive(v: boolean): void {
    if (v === this.active) return;
    this.active = v;
    if (!v) this.release();
    this.syncVisibility();
  }

  /** Brighten and pulse the action button when there is something to interact with. */
  setActionReady(v: boolean): void {
    this.action.classList.toggle('qt-ready', v);
  }

  destroy(): void {
    this.mq.removeEventListener('change', this.refreshMode);
    window.removeEventListener('blur', this.release);
    document.removeEventListener('visibilitychange', this.release);
    this.root.remove();
    this.style.remove();
  }

  // ---------- stick ----------

  private readonly onDown = (e: PointerEvent): void => {
    if (this.pointerId !== null) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    try {
      this.base.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone; the up handler will clean up */
    }
    this.base.classList.add('qt-held');
    this.track(e);
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.track(e);
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.release();
  };

  private track(e: PointerEvent): void {
    const rect = this.base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const travel = (rect.width - this.knob.offsetWidth) / 2; // how far the knob centre may move
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist === 0 || travel <= 0) return this.setVector(0, 0, 0, 0);

    const clamped = Math.min(dist, travel);
    const ux = dx / dist;
    const uy = dy / dist;
    const magnitude = clamped / travel; // 0..1

    if (magnitude < DEADZONE) this.setVector(0, 0, ux * clamped, uy * clamped);
    else this.setVector(ux * magnitude, uy * magnitude, ux * clamped, uy * clamped);
  }

  private setVector(x: number, y: number, knobX: number, knobY: number): void {
    this.vec.x = x;
    this.vec.y = y;
    this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  private readonly release = (): void => {
    const id = this.pointerId;
    this.pointerId = null;
    if (id !== null) {
      try {
        this.base.releasePointerCapture(id);
      } catch {
        /* already released */
      }
    }
    this.base.classList.remove('qt-held');
    this.setVector(0, 0, 0, 0);
    this.action.classList.remove('qt-pressed');
  };

  // ---------- action button ----------

  private readonly onActionDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.action.classList.add('qt-pressed');
    this.opts.onAction?.();
  };

  private readonly onActionUp = (): void => {
    this.action.classList.remove('qt-pressed');
  };

  // ---------- visibility ----------

  private readonly refreshMode = (): void => {
    this.touchMode = isTouchUI();
    this.syncVisibility();
  };

  private syncVisibility(): void {
    const show = this.touchMode && this.active;
    this.root.classList.toggle('qt-joy-hidden', !show);
    if (!show) this.release();
  }
}