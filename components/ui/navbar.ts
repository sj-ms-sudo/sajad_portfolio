import { AVATAR, NAV_HEIGHT, type NavItem } from '../../game/data/nav';

const STYLE_ID = 'qt-nav-style';

/** One car is drawn above EVERY top-level nav link. Point `src` at wherever you put car1.png. */
const CAR = {
  src: '/assets/car1.png', // <-- adjust to your asset path
  w: 184, // native sprite size
  h: 68,
  scale: 0.5, // keep this an INTEGER (1, 2, 3) or the pixel art gets blurry. 1 = 184px per car
  gap: 6, // space between cars (px)
};

/** Logo / avatar tweaks */
const LOGO = { marginLeft: 28, opacity: 0.6 };

/** Link text: black with a grey border */
const TEXT = { color: '#000', border: '#9a9a9a' };

/**
 * Silkscreen is drawn on an 8px grid, so it is only sharp at 8 / 16 / 24px.
 * Swap `F` to FONT.smooth for a clean non-pixel look.
 */
const FONT = {
  crisp: { family: '"Silkscreen","Courier New",monospace', size: 16, smoothing: 'none' },
  smooth: { family: 'ui-rounded,"Nunito","Segoe UI",system-ui,sans-serif', size: 15, smoothing: 'antialiased' },
};
const F = FONT.crisp;

const OUTLINE = [
  '2px 0','-2px 0','0 2px','0 -2px','2px 2px','-2px -2px','2px -2px','-2px 2px',
].map((o) => `${o} 0 ${TEXT.border}`).join(',');

const CSS = `
/* the bar itself is see-through and lets clicks pass to the game; only the actual controls catch clicks */
.qt-nav{position:fixed;top:0;left:0;right:0;z-index:900;box-sizing:border-box;display:flex;align-items:flex-start;gap:12px;padding:8px 12px;background:transparent;pointer-events:none;font-family:${F.family};font-size:${F.size}px;font-weight:bold;user-select:none;-webkit-font-smoothing:${F.smoothing};-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
.qt-nav *{box-sizing:border-box}

.qt-avatar{position:relative;flex:none;margin-left:${LOGO.marginLeft}px;opacity:${LOGO.opacity};width:${AVATAR.size}px;height:${AVATAR.size}px;padding:0;overflow:hidden;background:#ffc8f4;border:2px solid #8a0f6e;border-radius:50%;box-shadow:0 0 0 2px #fff0fb;cursor:pointer;pointer-events:auto;transition:opacity .15s}
.qt-avatar.qt-static{cursor:default}
.qt-avatar:not(.qt-static):hover{opacity:1;background:#fff0fb}
.qt-avatar img{width:100%;height:100%;object-fit:cover;display:block}

.qt-menu{display:flex;flex-wrap:nowrap;align-items:flex-start;justify-content:flex-end;gap:${CAR.gap}px;margin:0 0 0 auto;padding:0;list-style:none;pointer-events:none;min-width:0}
.qt-item{position:relative;display:flex;align-items:center;pointer-events:auto}

/* top-level item = car on top, link underneath */
.qt-top{flex-direction:column;flex:0 1 auto;min-width:0}
.qt-car{display:block;width:${CAR.w * CAR.scale}px;max-width:100%;height:auto;aspect-ratio:${CAR.w}/${CAR.h};image-rendering:pixelated;cursor:pointer;-webkit-user-drag:none;transition:transform .15s}
.qt-top:hover>.qt-car,.qt-top:focus-within>.qt-car{transform:translateY(-3px)}

.qt-link{font:inherit;color:${TEXT.color};text-shadow:${OUTLINE};background:transparent;border:2px solid transparent;padding:4px 10px;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:.5px}
.qt-top>.qt-link{margin-top:-2px}
.qt-link:hover,.qt-link:focus-visible,.qt-top:hover>.qt-link{color:${TEXT.color};text-shadow:none;background:#fff0fb;border-color:#8a0f6e;outline:none}
.qt-has-sub>.qt-link::after{content:"";display:inline-block;margin-left:7px;vertical-align:middle;border:4px solid transparent;border-top:5px solid currentColor;border-bottom:0}

/* dropdowns keep a solid panel so they stay readable over the game */
.qt-sub{display:none;position:absolute;top:100%;right:0;min-width:210px;margin:0;padding:4px;list-style:none;background:#fff0fb;border:3px solid #8a0f6e;box-shadow:4px 4px 0 rgba(138,15,110,.35);z-index:1}
.qt-sub .qt-item{display:block}
.qt-sub .qt-link{display:block;width:100%;text-align:left;color:${TEXT.color};text-shadow:none}
.qt-sub .qt-link:hover,.qt-sub .qt-link:focus-visible{background:#ffc8f4}
.qt-sub .qt-sub{top:-7px;right:100%}

.qt-item.open>.qt-sub{display:block}
@media (hover:hover){.qt-item:hover>.qt-sub{display:block}}
.qt-item:has(:focus-visible)>.qt-sub{display:block}
.qt-item.qt-suppress>.qt-sub{display:none!important}

.qt-burger{display:none;margin-left:auto;font:inherit;font-size:18px;line-height:1;color:#8a0f6e;background:#fff0fb;border:2px solid #8a0f6e;padding:6px 10px;cursor:pointer;pointer-events:auto}

.qt-locked .qt-menu,.qt-locked .qt-avatar,.qt-locked .qt-burger{opacity:.45;pointer-events:none}
.qt-locked .qt-item{pointer-events:none}

/* phones: no room for a row of cars, so it becomes a plain burger list */
@media (max-width:720px){
  .qt-burger{display:block}
  .qt-avatar{margin-left:0}
  .qt-car{display:none}
  .qt-menu{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;gap:0;margin:0;padding:6px 8px;background:#ff8fe8;border-bottom:3px solid #8a0f6e;max-height:calc(100vh - ${NAV_HEIGHT}px);overflow-y:auto;pointer-events:auto}
  .qt-nav.qt-open .qt-menu{display:flex}
  .qt-item,.qt-top{display:block}
  .qt-link,.qt-top>.qt-link{width:100%;text-align:left;margin-top:0;text-shadow:none}
  .qt-has-sub>.qt-link::after{display:none}
  .qt-sub,.qt-sub .qt-sub{display:block;position:static;min-width:0;padding:0 0 0 14px;background:transparent;border:0;box-shadow:none}
}
`;

