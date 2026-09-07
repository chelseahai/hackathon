/* Shared measurements across pattern pages. Persist in localStorage.

   Inputs (bust, back length, sleeve length, hip, waist, skirt length,
   trouser length, rise, hem, seam allowance) are written by whichever page
   has a slider for them. Derived keys list `from` in CATALOG
   and are published by that pattern after a successful draft — bodice writes
   the armhole curve lengths the sleeve reads.

   Adding a new shared number: put it in CATALOG, bind a slider on the pages
   that own it, and call PatternStore.publish from the producer if it is derived.
*/

(function (global) {
  "use strict";

  var STORAGE_KEY = "pattern-block.measurements.v1";

  var CATALOG = {
    bust: { default: 84 },
    backLength: { default: 38 },
    sleeveLength: { default: 52 },
    hip: { default: 90 },
    waist: { default: 68 },
    skirtLength: { default: 60 },
    dressLength: { default: 50 },
    trouserLength: { default: 98 },
    rise: { default: 26 },
    hem: { default: 19 },
    seamAllowance: { default: 1 },
    frontAh: { default: 20.5, from: "bodice" },
    backAh: { default: 21.0, from: "bodice" },
  };

  function roundValue(n) {
    return Math.round(n * 10000) / 10000;
  }

  function emptyState() {
    var values = {};
    Object.keys(CATALOG).forEach(function (key) {
      values[key] = CATALOG[key].default;
    });
    return { v: 1, values: values, published: {} };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !parsed.values) return emptyState();
      var state = emptyState();
      Object.keys(CATALOG).forEach(function (key) {
        var n = Number(parsed.values[key]);
        if (isFinite(n)) state.values[key] = roundValue(n);
        var pub = parsed.published && Number(parsed.published[key]);
        if (isFinite(pub)) state.published[key] = roundValue(pub);
      });
      return state;
    } catch (err) {
      return emptyState();
    }
  }

  function save(state) {
    var next = JSON.stringify(state);
    try {
      if (localStorage.getItem(STORAGE_KEY) === next) return false;
      localStorage.setItem(STORAGE_KEY, next);
      return true;
    } catch (err) {
      return false;
    }
  }

  function get(key) {
    var spec = CATALOG[key];
    if (!spec) return undefined;
    var n = Number(load().values[key]);
    return isFinite(n) ? n : spec.default;
  }

  function pick(keys) {
    var state = load();
    var out = {};
    keys.forEach(function (key) {
      var spec = CATALOG[key];
      var n = Number(state.values[key]);
      out[key] = isFinite(n) ? n : spec ? spec.default : n;
    });
    return out;
  }

  function write(partial) {
    var state = load();
    Object.keys(partial).forEach(function (key) {
      if (!CATALOG[key]) return;
      var n = Number(partial[key]);
      if (isFinite(n)) state.values[key] = roundValue(n);
    });
    save(state);
    return state;
  }

  function publish(source, partial) {
    var state = load();
    Object.keys(partial).forEach(function (key) {
      var spec = CATALOG[key];
      if (!spec || spec.from !== source) return;
      var n = Number(partial[key]);
      if (!isFinite(n)) return;
      n = roundValue(n);
      state.values[key] = n;
      state.published[key] = n;
    });
    save(state);
    return state;
  }

  function fill(fields) {
    var keys = Object.keys(fields);
    var values = pick(keys);
    keys.forEach(function (key) {
      var el = fields[key];
      if (!el || values[key] === undefined) return;
      if (Number(el.value) === Number(values[key])) return;
      el.value = values[key];
    });
    return values;
  }

  function beginSvg(drawing, box, ariaLabel) {
    var ns = "http://www.w3.org/2000/svg";
    var width = box.maxX - box.minX;
    var height = box.maxY - box.minY;
    drawing.setAttribute("viewBox", "0 0 " + width.toFixed(3) + " " + height.toFixed(3));
    drawing.removeAttribute("width");
    drawing.removeAttribute("height");
    drawing.setAttribute("preserveAspectRatio", "xMidYMid meet");
    if (ariaLabel) drawing.setAttribute("aria-label", ariaLabel);
    return document.createElementNS(ns, "g");
  }

  function commitSvg(drawing, layer) {
    drawing.replaceChildren(layer);
  }

  function mount(config) {
    var fields = config.fields || {};
    var toggles = config.toggles || {};
    var redraw = config.redraw;
    var sheet = config.sheet;
    var reset = config.reset;
    var owned = config.owned || [];
    var dragging = false;
    var raf = 0;
    var rendering = false;
    var lastSheetW = -1;
    var lastSheetH = -1;

    function requestRedraw() {
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        rendering = true;
        try {
          redraw();
        } finally {
          rendering = false;
        }
      });
    }

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      requestRedraw();
    }

    Object.keys(fields).forEach(function (key) {
      var el = fields[key];
      if (!el) return;
      el.addEventListener("pointerdown", function (ev) {
        dragging = true;
        if (el.setPointerCapture && ev.pointerId != null) {
          try {
            el.setPointerCapture(ev.pointerId);
          } catch (err) {}
        }
      });
      el.addEventListener("input", requestRedraw);
    });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    Object.keys(toggles).forEach(function (key) {
      if (!toggles[key]) return;
      toggles[key].addEventListener("click", function () {
        var on = toggles[key].getAttribute("aria-pressed") === "true";
        toggles[key].setAttribute("aria-pressed", on ? "false" : "true");
        requestRedraw();
      });
    });

    if (reset) {
      reset.addEventListener("click", function () {
        resetKeys(owned);
        fill(fields);
        requestRedraw();
      });
    }

    subscribe(function () {
      if (dragging) return;
      fill(fields);
      requestRedraw();
    });

    function onSheetSize(w, h) {
      w = Math.round(w);
      h = Math.round(h);
      if (w === lastSheetW && h === lastSheetH) return;
      lastSheetW = w;
      lastSheetH = h;
      if (rendering || dragging) return;
      requestRedraw();
    }

    window.addEventListener("resize", function () {
      if (!sheet) {
        if (!rendering && !dragging) requestRedraw();
        return;
      }
      var rect = sheet.getBoundingClientRect();
      onSheetSize(rect.width, rect.height);
    });

    if (window.ResizeObserver && sheet) {
      new ResizeObserver(function (entries) {
        var cr = entries[0].contentRect;
        onSheetSize(cr.width, cr.height);
      }).observe(sheet);
    }

    fill(fields);
    requestRedraw();
    return { requestRedraw: requestRedraw };
  }

  function resetKeys(keys) {
    var state = load();
    keys.forEach(function (key) {
      var spec = CATALOG[key];
      if (!spec) return;
      var published = Number(state.published[key]);
      if (spec.from && isFinite(published)) state.values[key] = published;
      else state.values[key] = spec.default;
    });
    save(state);
    return state;
  }

  var listeners = [];

  function subscribe(fn) {
    listeners.push(fn);
  }

  global.addEventListener("storage", function (ev) {
    if (ev.key !== STORAGE_KEY) return;
    var state = load();
    listeners.forEach(function (fn) {
      fn(state);
    });
  });

  global.PatternStore = {
    CATALOG: CATALOG,
    STORAGE_KEY: STORAGE_KEY,
    load: load,
    get: get,
    pick: pick,
    write: write,
    publish: publish,
    fill: fill,
    resetKeys: resetKeys,
    subscribe: subscribe,
  };

  global.PatternPage = {
    beginSvg: beginSvg,
    commitSvg: commitSvg,
    mount: mount,
  };
})(window);
