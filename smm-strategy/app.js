/**
 * SMM Стратег — UI
 */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    platform: $('#platform'),
    goal: $('#goal'),
    focus: $('#focus'),
    postsPerDay: $('#postsPerDay'),
    month: $('#month'),
    year: $('#year'),
    slots: $('#slots-editor'),
    generate: $('#btn-generate'),
    csv: $('#btn-csv'),
    resetSlots: $('#btn-reset-slots'),
    output: $('#output')
  };

  let lastStrategy = null;

  const PURPOSE_OPTS = Object.values(StrategyEngine.PURPOSES);
  const FORMAT_OPTS = Object.values(StrategyEngine.FORMATS);

  function fillMonths() {
    const now = new Date().getMonth() + 1;
    els.month.innerHTML = StrategyEngine.MONTHS_UK.map(
      (name, i) =>
        `<option value="${i + 1}" ${i + 1 === now ? 'selected' : ''}>${name}</option>`
    ).join('');
  }

  function defaultSlots(n) {
    const tpl = StrategyEngine.DAILY_TEMPLATES[n] || StrategyEngine.DAILY_TEMPLATES[4];
    return tpl.map((s) => ({ ...s }));
  }

  function renderSlotEditor(slots) {
    els.slots.innerHTML = slots
      .map(
        (s, i) => `
      <div class="slot-row" data-i="${i}">
        <div class="slot-num">${i + 1}</div>
        <select data-field="purpose" aria-label="Тип контенту слот ${i + 1}">
          ${PURPOSE_OPTS.map(
            (p) =>
              `<option value="${p.id}" ${p.id === s.purpose ? 'selected' : ''}>${p.short}</option>`
          ).join('')}
        </select>
        <select data-field="format" aria-label="Формат слот ${i + 1}">
          ${FORMAT_OPTS.map(
            (f) =>
              `<option value="${f.id}" ${f.id === s.format ? 'selected' : ''}>${f.label}</option>`
          ).join('')}
        </select>
      </div>`
      )
      .join('');
  }

  function readSlots() {
    return [...els.slots.querySelectorAll('.slot-row')].map((row, i) => {
      const purpose = row.querySelector('[data-field="purpose"]').value;
      const format = row.querySelector('[data-field="format"]').value;
      const n = Number(els.postsPerDay.value);
      const tpl = StrategyEngine.DAILY_TEMPLATES[n] || StrategyEngine.DAILY_TEMPLATES[4];
      return {
        purpose,
        format,
        slot: (tpl[i] && tpl[i].slot) || `Слот ${i + 1}`
      };
    });
  }

  function syncSlotsFromCount() {
    const n = Number(els.postsPerDay.value);
    renderSlotEditor(defaultSlots(n));
  }

  function barHTML(items, useColor) {
    return items
      .map(
        (item) => `
      <div class="bar-row">
        <div class="bar-label">${item.label || item.short}</div>
        <div class="bar-track">
          <div class="bar-fill" data-w="${item.pct}" style="background:${useColor ? item.color : 'var(--olive)'}"></div>
        </div>
        <div class="bar-pct">${item.pct}%</div>
      </div>`
      )
      .join('');
  }

  function dayPostsHTML(posts) {
    return posts
      .map(
        (p) => `
      <div class="post-row">
        <div>${p.slot}</div>
        <div><span class="badge" style="background:${p.purposeColor}">${p.purposeShort}</span></div>
        <div class="format-tag">${p.format}</div>
        <div class="idea">${escapeHtml(p.idea)}</div>
      </div>`
      )
      .join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderStrategy(s) {
    lastStrategy = s;
    els.csv.disabled = false;

    els.output.innerHTML = `
      <div class="out-head">
        <h2>Стратегія · ${escapeHtml(s.meta.goalLabel)}</h2>
        <p class="out-sub">
          ${escapeHtml(s.meta.platform)} · ${s.meta.postsPerDay} пости/день ·
          ${escapeHtml(s.meta.focusLabel)} · план на ${escapeHtml(s.meta.monthName)} ${s.meta.year}
        </p>
        <div class="actions-row">
          <button type="button" class="btn btn-ghost" id="btn-copy-week">Копіювати тиждень</button>
        </div>
      </div>
      <nav class="tabs" role="tablist">
        <button class="tab active" data-tab="tab-strategy" type="button">Стратегія</button>
        <button class="tab" data-tab="tab-mix" type="button">Пропорції</button>
        <button class="tab" data-tab="tab-daily" type="button">Мікс дня</button>
        <button class="tab" data-tab="tab-week" type="button">Тиждень</button>
        <button class="tab" data-tab="tab-month" type="button">Місяць</button>
      </nav>

      <section class="tab-panel active" id="tab-strategy">
        <div class="strategy-grid">
          <div class="strategy-item"><h3>Позиціонування</h3><p>${escapeHtml(s.strategy.positioning)}</p></div>
          <div class="strategy-item"><h3>Тон голосу</h3><p>${escapeHtml(s.strategy.tone)}</p></div>
          <div class="strategy-item"><h3>Платформа</h3><p>${escapeHtml(s.strategy.platform)}</p></div>
          <div class="strategy-item"><h3>Ціль</h3><p>${escapeHtml(s.strategy.goal)}</p></div>
          <div class="strategy-item"><h3>Ритм</h3><p>${escapeHtml(s.strategy.cadence)}</p></div>
          <div class="strategy-item"><h3>Фокус</h3><p>${escapeHtml(s.strategy.focusNote)}</p></div>
        </div>
        <ul class="rules">
          ${s.rules.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </section>

      <section class="tab-panel" id="tab-mix">
        <div class="bars">
          <div class="bar-block">
            <h3>Типи контенту</h3>
            ${barHTML(s.proportions.purposes, true)}
          </div>
          <div class="bar-block">
            <h3>Формати</h3>
            <div class="format-list">
              ${s.proportions.formats
                .map(
                  (f) => `
                <div class="format-item">
                  <div class="pct">${f.pct}%</div>
                  <div>
                    <strong>${escapeHtml(f.label)}</strong>
                    <span>${escapeHtml(f.desc)} · ${escapeHtml(f.platform)}</span>
                  </div>
                </div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="tab-panel" id="tab-daily">
        <div class="daily-grid">
          ${s.dailyMix
            .map(
              (d, i) => `
            <article class="daily-card" style="border-top-color:${d.purposeColor}; animation-delay:${i * 0.06}s">
              <div class="slot">${escapeHtml(d.slot)}</div>
              <h4>${escapeHtml(d.purposeShort)}</h4>
              <div class="format">${escapeHtml(d.formatLabel)}</div>
              <p>${escapeHtml(d.formatDesc)}</p>
              <p>${escapeHtml(d.tip)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>

      <section class="tab-panel" id="tab-week">
        ${s.week
          .map(
            (day) => `
          <div class="day-block">
            <div class="day-head">
              <span>${escapeHtml(day.date)}</span>
              <span class="dow">${escapeHtml(day.dayName)}</span>
            </div>
            ${dayPostsHTML(day.posts)}
          </div>`
          )
          .join('')}
      </section>

      <section class="tab-panel" id="tab-month">
        ${s.monthPlan
          .map(
            (day) => `
          <div class="day-block">
            <div class="day-head">
              <span>${escapeHtml(day.date)}</span>
              <span class="dow">${escapeHtml(day.dayName)} · ${day.posts.length} пости</span>
            </div>
            ${dayPostsHTML(day.posts)}
          </div>`
          )
          .join('')}
      </section>
    `;

    // animate bars
    requestAnimationFrame(() => {
      els.output.querySelectorAll('.bar-fill').forEach((el) => {
        el.style.width = `${el.dataset.w}%`;
      });
    });

    // tabs
    els.output.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        els.output.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
        els.output.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = els.output.querySelector(`#${btn.dataset.tab}`);
        if (panel) panel.classList.add('active');
      });
    });

    const copyBtn = $('#btn-copy-week', els.output);
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = s.week
          .map((day) => {
            const lines = day.posts
              .map((p) => `  [${p.slot}] ${p.purposeShort} · ${p.format}: ${p.idea}`)
              .join('\n');
            return `${day.date} (${day.dayName})\n${lines}`;
          })
          .join('\n\n');
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Скопійовано';
          setTimeout(() => {
            copyBtn.textContent = 'Копіювати тиждень';
          }, 1500);
        });
      });
    }
  }

  function generate() {
    const strategy = StrategyEngine.generate({
      platform: els.platform.value,
      goal: els.goal.value,
      focus: els.focus.value,
      postsPerDay: Number(els.postsPerDay.value),
      month: Number(els.month.value),
      year: Number(els.year.value),
      customSlots: readSlots()
    });
    renderStrategy(strategy);
  }

  function downloadCSV() {
    if (!lastStrategy) return;
    const csv = StrategyEngine.toCSV(lastStrategy);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/tab-separated-values;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `smm-plan-${lastStrategy.meta.year}-${String(lastStrategy.meta.month).padStart(2, '0')}.tsv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // init
  fillMonths();
  syncSlotsFromCount();

  els.postsPerDay.addEventListener('change', syncSlotsFromCount);
  els.resetSlots.addEventListener('click', syncSlotsFromCount);
  els.generate.addEventListener('click', generate);
  els.csv.addEventListener('click', downloadCSV);

  // auto-generate default example on load
  generate();
})();
