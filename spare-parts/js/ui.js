// ============================================================
//  SPARE PARTS — MENUS, HINTS AND THE CONTROLS PANEL
// ============================================================
window.SP = window.SP || {};

SP.UI = (function () {
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  let menuBox, menuItems = [], selected = 0, hintBox, levelBox, controlsBox, toastBox, toastTimer = 0;
  const handlers = {};

  const CONTROLS = `
    <h2>Controls</h2>
    <table>
      <tr><th></th><th class="p1">Bolt</th><th class="p2">Nutty</th><th>Controller</th></tr>
      <tr><td>Move</td><td>W A S D</td><td>Arrows</td><td>Left stick</td></tr>
      <tr><td>Jump</td><td>Space</td><td>Enter</td><td>A</td></tr>
      <tr><td>Throw arm</td><td>Q</td><td>,</td><td>RB / X</td></tr>
      <tr><td>Throw leg</td><td>E</td><td>.</td><td>RT / Y</td></tr>
      <tr><td>Call limbs back</td><td>R</td><td>/</td><td>LB / B</td></tr>
      <tr><td>Silly dance</td><td>G</td><td>'</td><td>Back</td></tr>
    </table>
    <ul>
      <li>Walk over any arm or leg to stick it on (up to 4 of each).</li>
      <li><b>Your limbs always listen to YOU</b>, even when your friend wears them.</li>
      <li>Your arm on your friend: <b>tap</b> = slap, <b>hold</b> = grab, <b>hold call back</b> = pull them to you.</li>
      <li>Your leg on your friend: throw-leg button = <b>kick</b>.</li>
      <li>Wearing your friend's legs? You both steer, and you both press jump for the <b>SUPER JUMP</b>.</li>
      <li>Arms and legs can press buttons too!</li>
    </ul>
    <p class="small">H = show/hide this · Esc or P = pause · M = music on/off</p>`;

  function init() {
    levelBox = el('div', 'sp-level');
    hintBox = el('div', 'sp-hint');
    toastBox = el('div', 'sp-toast');
    controlsBox = el('div', 'sp-controls', CONTROLS);
    controlsBox.hidden = true;
    const corner = el('div', 'sp-corner', 'H controls · Esc pause · M music');
    menuBox = el('div', 'sp-menu');
    menuBox.hidden = true;
    document.body.append(levelBox, hintBox, toastBox, controlsBox, corner, menuBox);
    hint(null);

    window.addEventListener('keydown', (e) => {
      if (SP.Audio) SP.Audio.start();
      if (!menuBox.hidden) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) move(-1);
        else if (['ArrowDown', 'KeyS'].includes(e.code)) move(1);
        else if (['Enter', 'Space', 'NumpadEnter'].includes(e.code)) choose();
        else if (e.code === 'Escape' && handlers.back) handlers.back();
        e.preventDefault();
        return;
      }
      if (e.code === 'KeyH') toggleControls();
      if (e.code === 'KeyM' && SP.Audio) toast(SP.Audio.toggleMusic() ? 'Music on 🎵' : 'Music off');
      if ((e.code === 'Escape' || e.code === 'KeyP') && handlers.pause) handlers.pause();
    });
    window.addEventListener('pointerdown', () => SP.Audio && SP.Audio.start());
  }

  // show a menu: { title, text, items: [{ label, action }] }
  function menu({ title, text = '', items, back = null, big = false }) {
    menuBox.innerHTML = '';
    const card = el('div', 'sp-card' + (big ? ' big' : ''));
    if (title) card.append(el('h1', '', title));
    if (text) card.append(el('div', 'sp-text', text));
    const list = el('div', 'sp-items');
    menuItems = items.map((item, i) => {
      const b = el('button', 'sp-item', item.label);
      b.type = 'button';
      b.addEventListener('mouseenter', () => select(i));
      b.addEventListener('click', () => { select(i); choose(); });
      list.append(b);
      return { ...item, button: b };
    });
    card.append(list);
    menuBox.append(card);
    menuBox.hidden = false;
    handlers.back = back;
    select(0);
  }

  function closeMenu() { menuBox.hidden = true; menuItems = []; }
  const menuOpen = () => !menuBox.hidden;

  function select(i) {
    if (!menuItems.length) return;
    selected = (i + menuItems.length) % menuItems.length;
    menuItems.forEach((m, k) => m.button.classList.toggle('on', k === selected));
  }
  function move(d) { select(selected + d); if (SP.Audio) SP.Audio.play('menu'); }
  function choose() {
    const item = menuItems[selected];
    if (item) { if (SP.Audio) SP.Audio.play('click'); item.action(); }
  }

  // controllers can use menus too: up/down to pick, A to choose, B to go back
  const padPrev = {};
  function pollPads() {
    if (menuBox.hidden) return;
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { /* no gamepads */ }
    for (const gp of pads) {
      if (!gp) continue;
      const b = (n) => gp.buttons[n] && gp.buttons[n].pressed;
      const now = { up: b(12) || gp.axes[1] < -0.6, down: b(13) || gp.axes[1] > 0.6, ok: b(0) || b(9), back: b(1) };
      const was = padPrev[gp.index] || {};
      if (now.up && !was.up) move(-1);
      if (now.down && !was.down) move(1);
      if (now.ok && !was.ok) { if (SP.Audio) SP.Audio.start(); choose(); }
      if (now.back && !was.back && handlers.back) handlers.back();
      padPrev[gp.index] = now;
    }
  }

  function hint(text) {
    if (text === hintBox.dataset.text) return;
    hintBox.dataset.text = text || '';
    hintBox.textContent = text || '';
    hintBox.classList.toggle('show', !!text);
  }

  function level(text) { levelBox.textContent = text; levelBox.hidden = !text; }

  function toggleControls(force) {
    controlsBox.hidden = force !== undefined ? !force : !controlsBox.hidden;
  }

  function toast(text, seconds = 1.6) {
    toastBox.textContent = text;
    toastBox.classList.add('show');
    toastTimer = seconds;
  }

  function update(dt) {
    pollPads();
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastBox.classList.remove('show'); }
  }

  return { init, menu, closeMenu, menuOpen, hint, level, toggleControls, toast, update, on: (name, f) => { handlers[name] = f; } };
})();
