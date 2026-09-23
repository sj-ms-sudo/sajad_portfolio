import { AVATAR, NAV_HEIGHT, type NavItem } from '../../game/data/nav';

const STYLE_ID = 'qt-nav-style';

const CSS = `
.qt-nav{position:fixed;top:0;left:0;right:0;height:${NAV_HEIGHT}px;z-index:900;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:0 12px;background:#ff8fe8;border-bottom:3px solid #8a0f6e;box-shadow:inset 0 2px 0 #ffc8f4;font-family:"Silkscreen","Courier New",monospace;font-size:12px;font-weight:bold;user-select:none}
.qt-nav *{box-sizing:border-box}

.qt-avatar{position:relative;flex:none;width:${AVATAR.size}px;height:${AVATAR.size}px;padding:0;overflow:hidden;background:#ffc8f4;border:2px solid #8a0f6e;border-radius:50%;box-shadow:0 0 0 2px #fff0fb;cursor:pointer}
.qt-avatar.qt-static{cursor:default}
.qt-avatar:not(.qt-static):hover{background:#fff0fb}
.qt-avatar img{width:100%;height:100%;object-fit:cover;display:block}

.qt-menu{display:flex;align-items:stretch;gap:2px;height:100%;margin:0 0 0 auto;padding:0;list-style:none}
.qt-item{position:relative;display:flex;align-items:center}
.qt-link{font:inherit;color:#8a0f6e;background:transparent;border:2px solid transparent;padding:8px 12px;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:.5px}
.qt-link:hover,.qt-link:focus-visible{background:#fff0fb;border-color:#8a0f6e;outline:none}
.qt-has-sub>.qt-link::after{content:"";display:inline-block;margin-left:7px;vertical-align:middle;border:4px solid transparent;border-top:5px solid currentColor;border-bottom:0}

.qt-sub{display:none;position:absolute;top:100%;right:0;min-width:210px;margin:0;padding:4px;list-style:none;background:#fff0fb;border:3px solid #8a0f6e;box-shadow:4px 4px 0 rgba(138,15,110,.35);z-index:1}
.qt-sub .qt-item{display:block}
.qt-sub .qt-link{display:block;width:100%;text-align:left}
.qt-sub .qt-link:hover,.qt-sub .qt-link:focus-visible{background:#ffc8f4}
.qt-sub .qt-sub{top:-7px;right:100%}

.qt-item.open>.qt-sub{display:block}
@media (hover:hover){.qt-item:hover>.qt-sub{display:block}}
.qt-item:has(:focus-visible)>.qt-sub{display:block}
.qt-item.qt-suppress>.qt-sub{display:none!important}

.qt-burger{display:none;margin-left:auto;font:inherit;font-size:18px;line-height:1;color:#8a0f6e;background:#fff0fb;border:2px solid #8a0f6e;padding:6px 10px;cursor:pointer}

.qt-locked .qt-menu,.qt-locked .qt-avatar,.qt-locked .qt-burger{opacity:.45;pointer-events:none}

@media (max-width:720px){
  .qt-burger{display:block}
  .qt-menu{display:none;position:absolute;top:100%;left:0;right:0;height:auto;flex-direction:column;align-items:stretch;gap:0;margin:0;padding:6px 8px;background:#ff8fe8;border-bottom:3px solid #8a0f6e;max-height:calc(100vh - ${NAV_HEIGHT}px);overflow-y:auto}
  .qt-nav.qt-open .qt-menu{display:flex}
  .qt-item{display:block}
  .qt-link{width:100%;text-align:left}
  .qt-has-sub>.qt-link::after{display:none}
  .qt-sub,.qt-sub .qt-sub{display:block;position:static;min-width:0;padding:0 0 0 14px;background:transparent;border:0;box-shadow:none}
}
`;

/**
 * Top navigation bar (plain DOM, sits above the game canvas).
 * The avatar is on the left, the menu on the right. The tree comes from data/nav.ts.
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
    for (const item of items) menu.appendChild(this.buildItem(item));
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

  private buildItem(item: NavItem): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'qt-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qt-link';
    btn.textContent = item.label;
    li.appendChild(btn);

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