/**
 * Top navigation (plain DOM, sits above the game canvas, transparent).
 * Avatar on the left; on the right a row of cars, each with its nav link underneath.
 * The tree comes from data/nav.ts.
 */
export class Navbar {
  private readonly root: HTMLElement;
  private readonly style: HTMLStyleElement;
  private readonly burger: HTMLButtonElement;
  private locked = false;

  constructor(items: NavItem[], private readonly onSelect: (item: NavItem) => void) {
    this.style = document.createElement('style');
    this.style.id = STYLE_ID;
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('nav');
    this.root.className = 'qt-nav';
    this.root.setAttribute('aria-label', 'Quick travel');

    this.root.appendChild(this.buildAvatar());

    const menu = document.createElement('ul');
    menu.className = 'qt-menu';
    for (const item of items) menu.appendChild(this.buildItem(item, true));
    this.root.appendChild(menu);

    this.burger = document.createElement('button');
    this.burger.type = 'button';
    this.burger.className = 'qt-burger';
    this.burger.textContent = '☰';
    this.burger.setAttribute('aria-label', 'Menu');
    this.burger.setAttribute('aria-expanded', 'false');
    this.burger.addEventListener('click', () => {
      const open = !this.root.classList.contains('qt-open');
      this.root.classList.toggle('qt-open', open);
      this.burger.setAttribute('aria-expanded', String(open));
    });
    this.root.appendChild(this.burger);

    document.body.appendChild(this.root);
    document.addEventListener('pointerdown', this.onDocPointer);
    document.addEventListener('keydown', this.onKey);
  }

  /** Greys the bar out and ignores clicks (dialogue / panel / map open, or a trip in progress). */
  setLocked(v: boolean): void {
    if (v === this.locked) return;
    this.locked = v;
    this.root.classList.toggle('qt-locked', v);
    if (v) this.closeMenus();
  }

