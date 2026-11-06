/* Pedal Mafia PLP prototype: grid sizes, product / on-figure view, swatches, sort and filters.
   Card content follows Figma "PM - PLP Template - 4 Column" (Card A2). */
(() => {
  const PRODUCTS = window.PM_PRODUCTS || [];
  const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

  // Swatch groups (PM-9): siblings of the same style, collabs and prints grouped separately.
  const groups = new Map();
  for (const p of PRODUCTS) {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group).push(p);
  }

  // Inline editorial content from the Figma frame. Each links to its product when it's in the data.
  // Every tile has the same structure: an eyebrow with the product name, then a text block. No
  // colorway (designer decision, 2026-11-06). `colorway` only picks the product to link to.
  const EDITORIALS = [
    { style: "Pro Nomadic Jersey", colorway: "Pale Clay", position: "right top",
      copy: "Seven pockets, abrasion-resistant fabric that dries fast, and reflective details for when the day runs long.",
      src: "assets/img/editorial-pro-nomadic-pale-clay", alt: "Rider in a Pale Clay Pro Nomadic Jersey on a night ride" },
    { style: "Pro Midweight Thermal Jersey", colorway: "Grey", position: "left top",
      copy: "[One line from brand]",
      src: "assets/img/editorial-pro-midweight-thermal-grey", alt: "Close-up of a rider layered in a Grey Pro Midweight Thermal Jersey" },
  ];

  // Breakpoints (PM-3): mobile under 750, tablet 750–989, desktop 990 and up.
  const LAYOUTS = {
    desktop: { options: [3, 4, 6, "index"], fallback: 4, index: 8 },
    tablet: { options: [2, "index"], fallback: 2, index: 6 },
    mobile: { options: [1, 2, "index"], fallback: 2, index: 3 },
  };
  // Desktop: editorial cells (row, column) per column count, from the 3, 4 and 6 column frames; each
  // tile spans 2 columns x 2 rows.
  const EDITORIAL_CELLS = {
    6: [[1, 5], [3, 1]],
    4: [[1, 3], [4, 1]],
    3: [[1, 3, 1], [3, 1, 1]], // one slot each: [row, column, span]
  };
  // Tablet and mobile: each tile takes its own full-width row, placed after this many products.
  const EDITORIAL_AFTER = { tablet: [4, 12], mobile: [4, 12] };

  const mqDesktop = matchMedia("(min-width: 990px)");
  const mqTablet = matchMedia("(min-width: 750px)");
  const state = {
    device: null,
    cols: null,
    view: "product",
    sort: "featured",
    filters: { fit: new Set(), line: new Set(), inStock: false },
    selected: new Map(), // card id -> product id currently shown
  };

  const $ = (s, el = document) => el.querySelector(s);
  const grid = $("#grid");
  const money = (n) => "$" + (Number.isInteger(n) ? n : n.toFixed(2));

  function deviceNow() {
    return mqDesktop.matches ? "desktop" : mqTablet.matches ? "tablet" : "mobile";
  }

  function srcset(src) {
    return [360, 540, 720, 900, 1200, 1600].map((w) => `${src}?width=${w} ${w}w`).join(", ");
  }

  function sizesAttr() {
    const cols = state.cols === "index" ? LAYOUTS[state.device].index : state.cols;
    return `calc((100vw - ${24 + (cols - 1) * 12}px) / ${cols})`;
  }

  // ---------- Card images ----------

  // Each card carries two shots: the one for the current view first (flat lay in Product, on figure
  // in On figure), then the other. Desktop hover brings the second shot in with the rack focus;
  // tablet and mobile swipe between them, with a thin bar under the photo showing there's more than
  // one. Products missing one of the shots keep a single image.
  function shotsFor(p) {
    const flat = { ...p.flat, flat: true };
    if (!p.figure) return [flat];
    const fig = { ...p.figure, flat: false };
    return state.view === "figure" ? [fig, flat] : [flat, fig];
  }

  function slidesHTML(p, load) {
    const shots = shotsFor(p);
    const name = `${p.style}, ${p.colorway}`;
    return `
            <div class="card__slides">
              ${shots.map((im, i) => `<div class="card__slide${i ? " card__slide--alt" : ""}">
                <img class="${im.flat ? "is-flat" : ""}"${i ? "" : ` data-pid="${p.id}"`} src="${im.src}?width=720" srcset="${srcset(im.src)}"
                  sizes="${sizesAttr()}" width="${im.w}" height="${im.h}" alt="${i ? "" : name}" draggable="false"
                  ${i ? 'loading="lazy"' : load} decoding="async"></div>`).join("")}
            </div>
            ${shots.length > 1 ? `<span class="card__bar" aria-hidden="true" style="--n:${shots.length}"><span class="card__bar-thumb"></span></span>` : ""}`;
  }

  // ---------- Cards ----------

  function swatchList(card, current) {
    const siblings = groups.get(card.group) || [card];
    // Selected colorway first (PM-9), then the rest in collection order. Order stays fixed while
    // shoppers tap through, so the dots don't jump.
    return [card, ...siblings.filter((s) => s.id !== card.id)];
  }

  function cardHTML(card, eager) {
    const p = byId.get(state.selected.get(card.id) || card.id);
    const swatches = swatchList(card);
    const shown = swatches.slice(0, 4);
    const more = swatches.length - shown.length;
    const sale = p.compare && p.available;
    const badge = !p.available
      ? `<span class="badge badge--sold-out">Sold out</span>`
      : sale ? `<span class="badge badge--sale">On sale</span>` : "";
    return `
      <article class="card${p.available ? "" : " is-sold-out"}" data-card="${card.id}">
        <a class="card__link" href="${p.url}" target="_blank" rel="noopener">
          <div class="card__media">
            ${badge}
            ${slidesHTML(p, eager ? 'fetchpriority="high"' : 'loading="lazy"')}
          </div>
          <div class="card__info">
            <div class="card__row">
              <h2 class="card__name">${p.style}</h2>
              <span class="card__price">${money(p.price)}</span>
              ${sale ? `<span class="card__compare"><span class="visually-hidden">Regular price </span>${money(p.compare)}</span>` : ""}
            </div>
            <p class="card__color"><span class="snf__layer is-rest">${p.colorway}</span><span class="snf__layer" aria-hidden="true"></span></p>
          </div>
        </a>
        ${swatches.length > 1 ? `
        <div class="swatches" role="group" aria-label="Colors for ${p.style}">
          ${shown.map((s) => `<button type="button" class="swatch${s.available ? "" : " is-sold-out"}"
              style="--c:${s.swatch}" data-swatch="${s.id}" aria-pressed="${s.id === p.id}"
              aria-label="${s.colorway}${s.available ? "" : " (sold out)"}" title="${s.colorway}"></button>`).join("")}
          ${more > 0 ? `<span class="swatch-more">+${more}</span>` : ""}
        </div>` : ""}
      </article>`;
  }

  function editorialHTML(e, i, slot, cols) {
    const p = PRODUCTS.find((x) => x.style === e.style && x.colorway === e.colorway);
    // A full-width row shares no rows with cards, so it takes the card image ratio.
    const ownRow = slot === "row";
    const span = ownRow ? cols : slot[2] || 2; // tiles span 2 × 2 unless the cell says otherwise
    const style = ownRow
      ? "grid-column:1 / -1;aspect-ratio:4/5;"
      : `grid-row:${slot[0]} / span ${span};grid-column:${slot[1]} / span ${span};`;
    const single = !ownRow && span === 1;
    return `
      <a class="editorial${ownRow || single ? " editorial--row" : ""} editorial--copy" style="${style}" href="${p ? p.url : "#"}" target="_blank" rel="noopener">
        <img src="${e.src}-1000.jpg" srcset="${e.src}-1000.jpg 1000w, ${e.src}-1800.jpg 1800w"
          sizes="${ownRow ? "100vw" : `calc(${(span / cols) * 100}vw)`}" alt="${e.alt}" loading="${i === 0 ? "eager" : "lazy"}"
          style="object-position:${e.position}">
        <span class="editorial__rail"><span class="editorial__label">
          <span class="editorial__meta"><span>${e.style}</span></span>
          <span class="editorial__copy">${e.copy}</span>
        </span></span>
      </a>`;
  }

  // ---------- Filtering and sorting ----------

  function filtered() {
    const f = state.filters;
    let list = PRODUCTS.filter((p) =>
      (!f.fit.size || f.fit.has(p.fit || "Other")) &&
      (!f.line.size || f.line.has(p.line || "Other")) &&
      (!f.inStock || p.available));
    if (state.sort !== "featured") {
      const dir = state.sort === "price-asc" ? 1 : -1;
      list = [...list].sort((a, b) => (a.available === b.available ? dir * (a.price - b.price) : a.available ? -1 : 1));
    }
    return list;
  }

  function filtersActive() {
    const f = state.filters;
    return f.fit.size + f.line.size + (f.inStock ? 1 : 0);
  }

  // ---------- Render ----------

  // ---------- Rack focus transition ----------
  // Tiles resolve from a soft blur into focus, staggered across what's on screen. Off-screen tiles
  // don't animate, so long grids never wait on a queue.
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function rackIn(els) {
    if (reduceMotion.matches || document.documentElement.classList.contains("rack-off")) return;
    const visible = [...els].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    });
    // Hold the on-screen tiles until their images decode (or 700ms), so focus resolves onto photos.
    visible.forEach((el, n) => {
      el.style.setProperty("--i", Math.min(n, 11));
      el.classList.remove("rack");
      el.classList.add("rack-wait");
    });
    const decoded = visible.flatMap((el) => [...el.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
    Promise.race([Promise.all(decoded), new Promise((r) => setTimeout(r, 700))]).then(() => {
      visible.forEach((el) => {
        el.classList.remove("rack-wait");
        void el.offsetWidth; // restart the animation
        el.classList.add("rack");
        settle(el, "rack", "rack");
      });
    });
  }

  // Drop the animation class once it finishes. WebKit (Safari, and Chrome on iOS) can keep painting
  // the last blurred frame of a held filter animation, most often when the photo finishes loading
  // mid-animation, so the tile would stay soft. Removing the class leaves no filter to get stuck.
  // The timer is a backstop for when animationend never fires.
  function settle(el, cls, name) {
    clearTimeout(el._settle);
    const done = () => { clearTimeout(el._settle); el.removeEventListener("animationend", onEnd); el.classList.remove(cls); };
    const onEnd = (e) => { if (e.target === el && e.animationName === name) done(); };
    el.addEventListener("animationend", onEnd);
    const css = getComputedStyle(el);
    const ms = (v) => Math.max(...v.split(",").map((t) => parseFloat(t) * (t.trim().endsWith("ms") ? 1 : 1000)));
    el._settle = setTimeout(done, ms(css.animationDuration) + ms(css.animationDelay) + 200);
  }

  function rackImage(img) {
    if (reduceMotion.matches || document.documentElement.classList.contains("rack-off")) return;
    img.classList.remove("rack-img");
    void img.offsetWidth;
    img.classList.add("rack-img");
    settle(img, "rack-img", "rack-img");
  }

  // Show a colorway on a card's image and colorway line (used for hover previews).
  // Swap the two stacked layers: the new name fades up in, the old one fades up and out.
  function fadeColorway(label, name) {
    const layers = label.querySelectorAll(".snf__layer");
    const out = [...layers].find((l) => !l.hasAttribute("aria-hidden"));
    const next = [...layers].find((l) => l !== out);
    if (!out || !next || out.textContent === name) return;
    next.textContent = name;
    out.classList.remove("is-in", "is-rest");
    out.classList.add("is-out");
    out.setAttribute("aria-hidden", "true");
    next.classList.remove("is-out");
    next.classList.add("is-in");
    next.removeAttribute("aria-hidden");
  }

  const motionOff = () => reduceMotion.matches || document.documentElement.classList.contains("rack-off");

  // Replace a card's shots with another colorway's (hover previews), back on the first shot.
  function swapSlides(article, p) {
    const media = article.querySelector(".card__media");
    media.querySelectorAll(".card__slides, .card__bar").forEach((el) => el.remove());
    media.insertAdjacentHTML("beforeend", slidesHTML(p, 'loading="eager"'));
  }

  // Tablet and mobile: the bar's thumb follows the swipe. Scroll events don't bubble, so listen in
  // the capture phase for any card's strip.
  document.addEventListener("scroll", (e) => {
    const strip = e.target;
    if (!strip.classList || !strip.classList.contains("card__slides")) return;
    const max = strip.scrollWidth - strip.clientWidth;
    strip.parentElement.style.setProperty("--p", max > 0 ? Math.min(1, strip.scrollLeft / max) : 0);
  }, true);

  // Mouse drag for the strips, so the Tablet and Mobile frames can be swiped on a desktop. Touch
  // and trackpads scroll natively. A drag that moves doesn't open the product.
  let drag = null;
  let dragged = false;
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const strip = e.target.closest(".card__slides");
    if (!strip || strip.scrollWidth <= strip.clientWidth + 1) return;
    e.preventDefault(); // no native image or link drag
    drag = { strip, x: e.clientX, left: strip.scrollLeft, moved: false };
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) { drag.moved = true; drag.strip.classList.add("is-dragging"); }
    drag.strip.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!drag) return;
    const { strip, left, moved } = drag;
    drag = null;
    if (!moved) return;
    dragged = true;
    setTimeout(() => { dragged = false; });
    const w = strip.clientWidth;
    const from = Math.round(left / w);
    const delta = strip.scrollLeft - left;
    const last = strip.children.length - 1;
    const to = Math.abs(delta) > w * 0.15 ? Math.max(0, Math.min(last, from + Math.sign(delta))) : from;
    strip.scrollTo({ left: to * w, behavior: motionOff() ? "auto" : "smooth" });
    const end = () => { clearTimeout(t); strip.classList.remove("is-dragging"); };
    const t = setTimeout(end, 700);
    strip.addEventListener("scrollend", end, { once: true });
  });
  document.addEventListener("click", (e) => {
    if (dragged && e.target.closest(".card__slides")) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  function showColorway(article, p) {
    const img = article.querySelector(".card__media img");
    if (!img || Number(img.dataset.pid) === p.id) return;
    swapSlides(article, p);
    fadeColorway(article.querySelector(".card__color"), p.colorway);
    rackImage(article.querySelector(".card__media img"));
  }

  function render() {
    const list = filtered();
    const cols = state.cols;
    const colCount = cols === "index" ? LAYOUTS[state.device].index : cols;
    grid.dataset.cols = String(cols);
    grid.dataset.view = state.view;
    grid.style.setProperty("--cols", colCount);

    const showEditorial = cols !== "index" && !filtersActive() && state.sort === "featured";
    let html = "";
    if (state.device === "desktop") {
      const cells = EDITORIAL_CELLS[colCount] || [];
      if (showEditorial) EDITORIALS.forEach((e, i) => { if (cells[i]) html += editorialHTML(e, i, cells[i], colCount); });
      list.forEach((p, i) => { html += cardHTML(p, i < colCount); });
    } else {
      const after = showEditorial ? EDITORIAL_AFTER[state.device] || [] : [];
      list.forEach((p, i) => {
        html += cardHTML(p, i < colCount);
        const k = after.indexOf(i + 1);
        if (k > -1 && EDITORIALS[k]) html += editorialHTML(EDITORIALS[k], k, "row", colCount);
      });
    }
    grid.innerHTML = html;
    rackIn(grid.children);

    $("#count").textContent = list.length;
    $("#empty").hidden = list.length > 0;
    const n = filtersActive();
    $("#filter-count").textContent = n ? ` (${n})` : "";
    renderGridOptions();
  }

  function renderGridOptions() {
    const box = $("#grid-size");
    const opts = LAYOUTS[state.device].options;
    box.innerHTML = `<span class="toolbar__label">Grid</span>` + opts.map((o) =>
      `<button class="opt" type="button" data-cols="${o}" aria-pressed="${o === state.cols}"
        aria-label="${o === "index" ? "Index view, images only" : `${o} column${o === 1 ? "" : "s"}`}">${o === "index" ? "Index" : o}</button>`
    ).join("");
  }

  function setDevice() {
    const device = deviceNow();
    if (device === state.device) return;
    state.device = device;
    const opts = LAYOUTS[device].options;
    if (!opts.includes(state.cols)) state.cols = LAYOUTS[device].fallback;
    render();
  }

  // ---------- Events ----------

  $("#grid-size").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cols]");
    if (!b) return;
    state.cols = b.dataset.cols === "index" ? "index" : Number(b.dataset.cols);
    render();
  });

  // View lives in the toolbar (desktop and tablet) and in the filter panel (all sizes); both stay in sync.
  function setView(view) {
    state.view = view;
    document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.view === view)));
    render();
  }
  $("#view").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) setView(b.dataset.view);
  });

  const sortBtn = $("#sort-btn"), sortMenu = $("#sort-menu");
  const closeSort = () => { sortMenu.hidden = true; sortBtn.setAttribute("aria-expanded", "false"); };
  sortBtn.addEventListener("click", () => {
    const open = sortMenu.hidden;
    sortMenu.hidden = !open;
    sortBtn.setAttribute("aria-expanded", String(open));
    if (open) sortMenu.querySelector('[aria-checked="true"]').focus();
  });
  sortMenu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    state.sort = b.dataset.sort;
    sortMenu.querySelectorAll("[data-sort]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    sortBtn.textContent = b.textContent;
    closeSort();
    sortBtn.focus();
    render();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".sort")) closeSort(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sortMenu.hidden) { closeSort(); sortBtn.focus(); } });

  // Tapping a swatch swaps the tile to that colorway in place (locked decision).
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-swatch]");
    if (!b) return;
    const article = b.closest("[data-card]");
    const cardId = Number(article.dataset.card);
    const pid = Number(b.dataset.swatch);
    const previewed = Number(article.querySelector(".card__media img").dataset.pid) === pid;
    state.selected.set(cardId, pid);
    const temp = document.createElement("div");
    temp.innerHTML = cardHTML(byId.get(cardId), false);
    const next = temp.firstElementChild;
    next.querySelectorAll("img").forEach((im) => { im.loading = "eager"; });
    article.replaceWith(next);
    if (!previewed) rackImage(next.querySelector(".card__media img"));
    next.querySelector(`[data-swatch="${pid}"]`).focus();
  });

  // Hovering a swatch (mouse only) previews that colorway; leaving the swatches returns to the
  // selected one. Both use the rack focus.
  grid.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const b = e.target.closest("[data-swatch]");
    if (b) showColorway(b.closest("[data-card]"), byId.get(Number(b.dataset.swatch)));
  });
  grid.addEventListener("pointerout", (e) => {
    if (e.pointerType !== "mouse") return;
    const box = e.target.closest(".swatches");
    if (!box || box.contains(e.relatedTarget)) return;
    const article = box.closest("[data-card]");
    const id = Number(article.dataset.card);
    showColorway(article, byId.get(state.selected.get(id) || id));
  });

  // ---------- Filter drawer (Option A) ----------

  const dialog = $("#filters");
  const GROUPS = [
    { key: "fit", title: "Fit", values: ["Race", "Slim", "Regular", "Relaxed"] },
    { key: "line", title: "Line", values: ["Pro", "Core"] },
  ];
  let draft;

  function countFor(key, value) {
    const f = draft;
    return PRODUCTS.filter((p) =>
      (key === "fit" ? (p.fit || "Other") === value : !f.fit.size || f.fit.has(p.fit || "Other")) &&
      (key === "line" ? (p.line || "Other") === value : !f.line.size || f.line.has(p.line || "Other")) &&
      (!f.inStock || p.available)).length;
  }

  function draftCount() {
    const f = draft;
    return PRODUCTS.filter((p) =>
      (!f.fit.size || f.fit.has(p.fit || "Other")) &&
      (!f.line.size || f.line.has(p.line || "Other")) &&
      (!f.inStock || p.available)).length;
  }

  const VIEWS = [["product", "Product"], ["figure", "On figure"]];

  function renderDrawer() {
    $("#filter-groups").innerHTML = `
      <div class="fgroup fgroup--view" role="group" aria-labelledby="fview-title">
        <h3 id="fview-title">View</h3>
        <div class="fview">${VIEWS.map(([v, label]) =>
          `<button class="opt" type="button" data-view="${v}" aria-pressed="${state.view === v}">${label}</button>`).join("")}</div>
      </div>` + GROUPS.map((g) => `
      <fieldset class="fgroup">
        <legend class="visually-hidden">${g.title}</legend>
        <h3 aria-hidden="true">${g.title}</h3>
        ${g.values.map((v) => { const n = countFor(g.key, v); return n || draft[g.key].has(v) ? `
          <label class="fopt"><input type="checkbox" data-key="${g.key}" value="${v}" ${draft[g.key].has(v) ? "checked" : ""}>
            <span>${v}</span><span class="n">${n}</span></label>` : ""; }).join("")}
      </fieldset>`).join("") + `
      <div class="fgroup"><label class="fopt"><input type="checkbox" data-key="inStock" ${draft.inStock ? "checked" : ""}>
        <span>In stock only</span></label></div>`;
    $("#filter-apply").textContent = `Show ${draftCount()} products`;
  }

  $("#filter-open").addEventListener("click", () => {
    draft = { fit: new Set(state.filters.fit), line: new Set(state.filters.line), inStock: state.filters.inStock };
    renderDrawer();
    dialog.showModal();
  });
  // View applies straight away (it changes images, not results), so the grid updates behind the panel.
  $("#filter-groups").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) setView(b.dataset.view);
  });
  $("#filter-groups").addEventListener("change", (e) => {
    const i = e.target;
    if (i.dataset.key === "inStock") draft.inStock = i.checked;
    else if (i.checked) draft[i.dataset.key].add(i.value);
    else draft[i.dataset.key].delete(i.value);
    renderDrawer();
  });
  $("#filter-clear").addEventListener("click", () => {
    draft = { fit: new Set(), line: new Set(), inStock: false };
    renderDrawer();
  });
  // Desktop plays the exit (fade left) before closing; tablet and mobile close straight away.
  function closeDrawer(value) {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;
    if (!mqDesktop.matches || reduceMotion.matches) { dialog.close(value); return; }
    dialog.classList.add("is-closing");
    dialog.addEventListener("animationend", function done(e) {
      if (e.animationName !== "drawer-out") return;
      dialog.removeEventListener("animationend", done);
      dialog.classList.remove("is-closing");
      dialog.close(value);
    });
  }
  $("#filter-form").addEventListener("submit", (e) => {
    e.preventDefault();
    closeDrawer(e.submitter ? e.submitter.value : "");
  });
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeDrawer(""); }); // Escape
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "apply") { state.filters = draft; render(); }
  });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) closeDrawer(""); });
  $("#empty-clear").addEventListener("click", () => {
    state.filters = { fit: new Set(), line: new Set(), inStock: false };
    render();
  });

  // Temporary transition tuning (see tuner.js): saved values apply here too, including inside the
  // Tablet and Mobile frames, which hear changes through storage events.
  const RACK_KEY = "pm-plp-rack";
  function applyRack() {
    let t = null;
    try { t = JSON.parse(localStorage.getItem(RACK_KEY) || "null"); } catch (e) { /* storage blocked */ }
    const root = document.documentElement;
    // Saved tuner values only apply while the tuner is loaded (its script tag in index.html).
    if (!t || !document.querySelector('script[src="tuner.js"]')) return;
    for (const [k, v] of Object.entries(t.vars || {})) root.style.setProperty(k, v);
    root.classList.toggle("rack-off", t.enabled === false);
  }
  window.PM_replay = () => { window.scrollTo(0, 0); rackIn(grid.children); };
  window.PM_applyRack = applyRack;
  window.addEventListener("storage", (e) => { if (e.key === RACK_KEY) applyRack(); }); // the tuner triggers replays itself
  applyRack();

  // Sticky editorial labels sit just below the sticky toolbar.
  const toolbar = $(".toolbar");
  new ResizeObserver(() => document.documentElement.style.setProperty("--toolbar-h", toolbar.offsetHeight + "px")).observe(toolbar);

  mqDesktop.addEventListener("change", setDevice);
  mqTablet.addEventListener("change", setDevice);
  setDevice();
})();
