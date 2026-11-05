(() => {
  'use strict';

  const key = 'lirinUpgradeCoinsV1';
  const normalize = s => s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").toLowerCase().replace(/\s+/g, ' ');
  const aliases = new Map([['dragon scale', 'dragon scales'], ['dragon claws', 'dragon claw']]);
  const norm = s => aliases.get(normalize(s)) || normalize(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
  const fmt = n => new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 6
  }).format(n);
  let worker = null,
    serial = 0,
    timer;
  function example() {
    return {
      "prices": {
        "multicolored pearl": 170,
        "fencing pamphlet": 300,
        "demon's ashes": 200,
        "azrael's dye": 130,
        "dragon scales": 270,
        "dragon claw": 270,
        "blue dragon's wing": 410
      },
      "coins": [{
        "name": "Otherworld",
        "balance": 16,
        "offers": [["Demon's Ashes", 2], ["Azrael's Dye", 3], ["Blue Dragon's Wing", 4], ["Dragon Scales", 2], ["Dragon Claw", 2], ["Multicolored Pearl", 3]]
      }, {
        "name": "Beran",
        "balance": 27,
        "offers": [["Dragon Claw", 4], ["Dragon Scales", 4], ["Blue Dragon's Wing", 6]]
      }, {
        "name": "Azrael",
        "balance": 65,
        "offers": [["Demon's Ashes", 5], ["Azrael's Dye", 5]]
      }],
      "needs": [["Multicolored Pearl", 5], ["Fencing Pamphlet", 3], ["Demon's Ashes", 13], ["Azrael's Dye", 7], ["Dragon Scales", 9], ["Dragon Claw", 9], ["Blue Dragon's Wing", 3]]
    };
  }
  let state;
  try {
    state = JSON.parse(localStorage.getItem(key));
  } catch {}
  if (!state || !Array.isArray(state.coins) || !Array.isArray(state.needs) || !state.prices || typeof state.prices !== 'object' || Array.isArray(state.prices) || !state.coins.every(c => c && typeof c.name === 'string' && Array.isArray(c.offers) && c.offers.every(o => Array.isArray(o) && typeof o[0] === 'string')) || !state.needs.every(n => Array.isArray(n) && typeof n[0] === 'string')) state = example();
  function input(value, attrs) {
    return `<input value="${esc(value ?? '')}" ${attrs}>`;
  }
  function price(name) {
    return input(Object.hasOwn(state.prices, norm(name)) ? state.prices[norm(name)] : null, `type="text" autocomplete="off" data-price="${esc(norm(name))}" aria-label="Price in kk for ${esc(name)}"`);
  }
  function render() {
    document.querySelector('#coins').innerHTML = state.coins.map((c, i) => `<div class="coin"><div class="coinhead"><label>Coin name${input(c.name, `data-c="${i}" data-field="name" aria-label="Coin name"`)}</label><label>Balance${input(c.balance, `type="number" min="0" step="1" data-c="${i}" data-field="balance" aria-label="Balance ${esc(c.name)}"`)}</label><button class="remove" data-delcoin="${i}" aria-label="Remove coin">×</button></div><div class="offer colheads"><span>Material</span><span>Coins / item</span><span>Yang / item (kk)</span><span></span></div><div class="rows">${c.offers.map((o, j) => `<div class="offer">${input(o[0], `list="materials" data-c="${i}" data-o="${j}" data-part="0" aria-label="Material"`)}${input(o[1], `type="number" min="1" step="1" data-c="${i}" data-o="${j}" data-part="1" aria-label="Coins per item"`)}${price(o[0])}<button class="remove" data-deloffer="${i},${j}" aria-label="Remove offer">×</button></div>`).join('')}</div><button class="add ghost" data-addoffer="${i}">+ Add offer</button></div>`).join('') || '<p>Add your first coin, or calculate purchases using Yang only.</p>';
    document.querySelector('#needs').innerHTML = state.needs.map((n, i) => `<div class="need">${input(n[0], `list="materials" data-n="${i}" data-part="0" aria-label="Required material"`)}${input(n[1], `type="number" min="0" step="1" data-n="${i}" data-part="1" aria-label="Required quantity"`)}${price(n[0])}<button class="remove" data-delneed="${i}" aria-label="Remove material">×</button></div>`).join('');
    renderSuggestions();
    renderPicker();
  }
  function changed() {
    ["total-summary", "saved-summary", "pay-summary"].forEach(id => document.getElementById(id).textContent = "—");
    serial++;
    if (worker) {
      worker.terminate();
      worker = null;
    }
    document.querySelector('#calculate').disabled = false;
    document.querySelector('#calculate').textContent = 'Calculate best plan →';
    clearTimeout(timer);
    timer = setTimeout(calculate, 160);
    document.querySelector('#result').setAttribute('aria-busy', 'true');
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      document.querySelector('#save').textContent = 'Local saving is unavailable in this browser.';
    }
  }
  // Update model and matching price inputs without rebuilding focused controls.
  document.addEventListener('input', e => {
    const t = e.target,
      d = t.dataset;
    if (t.tagName !== 'INPUT') return;
    const number = () => t.value === '' ? null : Number(t.value);
    if ('price' in d) {
      if (d.price) {
        Object.defineProperty(state.prices, d.price, {
          value: t.value,
          enumerable: true,
          writable: true,
          configurable: true
        });
        document.querySelectorAll('[data-price]').forEach(el => {
          if (el !== t && el.dataset.price === d.price) el.value = t.value;
        });
      }
    } else if ('o' in d) state.coins[d.c].offers[d.o][d.part] = d.part === '0' ? t.value : number();else if ('c' in d) state.coins[d.c][d.field] = d.field === 'name' ? t.value : number();else if ('n' in d) state.needs[d.n][d.part] = d.part === '0' ? t.value : number();else return;
    if (d.part === '0') {
      const el = t.parentElement.querySelector('[data-price]'),
        name = norm(t.value);
      el.dataset.price = name;
      el.value = Object.hasOwn(state.prices, name) ? state.prices[name] ?? '' : '';
      el.setAttribute('aria-label', 'Price in kk for ' + t.value);
    }
    changed();
  });
  document.addEventListener('change', e => {
    if (e.target.dataset.part === '0') renderSuggestions();
  });
  document.addEventListener('click', e => {
    const d = e.target.dataset;
    let yes = true;
    if ('delcoin' in d) state.coins.splice(+d.delcoin, 1);else if ('addoffer' in d) state.coins[d.addoffer].offers.push(['', 1]);else if ('deloffer' in d) {
      const [i, j] = d.deloffer.split(',');
      state.coins[i].offers.splice(j, 1);
    } else if ('delneed' in d) state.needs.splice(+d.delneed, 1);else yes = false;
    if (yes) {
      changed();
      render();
    }
  });
  document.querySelector('#addcoin').onclick = () => {
    state.coins.push({
      name: 'New coin',
      balance: 0,
      offers: []
    });
    changed();
    render();
  };
  document.querySelector('#addneed').onclick = () => {
    state.needs.push(['', 1]);
    changed();
    render();
  };
  document.querySelector('#example').onclick = () => {
    if (confirm('Replace your current inputs with the helmet +4 example?')) {
      state = example();
      changed();
      render();
      calculate();
    }
  };
  document.querySelector('#clear').onclick = () => {
    if (confirm('Clear all coins, offers and required materials?')) {
      state = {
        prices: {},
        coins: [],
        needs: []
      };
      changed();
      render();
    }
  };
  function prepare() {
    const integer = (v, min = 0) => Number.isSafeInteger(v) && v >= min;
    if (!state.needs.length) throw Error('Add at least one required material.');
    for (const c of state.coins) {
      if (!c.name.trim() || !integer(c.balance)) throw Error('Each coin needs a name and a whole-number balance of zero or more.');
      for (const o of c.offers) if (!o[0].trim() || !integer(o[1], 1)) throw Error('Each offer needs a material name and a whole-number cost greater than zero.');
    }
    const grouped = new Map();
    for (const [name, qty] of state.needs) {
      if (!name.trim() || !integer(qty)) throw Error('Enter material names and whole-number quantities of zero or more.');
      if (!qty) continue;
      const k = norm(name),
        p = yangPrice(state.prices[k]);
      if (!Number.isSafeInteger(p) || p < 0) throw Error('Enter a valid Yang price for ' + name + '.');
      if (!grouped.has(k)) grouped.set(k, {
        name,
        qty: 0,
        price: p,
        costs: state.coins.map(c => {
          const costs = c.offers.filter(o => norm(o[0]) === k).map(o => o[1]);
          return costs.length ? Math.min(...costs) : 0;
        })
      });
      grouped.get(k).qty += qty;
    }
    const items = [...grouped.values()].filter(it => it.qty);
    if (!items.length) throw Error('Enter at least one quantity greater than zero.');
    if (!Number.isSafeInteger(items.reduce((sum, it) => sum + it.price * it.qty, 0)) || items.some(it => !Number.isSafeInteger(it.qty))) throw Error('The total is too large to calculate exactly.');
    return {
      items,
      coins: state.coins.map(c => ({
        name: c.name,
        balance: c.balance
      }))
    };
  }
  function show(data, r) {
    const {
      items,
      coins
    } = data;
    document.getElementById('total-summary').textContent = fmt(r.total / 1e6) + 'kk';
    document.getElementById('saved-summary').textContent = fmt(r.saved / 1e6) + 'kk';
    document.getElementById('pay-summary').textContent = fmt((r.total - r.saved) / 1e6) + 'kk';
    document.querySelector('#result').innerHTML = `<div class="sectionhead"><h2>Purchase Plan</h2><span class="badge">✓ Exact optimum</span></div><div class="stats"><div class="stat"><span class="tiny">YANG TO PAY</span><strong>${fmt((r.total - r.saved) / 1e6)}kk</strong></div><div class="stat"><span class="tiny">YANG SAVED</span><strong>${fmt(r.saved / 1e6)}kk</strong></div><div class="stat"><span class="tiny">WITHOUT COINS</span><strong>${fmt(r.total / 1e6)}kk</strong></div></div><div class="panel tablewrap"><table><thead><tr><th>Pay with</th><th>What to buy</th><th>Spent</th><th>Remaining</th></tr></thead><tbody>${coins.map((c, j) => `<tr><td>${esc(c.name)}</td><td>${items.map((it, i) => r.bought[i][j] ? `${r.bought[i][j]} × ${esc(it.name)}` : '').filter(Boolean).join(' · ') || 'No purchase'}</td><td>${fmt(r.used[j])} coin</td><td>${fmt(c.balance - r.used[j])} coin</td></tr>`).join('')}${items.map((it, i) => {
      const q = it.qty - r.bought[i].reduce((a, b) => a + b, 0);
      return q ? `<tr><td>Yang</td><td>${q} × ${esc(it.name)}</td><td>${fmt(q * it.price / 1e6)}kk</td><td>—</td></tr>` : '';
    }).join('')}</tbody></table></div><p class="tiny">All required quantities are covered. Multiple plans may achieve the same savings. Prices are rounded to the nearest Yang.</p>`;
  }
  function calculate() {
    clearTimeout(timer);
    document.querySelector('#result').removeAttribute('aria-busy');
    if (worker) worker.terminate();
    const out = document.querySelector('#result'),
      btn = document.querySelector('#calculate');
    let data;
    try {
      data = prepare();
    } catch (e) {
      out.innerHTML = `<p class="error">${esc(e.message)}</p>`;
      return;
    }
    const version = serial;
    btn.disabled = true;
    btn.textContent = 'Comparing combinations…';
    out.innerHTML = '<p>Comparing the complete plan. Editing your inputs will stop the calculation.</p>';
    const current = worker = new Worker('/upgrade-coin-calculator/worker.js');
    worker.onmessage = e => {
      if (serial !== version || worker !== current) return;
      current.terminate();
      worker = null;
      btn.disabled = false;
      btn.textContent = 'Calculate best plan →';
      if (e.data.error) out.innerHTML = `<p class="error">${esc(e.data.error)}</p>`;else show(data, e.data.result);
    };
    worker.onerror = () => {
      if (worker !== current) return;
      current.terminate();
      worker = null;
      btn.disabled = false;
      btn.textContent = 'Calculate best plan →';
      out.innerHTML = '<p class="error">Calculation could not finish. Try a smaller setup or another browser.</p>';
    };
    worker.postMessage(data);
  }
  function yangPrice(raw) {
    if (typeof raw === 'number') return Math.round(raw * 1e6); // V1 stored kk.
    if (typeof raw !== 'string') return null;
    const amount = parseMoney(raw);
    if (amount === null) return null;
    return Math.round(amount * (/k\s*$/i.test(raw) ? 1 : 1e6));
  }
  function renderSuggestions() {
    const names = new Map();
    const all = [...Object.values(MAT), ...state.needs.map(n => n[0]), ...state.coins.flatMap(c => c.offers.map(o => o[0]))];
    for (const name of all) if (name && !names.has(norm(name))) names.set(norm(name), name);
    $('materials').innerHTML = [...names.values()].sort().map(n => `<option value="${esc(n)}"></option>`).join('');
  }
  function renderPicker() {
    const selection = state.recipe;
    const item = ITEMS.find(it => it.n === selection?.name);
    $('item').value = item?.n || '';
    $('target-label').hidden = !item;
    if (item) {
      const levels = item.steps.flatMap((row, i) => row ? [i] : []);
      const last = selection.steps.at(-1);
      const prefix = levels.filter(i => i <= last);
      $('target').innerHTML = '<option value="" disabled>Custom steps</option>' + levels.map(i => `<option value="${i}">${i ? '+' + i : 'Craft only'}</option>`).join('');
      $('target').value = prefix.length && prefix.join() === selection.steps.join() ? String(last) : '';
    }
    $('steps').innerHTML = item ? item.steps.map((row, i) => row ? `<button type="button" class="btn" data-step="${i}" aria-pressed="${selection.steps.includes(i)}">${i ? '+' + i : 'Craft'}</button>` : '').join('') : '';
    $('recipe-note').textContent = item ? 'Changing a step rebuilds the material list for this item.' : 'Choosing an item replaces the required materials. Your shops and prices are kept.';
  }
  function applyRecipe(item, steps, source = {}) {
    const attempts = i => i ? 1 + Math.min(Math.max(0, Math.floor(source.fails?.[item.n + '|' + i] || 0)), item.fails?.[i] || 99) : 1;
    const totals = recipeTotals(item, steps, attempts, id => Number(source.adj?.[item.n + '|' + id]) || 0);
    state.recipe = {
      name: item.n,
      steps,
      fails: source.fails,
      adj: source.adj
    };
    state.needs = Object.entries(totals.q).filter(([, qty]) => qty > 0).map(([id, qty]) => {
      const name = MAT[id] || id;
      const price = source.price?.[id];
      if (Number.isFinite(price) && price >= 0) state.prices[norm(name)] = String(price / 1e6) + 'kk';
      return [name, qty];
    });
    render();
    changed();
  }
  function importUpgrade() {
    let source;
    try {
      source = JSON.parse(localStorage.getItem('lirinUpgradeV2'));
    } catch {}
    const item = ITEMS.find(it => it.n === source?.item);
    if (!item) {
      $('recipe-note').textContent = 'Choose an item on the Upgrade Cost page first, or select one above.';
      return;
    }
    const steps = item.steps.flatMap((row, i) => row && !source.off?.[item.n]?.[i] ? [i] : []);
    applyRecipe(item, steps, source);
  }
  $('item').innerHTML = '<option value="" disabled>Choose an item…</option>' + CATS.map((cat, i) => `<optgroup label="${esc(cat)}">${ITEMS.filter(it => it.c === i).map(it => `<option value="${esc(it.n)}">${esc(it.n)}</option>`).join('')}</optgroup>`).join('');
  $('item').onchange = e => {
    const item = ITEMS.find(it => it.n === e.target.value);
    applyRecipe(item, item.steps.flatMap((row, i) => row ? [i] : []));
  };
  $('target').onchange = e => {
    const recipe = state.recipe;
    const item = ITEMS.find(it => it.n === recipe.name);
    applyRecipe(item, item.steps.flatMap((row, i) => row && i <= Number(e.target.value) ? [i] : []), recipe);
  };
  $('steps').onclick = e => {
    if (!e.target.hasAttribute('data-step')) return;
    const recipe = state.recipe,
      step = Number(e.target.dataset.step);
    const steps = recipe.steps.includes(step) ? recipe.steps.filter(i => i !== step) : [...recipe.steps, step].sort((a, b) => a - b);
    applyRecipe(ITEMS.find(it => it.n === recipe.name), steps, recipe);
  };
  $('import').onclick = importUpgrade;
  $('calculate').onclick = calculate;
  for (const name of Object.keys(state.prices)) {
    const canonical = norm(name);
    if (name !== canonical) {
      if (!Object.hasOwn(state.prices, canonical)) state.prices[canonical] = state.prices[name];
      delete state.prices[name];
    }
  }
  render();
  if (new URLSearchParams(location.search).get('import') === 'upgrade') {
    importUpgrade();
    history.replaceState(null, '', location.pathname);
  }
  calculate();
})();