  destroy(): void {
    document.removeEventListener('pointerdown', this.onDocPointer);
    document.removeEventListener('keydown', this.onKey);
    this.root.remove();
    this.style.remove();
  }

  // ---------- building ----------

  private buildAvatar(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qt-avatar';
    btn.setAttribute('aria-label', AVATAR.alt);

    if (AVATAR.sprite) {
      // placeholder: crop the head out of a sprite sheet
      const { frameW, frameH, frame, crop } = AVATAR.sprite;
      const k = (AVATAR.size - 4) / crop.w;
      const s = document.createElement('div');
      Object.assign(s.style, {
        position: 'absolute',
        left: `${-crop.x * k}px`,
        top: `${-crop.y * k}px`,
        width: `${frameW}px`,
        height: `${frameH}px`,
        backgroundImage: `url(${AVATAR.src})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `${-frame * frameW}px 0`,
        imageRendering: 'pixelated',
        transform: `scale(${k})`,
        transformOrigin: '0 0',
      });
      btn.appendChild(s);
    } else {
      const img = document.createElement('img');
      img.src = AVATAR.src;
      img.alt = AVATAR.alt;
      btn.appendChild(img);
    }

    const poi = AVATAR.poi;
    if (poi) btn.addEventListener('click', () => this.choose({ label: AVATAR.alt, poi }, btn));
    else btn.classList.add('qt-static');
    return btn;
  }

  private buildItem(item: NavItem, top = false): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'qt-item' + (top ? ' qt-top' : '');

    // top-level links get their own car above them
    let car: HTMLImageElement | null = null;
    if (top) {
      car = document.createElement('img');
      car.className = 'qt-car';
      car.src = CAR.src;
      car.alt = '';
      car.draggable = false;
      li.appendChild(car);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qt-link';
    btn.textContent = item.label;
    li.appendChild(btn);

    // clicking the car = clicking its link
    car?.addEventListener('click', () => btn.click());

    const kids = item.children ?? [];
    if (kids.length) {
      li.classList.add('qt-has-sub');
      btn.setAttribute('aria-haspopup', 'true');

      const sub = document.createElement('ul');
      sub.className = 'qt-sub';
      for (const kid of kids) sub.appendChild(this.buildItem(kid));
      li.appendChild(sub);

      li.addEventListener('mouseleave', () => li.classList.remove('qt-suppress'));
      btn.addEventListener('click', () => {
        if (window.matchMedia('(hover: hover)').matches) return; // mouse: hover opens it
        const wasOpen = li.classList.contains('open'); // touch: tap toggles it
        li.parentElement?.querySelectorAll(':scope > .qt-item.open').forEach((el) => el.classList.remove('open'));
        li.classList.toggle('open', !wasOpen);
      });
    } else {
      btn.addEventListener('click', () => this.choose(item, btn));
    }
    return li;
  }

  // ---------- behaviour ----------

  private choose(item: NavItem, btn: HTMLElement): void {
    if (this.locked) return;
    if (!item.poi) {
      console.warn(`[Navbar] "${item.label}" has no poi and no children`);
      return;
    }
    // keep the dropdown shut until the mouse leaves it (it would otherwise stay open under the cursor)
    let li: HTMLElement | null | undefined = btn.closest<HTMLElement>('.qt-item')?.parentElement?.closest<HTMLElement>('.qt-item');
    while (li) {
      li.classList.add('qt-suppress');
      li = li.parentElement?.closest<HTMLElement>('.qt-item');
    }
    this.closeMenus();
    btn.blur(); // so Enter/Space can't re-fire the button while playing
    this.onSelect(item);
  }

  private closeMenus(): void {
    this.root.classList.remove('qt-open');
    this.burger?.setAttribute('aria-expanded', 'false');
    this.root.querySelectorAll('.qt-item.open').forEach((el) => el.classList.remove('open'));
  }

  private readonly onDocPointer = (e: PointerEvent): void => {
    if (!this.root.contains(e.target as Node)) this.closeMenus();
  };

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.closeMenus();
  };
}