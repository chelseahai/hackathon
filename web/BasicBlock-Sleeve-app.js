(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var drawing = document.getElementById("drawing");
  var errorEl = document.getElementById("error");
  var statsEl = document.getElementById("stats");
  var notesEl = document.getElementById("notes");

  var fields = {
    frontAh: document.getElementById("frontAh"),
    backAh: document.getElementById("backAh"),
    sleeveLength: document.getElementById("sleeveLength"),
    seamAllowance: document.getElementById("seamAllowance"),
  };
  var outs = {
    frontAh: document.getElementById("frontAhOut"),
    backAh: document.getElementById("backAhOut"),
    sleeveLength: document.getElementById("sleeveLengthOut"),
    seamAllowance: document.getElementById("seamAllowanceOut"),
  };
  var toggles = {
    construction: document.getElementById("showConstruction"),
    labels: document.getElementById("showLabels"),
    grid: document.getElementById("showGrid"),
  };

  function fmt(n, digits) {
    return Number(n).toFixed(digits === undefined ? 2 : digits) + " cm";
  }

  var OWNED = ["frontAh", "backAh", "sleeveLength", "seamAllowance"];

  function setFromStore() {
    PatternStore.fill(fields);
  }

  function toggleOn(el) {
    return el.getAttribute("aria-pressed") === "true";
  }

  function currentParams() {
    return {
      frontAh: Number(fields.frontAh.value),
      backAh: Number(fields.backAh.value),
      sleeveLength: Number(fields.sleeveLength.value),
      seamAllowance: Number(fields.seamAllowance.value),
    };
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function bbox(draft, seam, margin) {
    margin = margin || 4;
    var outline = SleeveBlock.patternOutline(draft);
    var pts = outline;
    if (seam > 0) pts = outline.concat(SleeveBlock.offsetClosed(outline, seam));
    var xs = pts.map(function (pt) { return pt.x; });
    var ys = pts.map(function (pt) { return pt.y; });
    return {
      minX: Math.min.apply(null, xs) - margin,
      maxX: Math.max.apply(null, xs) + margin,
      minY: Math.min.apply(null, ys) - margin,
      maxY: Math.max.apply(null, ys) + margin,
    };
  }

  function renderer(box) {
    return function toSvg(pt) {
      return { x: pt.x - box.minX, y: box.maxY - pt.y };
    };
  }

  function pointsAttr(points, toSvg) {
    return points
      .map(function (pt) {
        var p = toSvg(pt);
        return p.x.toFixed(3) + "," + p.y.toFixed(3);
      })
      .join(" ");
  }

  function line(parent, a, b, attrs, toSvg) {
    var pa = toSvg(a);
    var pb = toSvg(b);
    parent.appendChild(
      svgEl("line", Object.assign({
        x1: pa.x.toFixed(3),
        y1: pa.y.toFixed(3),
        x2: pb.x.toFixed(3),
        y2: pb.y.toFixed(3),
        fill: "none",
      }, attrs))
    );
  }

  function circle(parent, pt, r, attrs, toSvg) {
    var p = toSvg(pt);
    parent.appendChild(
      svgEl("circle", Object.assign({
        cx: p.x.toFixed(3),
        cy: p.y.toFixed(3),
        r: String(r),
      }, attrs))
    );
  }

  function text(parent, pt, label, attrs, dx, dy, toSvg) {
    var p = toSvg(pt);
    var el = svgEl("text", Object.assign({
      x: (p.x + (dx || 0)).toFixed(3),
      y: (p.y + (dy || 0)).toFixed(3),
    }, STYLES.type, attrs));
    el.textContent = label;
    parent.appendChild(el);
  }

  var CONSTRUCTION = {
    stroke: "#b3b3b3",
    "stroke-width": "0.8",
    "stroke-dasharray": "5 4",
    "vector-effect": "non-scaling-stroke",
  };
  var STYLES = {
    construction: CONSTRUCTION,
    grid: { stroke: "#3a3a3a", "stroke-width": "0.6", "vector-effect": "non-scaling-stroke" },
    outline: { stroke: "#fff", "stroke-width": "0.8", fill: "none", "stroke-dasharray": "5 4", "vector-effect": "non-scaling-stroke" },
    seam: { stroke: "#fff", "stroke-width": "0.8", fill: "none", "vector-effect": "non-scaling-stroke" },
    grain: { stroke: "#fff", "stroke-width": "0.8", fill: "none", "vector-effect": "non-scaling-stroke" },
    point: { fill: "#b3b3b3", stroke: "none" },
    type: {
      "font-family": "Poppins, sans-serif",
      "font-weight": "400",
      "letter-spacing": "0.08rem",
      "text-transform": "uppercase",
    },
    label: { fill: "#fff" },
    labelSm: { fill: "#757575" },
    elLabel: { fill: "#fff" },
  };

  function sheetView(contentBox) {
    var contentW = contentBox.maxX - contentBox.minX;
    var contentH = contentBox.maxY - contentBox.minY;
    var rect = drawing.getBoundingClientRect();
    var vw = rect.width;
    var vh = rect.height;
    if (!vw || !vh || !contentW || !contentH) return contentBox;
    var sheetAspect = vw / vh;
    var contentAspect = contentW / contentH;
    var viewW = contentW;
    var viewH = contentH;
    if (sheetAspect > contentAspect) viewW = contentH * sheetAspect;
    else viewH = contentW / sheetAspect;
    var padX = (viewW - contentW) / 2;
    var padY = (viewH - contentH) / 2;
    return {
      minX: contentBox.minX - padX,
      maxX: contentBox.maxX + padX,
      minY: contentBox.minY - padY,
      maxY: contentBox.maxY + padY,
    };
  }

  function drawGrainline(parent, draft, toSvg) {
    var topY = draft.peak.y - 3.5;
    var botY = draft.cuffY + 3.5;
    line(parent, SleeveBlock.V(0, topY), SleeveBlock.V(0, botY), STYLES.grain, toSvg);
  }

  function drawGrid(parent, box, toSvg) {
    var x0 = Math.floor(box.minX);
    var x1 = Math.ceil(box.maxX);
    var y0 = Math.floor(box.minY);
    var y1 = Math.ceil(box.maxY);
    for (var x = x0; x <= x1; x += 1) {
      line(parent, SleeveBlock.V(x, box.minY), SleeveBlock.V(x, box.maxY), STYLES.grid, toSvg);
    }
    for (var y = y0; y <= y1; y += 1) {
      line(parent, SleeveBlock.V(box.minX, y), SleeveBlock.V(box.maxX, y), STYLES.grid, toSvg);
    }
  }

  function typeSizeForDrawing(box) {
    var vbW = box.maxX - box.minX;
    var vbH = box.maxY - box.minY;
    var rect = drawing.getBoundingClientRect();
    var scale = Math.min(rect.width / vbW, rect.height / vbH);
    var remPx = parseFloat(window.getComputedStyle(document.body).fontSize) || 12.8;
    if (!scale || !isFinite(scale)) return remPx / 16;
    return remPx / scale;
  }

  function renderDraft(draft) {
    var show = {
      construction: toggleOn(toggles.construction),
      labels: toggleOn(toggles.labels),
      grid: toggleOn(toggles.grid),
    };
    var seam = Number(fields.seamAllowance.value) || 0;
    var contentBox = bbox(draft, seam);
    var box = sheetView(contentBox);
    var toSvg = renderer(box);

    var svg = PatternPage.beginSvg(drawing, box, "Women's basic sleeve block");
    var typeSize = typeSizeForDrawing(box);
    STYLES.type["font-size"] = typeSize.toFixed(3);
    STYLES.type["letter-spacing"] = (typeSize * 0.1).toFixed(3);

    if (show.grid) drawGrid(svg, box, toSvg);

    if (show.construction) {
      line(svg, SleeveBlock.V(0, draft.peak.y + 1.5), SleeveBlock.V(0, draft.cuffY - 1.5), STYLES.construction, toSvg);
      line(
        svg,
        SleeveBlock.V(draft.backUnderarm.x - 1.2, 0),
        SleeveBlock.V(draft.frontUnderarm.x + 1.2, 0),
        STYLES.construction,
        toSvg
      );
      line(
        svg,
        SleeveBlock.V(draft.backCuff.x - 1.2, draft.cuffY),
        SleeveBlock.V(draft.frontCuff.x + 1.2, draft.cuffY),
        STYLES.construction,
        toSvg
      );
      line(svg, draft.peak, draft.frontUnderarm, STYLES.construction, toSvg);
      line(svg, draft.peak, draft.backUnderarm, STYLES.construction, toSvg);
      line(
        svg,
        SleeveBlock.V(draft.backUnderarm.x - 1.2, draft.elbowY),
        SleeveBlock.V(draft.frontUnderarm.x + 1.2, draft.elbowY),
        STYLES.construction,
        toSvg
      );
    }

    var outline = SleeveBlock.closeRing(SleeveBlock.patternOutline(draft));
    svg.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(outline, toSvg) }, STYLES.outline)));
    if (seam > 0) {
      var cutting = SleeveBlock.closeRing(SleeveBlock.offsetClosed(outline, seam));
      svg.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(cutting, toSvg) }, STYLES.seam)));
    }
    drawGrainline(svg, draft, toSvg);

    if (show.construction) {
      circle(svg, draft.origin, 0.22, STYLES.point, toSvg);
      circle(svg, draft.frontOffsetUpper, 0.22, STYLES.point, toSvg);
      circle(svg, draft.frontOffsetLower, 0.22, STYLES.point, toSvg);
      circle(svg, draft.backOffsetUpper, 0.22, STYLES.point, toSvg);
      circle(svg, draft.backOffsetLower, 0.22, STYLES.point, toSvg);
      circle(svg, draft.backLocator, 0.22, STYLES.point, toSvg);
    }

    if (show.labels) {
      text(svg, SleeveBlock.V(draft.frontUnderarm.x * 0.45, -1.1), "Front", STYLES.label, 0, 0, toSvg);
      text(svg, SleeveBlock.V(draft.backUnderarm.x * 0.55, -1.1), "Back", STYLES.label, 0, 0, toSvg);
      if (show.construction) {
        text(svg, SleeveBlock.V(draft.frontUnderarm.x + 0.35, draft.elbowY + 0.35), "EL", STYLES.elLabel, 0, 0, toSvg);
      }
    }
    PatternPage.commitSvg(drawing, svg);
  }

  function stat(label, value) {
    return "<div class=\"stat\"><span class=\"k\">" + label + "</span><span class=\"v\">" + value + "</span></div>";
  }

  function renderStats(draft) {
    statsEl.innerHTML =
      stat("Total AH", fmt(draft.totalAh)) +
      stat("Cap height", fmt(draft.capHeight, 3)) +
      stat("Front cap", fmt(draft.frontCapLength, 3)) +
      stat("Front cap ease", fmt(draft.frontEase, 3)) +
      stat("Back cap", fmt(draft.backCapLength, 3)) +
      stat("Back cap ease", fmt(draft.backEase, 3));
    if (draft.notes.length) {
      notesEl.hidden = false;
      notesEl.textContent = draft.notes.join(" ");
    } else {
      notesEl.hidden = true;
      notesEl.textContent = "";
    }
  }

  function redraw() {
    outs.frontAh.textContent = fmt(fields.frontAh.value);
    outs.backAh.textContent = fmt(fields.backAh.value);
    outs.sleeveLength.textContent = fmt(fields.sleeveLength.value);
    outs.seamAllowance.textContent = fmt(fields.seamAllowance.value);

    PatternStore.write(currentParams());

    var draft = SleeveBlock.draftSleeve(currentParams());
    if (draft.error) {
      drawing.innerHTML = "";
      errorEl.hidden = false;
      errorEl.textContent = draft.error;
      statsEl.innerHTML = "";
      notesEl.hidden = true;
      return;
    }
    errorEl.hidden = true;
    renderDraft(draft);
    renderStats(draft);
  }

  PatternPage.mount({
    fields: fields,
    toggles: toggles,
    owned: OWNED,
    sheet: document.getElementById("sheet"),
    reset: document.getElementById("reset"),
    redraw: redraw,
  });
})();
