(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var drawing = document.getElementById("drawing");
  var errorEl = document.getElementById("error");
  var statsEl = document.getElementById("stats");
  var notesEl = document.getElementById("notes");

  var fields = {
    hip: document.getElementById("hip"),
    waist: document.getElementById("waist"),
    skirtLength: document.getElementById("skirtLength"),
    seamAllowance: document.getElementById("seamAllowance"),
  };
  var outs = {
    hip: document.getElementById("hipOut"),
    waist: document.getElementById("waistOut"),
    skirtLength: document.getElementById("skirtLengthOut"),
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

  var OWNED = ["hip", "waist", "skirtLength", "seamAllowance"];

  function setFromStore() {
    PatternStore.fill(fields);
  }

  function toggleOn(el) {
    return el.getAttribute("aria-pressed") === "true";
  }

  function currentParams() {
    return {
      hip: Number(fields.hip.value),
      waist: Number(fields.waist.value),
      skirtLength: Number(fields.skirtLength.value),
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
    var dx = SkirtBlock.frontDisplayShift(draft, seam);
    var back = SkirtBlock.backOutline(draft);
    var front = SkirtBlock.translate(SkirtBlock.frontOutline(draft), dx);
    var pts = back.concat(front);
    if (seam > 0) {
      pts = pts.concat(SkirtBlock.offsetClosed(back, seam));
      pts = pts.concat(SkirtBlock.translate(SkirtBlock.offsetClosed(SkirtBlock.frontOutline(draft), seam), dx));
    }
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

  function moved(pt, dx) {
    return dx ? SkirtBlock.V(pt.x + dx, pt.y) : pt;
  }

  function intersectVertical(poly, x) {
    var ring = SkirtBlock.closeRing(poly);
    var hits = [];
    for (var i = 0; i < ring.length - 1; i++) {
      var a = ring[i];
      var b = ring[i + 1];
      if ((a.x - x) * (b.x - x) > 0) continue;
      if (Math.abs(b.x - a.x) < 1e-9) continue;
      var t = (x - a.x) / (b.x - a.x);
      if (t >= 0 && t <= 1) hits.push(SkirtBlock.V(x, a.y + (b.y - a.y) * t));
    }
    return hits;
  }

  function pieceBoundsX(poly) {
    var minX = Infinity;
    var maxX = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      if (poly[i].x < minX) minX = poly[i].x;
      if (poly[i].x > maxX) maxX = poly[i].x;
    }
    return (minX + maxX) / 2;
  }

  function grainlineOnPiece(outline) {
    var x = pieceBoundsX(outline);
    var hits = intersectVertical(outline, x);
    if (hits.length < 2) return null;
    var top = -Infinity;
    var bot = Infinity;
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].y > top) top = hits[i].y;
      if (hits[i].y < bot) bot = hits[i].y;
    }
    var span = top - bot;
    var inset = Math.min(6, Math.max(4, span * 0.12));
    if (inset * 2 + 8 > span) inset = span * 0.18;
    return {
      a: SkirtBlock.V(x, top - inset),
      b: SkirtBlock.V(x, bot + inset),
    };
  }

  function drawGrainline(parent, draft, dx, toSvg) {
    var pieces = [
      SkirtBlock.backOutline(draft),
      SkirtBlock.translate(SkirtBlock.frontOutline(draft), dx),
    ];
    for (var i = 0; i < pieces.length; i++) {
      var grain = grainlineOnPiece(pieces[i]);
      if (grain) line(parent, grain.a, grain.b, STYLES.grain, toSvg);
    }
  }

  function nearestPoint(pts, target) {
    var best = pts[0];
    var bestD = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var ddx = pts[i].x - target.x;
      var ddy = pts[i].y - target.y;
      var d = ddx * ddx + ddy * ddy;
      if (d < bestD) {
        bestD = d;
        best = pts[i];
      }
    }
    return best;
  }

  function notchOutward(outline, pt, seam) {
    var probe = Math.max(seam, 0.8);
    var outer = SkirtBlock.offsetClosed(outline, probe);
    var towardCut = nearestPoint(outer, pt);
    var nx = towardCut.x - pt.x;
    var ny = towardCut.y - pt.y;
    var len = Math.hypot(nx, ny);
    if (!len) return SkirtBlock.V(0, 0);
    return SkirtBlock.V(nx / len, ny / len);
  }

  function drawNotch(parent, outline, pt, seam, toSvg) {
    var n = notchOutward(outline, pt, seam);
    var outLen = seam > 0.05 ? Math.max(0.45, Math.min(0.7, seam * 0.7)) : 0.6;
    line(
      parent,
      SkirtBlock.V(pt.x - n.x * 0.12, pt.y - n.y * 0.12),
      SkirtBlock.V(pt.x + n.x * outLen, pt.y + n.y * outLen),
      STYLES.grain,
      toSvg
    );
  }

  function drawNotches(parent, draft, dx, seam, toSvg) {
    var back = SkirtBlock.backOutline(draft);
    var front = SkirtBlock.frontOutline(draft);
    drawNotch(parent, back, draft.hip, seam, toSvg);
    drawNotch(parent, SkirtBlock.translate(front, dx), moved(draft.hip, dx), seam, toSvg);
  }

  function drawPiece(parent, outline, seam, toSvg) {
    parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(SkirtBlock.closeRing(outline), toSvg) }, STYLES.outline)));
    if (seam > 0) {
      var cutting = SkirtBlock.closeRing(SkirtBlock.offsetClosed(outline, seam));
      parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(cutting, toSvg) }, STYLES.seam)));
    }
  }

  function drawGrid(parent, box, toSvg) {
    var x0 = Math.floor(box.minX);
    var x1 = Math.ceil(box.maxX);
    var y0 = Math.floor(box.minY);
    var y1 = Math.ceil(box.maxY);
    for (var x = x0; x <= x1; x += 1) {
      line(parent, SkirtBlock.V(x, box.minY), SkirtBlock.V(x, box.maxY), STYLES.grid, toSvg);
    }
    for (var y = y0; y <= y1; y += 1) {
      line(parent, SkirtBlock.V(box.minX, y), SkirtBlock.V(box.maxX, y), STYLES.grid, toSvg);
    }
  }

  function thirdXs(fromX, toX) {
    var span = toX - fromX;
    return [0, 1, 2, 3].map(function (k) {
      return fromX + (span * k) / 3;
    });
  }

  function drawWaistThirds(parent, fromX, toX, y, dx, toSvg) {
    dx = dx || 0;
    var tick = 0.5;
    var xs = thirdXs(fromX, toX);
    for (var k = 0; k < xs.length; k++) {
      var pt = moved(SkirtBlock.V(xs[k], y), dx);
      line(parent, SkirtBlock.V(pt.x, pt.y - tick), SkirtBlock.V(pt.x, pt.y + tick), STYLES.construction, toSvg);
      if (k > 0 && k < 3) circle(parent, pt, 0.22, STYLES.point, toSvg);
    }
  }

  function labelWaistThirds(parent, fromX, toX, y, dx, toSvg) {
    dx = dx || 0;
    var xs = thirdXs(fromX, toX);
    for (var k = 0; k < 3; k++) {
      var mid = moved(SkirtBlock.V((xs[k] + xs[k + 1]) / 2, y - 0.85), dx);
      text(parent, mid, "1/3", Object.assign({}, STYLES.label, { "text-anchor": "middle" }), 0, 0, toSvg);
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
    var dx = SkirtBlock.frontDisplayShift(draft, seam);
    var contentBox = bbox(draft, seam);
    var box = sheetView(contentBox);
    var toSvg = renderer(box);

    var svg = PatternPage.beginSvg(drawing, box, "Women's basic skirt block");
    var typeSize = typeSizeForDrawing(box);
    STYLES.type["font-size"] = typeSize.toFixed(3);
    STYLES.type["letter-spacing"] = (typeSize * 0.1).toFixed(3);

    if (show.grid) drawGrid(svg, box, toSvg);

    if (show.construction) {
      line(svg, SkirtBlock.V(draft.cbX, draft.wlY), SkirtBlock.V(draft.sideX, draft.wlY), STYLES.construction, toSvg);
      line(svg, SkirtBlock.V(draft.cbX, draft.hlY), draft.hip, STYLES.construction, toSvg);
      line(svg, SkirtBlock.V(draft.cbX, draft.hemY), draft.sideHem, STYLES.construction, toSvg);
      line(svg, SkirtBlock.V(draft.cbX, draft.wlY), SkirtBlock.V(draft.cbX, draft.hemY), STYLES.construction, toSvg);
      line(svg, SkirtBlock.V(draft.sideX, draft.wlY + 2), SkirtBlock.V(draft.sideX, draft.hemY), STYLES.construction, toSvg);

      line(svg, moved(SkirtBlock.V(draft.sideX, draft.wlY), dx), moved(SkirtBlock.V(draft.cfX, draft.wlY), dx), STYLES.construction, toSvg);
      line(svg, moved(draft.hip, dx), moved(SkirtBlock.V(draft.cfX, draft.hlY), dx), STYLES.construction, toSvg);
      line(svg, moved(draft.sideHem, dx), moved(SkirtBlock.V(draft.cfX, draft.hemY), dx), STYLES.construction, toSvg);
      line(svg, moved(SkirtBlock.V(draft.cfX, draft.wlY), dx), moved(SkirtBlock.V(draft.cfX, draft.hemY), dx), STYLES.construction, toSvg);
      line(svg, moved(SkirtBlock.V(draft.sideX, draft.wlY + 2), dx), moved(SkirtBlock.V(draft.sideX, draft.hemY), dx), STYLES.construction, toSvg);
      drawWaistThirds(svg, draft.backWaistMark.x, draft.sideX, draft.wlY, 0, toSvg);
      drawWaistThirds(svg, draft.frontWaistMark.x, draft.sideX, draft.wlY, dx, toSvg);
    }

    drawPiece(svg, SkirtBlock.backOutline(draft), seam, toSvg);
    drawPiece(svg, SkirtBlock.translate(SkirtBlock.frontOutline(draft), dx), seam, toSvg);
    drawGrainline(svg, draft, dx, toSvg);
    drawNotches(svg, draft, dx, seam, toSvg);

    if (show.construction) {
      circle(svg, draft.cbWaist, 0.22, STYLES.point, toSvg);
      circle(svg, draft.backWaistMark, 0.22, STYLES.point, toSvg);
      circle(svg, draft.backSideWaist, 0.22, STYLES.point, toSvg);
      circle(svg, draft.hip, 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.cfWaist, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.frontWaistMark, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.frontSideWaist, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.hip, dx), 0.22, STYLES.point, toSvg);
    }

    if (show.labels) {
      text(svg, SkirtBlock.V(draft.backHip * 0.35, draft.hlY + 1.2), "Back", STYLES.label, 0, 0, toSvg);
      text(
        svg,
        moved(SkirtBlock.V((draft.sideX + draft.cfX) / 2, draft.hlY + 1.2), dx),
        "Front",
        STYLES.label,
        0,
        0,
        toSvg
      );
      if (show.construction) {
        text(svg, SkirtBlock.V(draft.cbX + 0.4, draft.hlY + 0.35), "HL", STYLES.label, 0, 0, toSvg);
        text(svg, SkirtBlock.V(draft.cbX + 0.4, draft.wlY + 0.35), "WL", STYLES.label, 0, 0, toSvg);
        labelWaistThirds(svg, draft.backWaistMark.x, draft.sideX, draft.wlY, 0, toSvg);
        labelWaistThirds(svg, draft.frontWaistMark.x, draft.sideX, draft.wlY, dx, toSvg);
      }
    }
    PatternPage.commitSvg(drawing, svg);
  }

  function stat(label, value) {
    return "<div class=\"stat\"><span class=\"k\">" + label + "</span><span class=\"v\">" + value + "</span></div>";
  }

  function renderStats(draft) {
    statsEl.innerHTML =
      stat("Total width", fmt(draft.totalWidth)) +
      stat("Back hip", fmt(draft.backHip)) +
      stat("Front hip", fmt(draft.frontHip)) +
      stat("Back waist", fmt(draft.backWaist)) +
      stat("Front waist", fmt(draft.frontWaist)) +
      stat("Side takeout", fmt(draft.sideTake));
    if (draft.notes.length) {
      notesEl.hidden = false;
      notesEl.textContent = draft.notes.join(" ");
    } else {
      notesEl.hidden = true;
      notesEl.textContent = "";
    }
  }

  function redraw() {
    outs.hip.textContent = fmt(fields.hip.value);
    outs.waist.textContent = fmt(fields.waist.value);
    outs.skirtLength.textContent = fmt(fields.skirtLength.value);
    outs.seamAllowance.textContent = fmt(fields.seamAllowance.value);

    PatternStore.write(currentParams());

    var draft = SkirtBlock.draftSkirt(currentParams());
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
