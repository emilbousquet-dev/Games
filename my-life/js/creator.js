// ============================================================
//  MY LIFE — CHARACTER CREATOR 🎨
//  Make YOU! You see yourself as a baby and as a grown-up.
// ============================================================
window.ML = window.ML || {};

ML.Creator = (function () {
  const U = ML.U, Life = ML.Life, Mo = ML.Models, Stage = ML.Stage;
  const $ = (id) => document.getElementById(id);
  let look = null, first = '', last = '';
  let spinTimer = null, built = false;

  const OPTIONS = [
    { key: 'skin', label: 'Skin', type: 'color', values: () => Life.SKINS },
    { key: 'hairStyle', label: 'Hair', type: 'text', values: () => [['short', 'Short'], ['spiky', 'Spiky'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['curly', 'Curly'], ['bun', 'Bun'], ['afro', 'Afro'], ['mohawk', 'Mohawk'], ['bald', 'Bald']] },
    { key: 'hair', label: 'Hair color', type: 'color', values: () => Life.HAIRS },
    { key: 'eyes', label: 'Eyes', type: 'color', values: () => Life.EYES },
    { key: 'top', label: 'Clothes', type: 'text', values: () => [['tshirt', 'T-shirt'], ['hoodie', 'Hoodie'], ['dress', 'Dress'], ['sweater', 'Sweater'], ['suit', 'Suit']] },
    { key: 'shirt', label: 'Top color', type: 'color', values: () => Life.SHIRTS },
    { key: 'pants', label: 'Pants', type: 'color', values: () => Life.PANTS },
    { key: 'shoes', label: 'Shoes', type: 'color', values: () => [0xf4f4f4, 0x2a2a30, 0xe83a3a, 0x3a6ae8, 0x8a5a3a, 0xffc83a] },
    { key: 'extra', label: 'Extra', type: 'text', values: () => [['none', 'None'], ['glasses', 'Glasses'], ['sunglasses', 'Shades'], ['cap', 'Cap'], ['bow', 'Bow'], ['headband', 'Headband']] },
  ];

  function randomize() {
    const g = U.pick(['f', 'm']);
    look = Life.randomLook(g);
    look.bag = undefined;
    if (!['none', 'glasses', 'sunglasses', 'cap', 'bow', 'headband'].includes(look.extra)) look.extra = 'none';
    first = U.pick(Life.NAMES[g]);
    last = U.pick(Life.LAST);
    $('cr-first').value = first;
    $('cr-last').value = last;
  }

  function buildControls() {
    const box = $('cr-opts');
    box.innerHTML = '';
    for (const o of OPTIONS) {
      const row = document.createElement('div');
      row.className = 'cr-row';
      row.innerHTML = `<label>${o.label}</label><div class="cr-vals"></div>`;
      const vals = row.querySelector('.cr-vals');
      for (const v of o.values()) {
        const b = document.createElement('button');
        const val = o.type === 'color' ? v : v[0];
        if (o.type === 'color') { b.className = 'sw'; b.style.background = ML.Tex.css(v); }
        else { b.className = 'tx'; b.textContent = v[1]; }
        b.dataset.key = o.key; b.dataset.val = val;
        b.onclick = () => { look[o.key] = val; ML.Audio.click(); refresh(); };
        vals.appendChild(b);
      }
      box.appendChild(row);
    }
  }
  function markSelected() {
    for (const b of document.querySelectorAll('#cr-opts button')) {
      const v = b.dataset.val;
      const cur = look[b.dataset.key];
      b.classList.toggle('on', String(cur) === v);
    }
  }
  function refresh() {
    markSelected();
    const keepRot = Stage.get('grown') ? Stage.get('grown').rot : 0;
    Stage.addActor('grown', Mo.person(look, 'adult'), 'grown', {});
    Stage.addActor('baby', Mo.person(look, 'baby'), 'baby', { pose: 'babysit' });
    Stage.get('grown').rot = keepRot;
    Stage.get('baby').rot = keepRot;
  }

  async function open() {
    ML.Game.show('creator');
    if (!built) { buildControls(); built = true; }
    randomize();
    await Stage.setScene('studio');
    refresh();
    clearInterval(spinTimer);
    spinTimer = setInterval(() => {
      for (const id of ['grown', 'baby']) { const a = Stage.get(id); if (a) { a.rot += 0.012; a.faceAngle = null; } }
    }, 16);
  }
  function start() {
    first = ($('cr-first').value || '').trim().slice(0, 14) || U.pick(Life.NAMES.f);
    last = ($('cr-last').value || '').trim().slice(0, 14) || U.pick(Life.LAST);
    first = first[0].toUpperCase() + first.slice(1);
    last = last[0].toUpperCase() + last.slice(1);
    clearInterval(spinTimer);
    ML.Audio.levelUp();
    ML.Game.beginLife(first, last, Object.assign({}, look));
  }

  function init() {
    $('cr-random').onclick = () => { randomize(); ML.Audio.boing(); refresh(); };
    $('cr-dice1').onclick = () => { $('cr-first').value = U.pick(Life.NAMES[U.pick(['f', 'm'])]); };
    $('cr-dice2').onclick = () => { $('cr-last').value = U.pick(Life.LAST); };
    $('cr-go').onclick = start;
    $('cr-back').onclick = () => { clearInterval(spinTimer); ML.Game.titleScreen(); };
  }

  return { open, init };
})();
