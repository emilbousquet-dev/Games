// ============================================================
//  DEAD ACRES — BACKPACK, CRAFTING and CUPBOARDS
//  30 squares. The first 6 are your hotbar (keys 1-6).
// ============================================================
window.DA = window.DA || {};

DA.Inv = (function () {
  const U = DA.U, ITEMS = DA.ITEMS, RECIPES = DA.RECIPES;
  const SIZE = 30, HOT = 6;

  const I = {
    SIZE, HOT,
    slots: new Array(SIZE).fill(null),
    sel: 0,
    onChange: null,     // called when anything changes (the HUD redraws)
    icons: {},

    def: (id) => ITEMS[id] || { name: id, stack: 1, kind: 'mat' },
    held() { return I.slots[I.sel]; },
    heldDef() { const s = I.slots[I.sel]; return s ? I.def(s.id) : null; },
    changed() { if (I.onChange) I.onChange(); if (UI.open) UI.draw(); },

    count(id) { let n = 0; for (const s of I.slots) if (s && s.id === id) n += s.n; return n; },

    // add items, returns how many didn't fit
    add(id, n, quiet) {
      const st = I.def(id).stack;
      for (const s of I.slots) {
        if (n <= 0) break;
        if (s && s.id === id && s.n < st) { const k = Math.min(n, st - s.n); s.n += k; n -= k; }
      }
      // new squares: fill the hotbar first for tools, the backpack first for materials
      const kind = I.def(id).kind;
      const order = [...Array(SIZE).keys()];
      if (kind === 'mat' || kind === 'special') order.sort((a, b) => (a < HOT) - (b < HOT) || a - b);
      for (const i of order) {
        if (n <= 0) break;
        if (!I.slots[i]) { const k = Math.min(n, st); I.slots[i] = { id, n: k }; n -= k; }
      }
      if (!quiet) I.changed();
      return n;
    },

    remove(id, n) {
      for (let i = SIZE - 1; i >= 0 && n > 0; i--) {
        const s = I.slots[i];
        if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) I.slots[i] = null; }
      }
      I.changed();
      return n === 0;
    },
    removeAt(i, n = 1) {
      const s = I.slots[i];
      if (!s) return null;
      const k = Math.min(n, s.n);
      s.n -= k;
      if (s.n <= 0) I.slots[i] = null;
      I.changed();
      return { id: s.id, n: k };
    },

    canCraft(r) { for (const id in r.need) if (I.count(id) < r.need[id]) return false; return true; },
    craft(r) {
      if (!I.canCraft(r)) return false;
      for (const id in r.need) I.remove(id, r.need[id]);
      const left = I.add(r.item, r.out || 1);
      if (left > 0) DA.Game.dropItems([[r.item, left]]);
      return true;
    },

    // everything as a simple list (for saving, dying, sending)
    dump() { return I.slots.map((s) => (s ? [s.id, s.n] : null)); },
    load(list) {
      I.slots = new Array(SIZE).fill(null);
      if (list) list.forEach((s, i) => { if (s && ITEMS[s[0]] && i < SIZE) I.slots[i] = { id: s[0], n: s[1] }; });
      I.changed();
    },
    clear() { I.slots = new Array(SIZE).fill(null); I.changed(); },
    isEmpty() { return I.slots.every((s) => !s); },
  };

  // ============================================================
  //  ITEM PICTURES: each 3D item model is photographed once
  // ============================================================
  function makeIcons() {
    let r;
    try {
      r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { return; }
    r.setSize(96, 96); r.setPixelRatio(1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x404040, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(2, 3, 4); sc.add(dl);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    for (const id in ITEMS) {
      const m = DA.Models.Items.make(id);
      const g = new THREE.Group(); g.add(m);
      const long = ['stoneaxe', 'pickaxe', 'metalaxe', 'spear', 'bat', 'machete', 'torch', 'flashlight', 'arrow'].includes(id);
      if (long) g.rotation.z = -Math.PI / 4;
      g.rotation.y = long ? 0.3 : 0.6; if (!long) g.rotation.x = 0.35;
      sc.add(g);
      const box = new THREE.Box3().setFromObject(g);
      const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
      g.position.sub(c);
      cam.position.set(0, 0, sz * 1.9); cam.lookAt(0, 0, 0);
      r.render(sc, cam);
      I.icons[id] = r.domElement.toDataURL();
      sc.remove(g);
    }
    r.dispose();
    if (r.forceContextLoss) r.forceContextLoss();
  }
  I.makeIcons = makeIcons;

  const slotHTML = (s, i, extra = '') => {
    if (!s) return `<div class="slot empty ${extra}" data-i="${i}"></div>`;
    const d = I.def(s.id);
    return `<div class="slot ${extra}" data-i="${i}" title="${U.esc(d.name)}"><img src="${I.icons[s.id] || ''}" alt=""><span class="n">${s.n > 1 ? s.n : ''}</span></div>`;
  };
  I.slotHTML = slotHTML;

  // ============================================================
  //  THE BACKPACK SCREEN (Tab)
  // ============================================================
  const UI = {
    open: false,
    box: null,         // a cupboard / storage box we're looking into: { cid, name, items }
    picked: -1,        // a square we clicked (to move it)
    el: null,

    init() {
      UI.el = document.getElementById('inv');
      UI.el.addEventListener('mousedown', (e) => e.stopPropagation());
      UI.el.addEventListener('contextmenu', (e) => e.preventDefault());
      document.getElementById('invGrid').addEventListener('mouseup', (e) => UI.clickSlot(e, false));
      document.getElementById('boxGrid').addEventListener('mouseup', (e) => UI.clickBox(e));
      document.getElementById('craftList').addEventListener('click', (e) => {
        const row = e.target.closest('[data-r]');
        if (!row) return;
        const r = RECIPES[+row.dataset.r];
        if (I.craft(r)) { DA.Audio.craft(); UI.flash(`Made ${r.out > 1 ? r.out + ' x ' : ''}${I.def(r.item).name}!`); }
        else DA.Audio.error();
      });
      document.getElementById('takeAll').addEventListener('click', () => { if (UI.box) DA.Game.act({ t: 'takeAll', cid: UI.box.cid }); });
      document.getElementById('invClose').addEventListener('click', () => DA.Game.closeInventory());
      document.getElementById('invGrid').addEventListener('mouseover', (e) => UI.hover(e, false));
      document.getElementById('boxGrid').addEventListener('mouseover', (e) => UI.hover(e, true));
    },

    show(box) {
      UI.open = true; UI.box = box || null; UI.picked = -1;
      UI.el.style.display = 'flex';
      UI.el.classList.toggle('withBox', !!box);
      UI.draw();
    },
    hide() { UI.open = false; UI.box = null; UI.el.style.display = 'none'; },
    setBox(cid, items) { if (UI.box && UI.box.cid === cid) { UI.box.items = items; UI.draw(); } },

    flash(text) {
      const d = document.getElementById('invDesc');
      d.innerHTML = `<b style="color:#8f8">${U.esc(text)}</b>`;
    },

    hover(e, inBox) {
      const el = e.target.closest('.slot');
      if (!el) return;
      const i = +el.dataset.i;
      const s = inBox ? UI.box && UI.box.items[i] && { id: UI.box.items[i][0], n: UI.box.items[i][1] } : I.slots[i];
      const d = document.getElementById('invDesc');
      if (!s) { d.textContent = ''; return; }
      const def = I.def(s.id);
      const bits = [];
      if (def.food) bits.push(`🍖 +${def.food}`);
      if (def.water) bits.push(`💧 ${def.water > 0 ? '+' : ''}${def.water}`);
      if (def.hp) bits.push(`❤ ${def.hp > 0 ? '+' : ''}${def.hp}`);
      if (def.dmg && def.kind !== 'light') bits.push(`⚔ ${def.dmg} damage`);
      if (def.wood > 1) bits.push(`🪵 x${def.wood}`);
      if (def.stone > 1) bits.push(`🪨 x${def.stone}`);
      let how = '';
      if (inBox) how = 'Click to take.';
      else if (UI.box) how = 'Click to move. Right click to put in the ' + U.esc(UI.box.name) + '.';
      else if (def.kind === 'food' || def.kind === 'med') how = 'Right click to use it now.';
      else how = 'Click, then click another square to move it.';
      d.innerHTML = `<b>${U.esc(def.name)}</b> ${bits.join('  ')}<br><span>${U.esc(def.desc || '')}</span><br><i>${how}</i>`;
    },

    clickSlot(e, _) {
      const el = e.target.closest('.slot');
      if (!el) return;
      const i = +el.dataset.i;
      const s = I.slots[i];
      DA.Audio.click();
      if (e.button === 2 || e.shiftKey) { // right click: put in box, or use
        if (!s) return;
        if (UI.box) {
          const it = I.removeAt(i, s.n);
          DA.Game.act({ t: 'put', cid: UI.box.cid, item: [it.id, it.n] });
        } else {
          DA.Game.useItemAt(i);
        }
        return;
      }
      if (UI.picked < 0) { if (s) UI.picked = i; }
      else {
        if (UI.picked !== i) {
          const a = I.slots[UI.picked], b = I.slots[i];
          if (a && b && a.id === b.id) { // stack together
            const st = I.def(a.id).stack, k = Math.min(a.n, st - b.n);
            b.n += k; a.n -= k; if (a.n <= 0) I.slots[UI.picked] = null;
          } else { I.slots[UI.picked] = b; I.slots[i] = a; }
        }
        UI.picked = -1;
        I.changed();
      }
      UI.draw();
    },

    clickBox(e) {
      const el = e.target.closest('.slot');
      if (!el || !UI.box) return;
      const i = +el.dataset.i;
      if (!UI.box.items[i]) return;
      DA.Audio.click();
      DA.Game.act({ t: 'take', cid: UI.box.cid, slot: i });
    },

    draw() {
      if (!UI.open) return;
      let h = '<div class="row hot">';
      for (let i = 0; i < SIZE; i++) {
        if (i === HOT) h += '</div><div class="row">';
        else if (i > HOT && (i - HOT) % 6 === 0) h += '</div><div class="row">';
        h += slotHTML(I.slots[i], i, (i === UI.picked ? 'picked ' : '') + (i === I.sel ? 'sel' : ''));
      }
      h += '</div>';
      document.getElementById('invGrid').innerHTML = h;
      // crafting list
      let c = '';
      RECIPES.forEach((r, ri) => {
        const ok = I.canCraft(r);
        const need = Object.entries(r.need).map(([id, n]) => `<span class="${I.count(id) >= n ? 'have' : 'miss'}">${n} ${U.esc(I.def(id).name)}</span>`).join(', ');
        c += `<div class="recipe ${ok ? 'ok' : ''}" data-r="${ri}"><img src="${I.icons[r.item] || ''}" alt=""><div><b>${U.esc(I.def(r.item).name)}${r.out > 1 ? ' x' + r.out : ''}</b><br><small>${need}</small></div></div>`;
      });
      document.getElementById('craftList').innerHTML = c;
      // cupboard
      if (UI.box) {
        document.getElementById('boxTitle').textContent = UI.box.name;
        let b = '<div class="row">';
        const items = UI.box.items;
        if (!items) b += '<div class="wait">Searching...</div>';
        else {
          const n = Math.max(items.length, 6);
          for (let i = 0; i < n; i++) {
            if (i > 0 && i % 6 === 0) b += '</div><div class="row">';
            const s = items[i];
            b += slotHTML(s ? { id: s[0], n: s[1] } : null, i);
          }
          if (items.every((s) => !s)) b += '</div><div class="wait">Empty.</div><div class="row">';
        }
        b += '</div>';
        document.getElementById('boxGrid').innerHTML = b;
      }
    },
  };
  I.UI = UI;
  return I;
})();
