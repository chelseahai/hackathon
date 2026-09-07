(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var drawing = document.getElementById("drawing");
  var errorEl = document.getElementById("error");
  var statsEl = document.getElementById("stats");
  var notesEl = document.getElementById("notes");

  var fields = {
    bust: document.getElementById("bust"),
    backLength: document.getElementById("backLength"),
    seamAllowance: document.getElementById("seamAllowance"),
  };
  var outs = {
    bust: document.getElementById("bustOut"),
    backLength: document.getElementById("backLengthOut"),
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

  var OWNED = ["bust", "backLength", "seamAllowance"];

  function setFromStore() {
    PatternStore.fill(fields);
  }

  function toggleOn(el) {
    return el.getAttribute("aria-pressed") === "true";
  }

  function currentParams() {
    return {
      bust: Number(fields.bust.value),
      backLength: Number(fields.backLength.value),
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
    var dx = BodyBlock.frontDisplayShift(draft, seam);
    var back = BodyBlock.backOutline(draft);
    var front = BodyBlock.translate(BodyBlock.frontOutline(draft), dx);
    var pts = back.concat(front);
    if (seam > 0) {
      pts = pts.concat(BodyBlock.offsetClosed(back, seam));
      pts = pts.concat(BodyBlock.translate(BodyBlock.offsetClosed(BodyBlock.frontOutline(draft), seam), dx));
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
    return dx ? BodyBlock.V(pt.x + dx, pt.y) : pt;
  }

  function intersectVertical(poly, x) {
    var ring = BodyBlock.closeRing(poly);
    var hits = [];
    for (var i = 0; i < ring.length - 1; i++) {
      var a = ring[i];
      var b = ring[i + 1];
      if ((a.x - x) * (b.x - x) > 0) continue;
      if (Math.abs(b.x - a.x) < 1e-9) continue;
      var t = (x - a.x) / (b.x - a.x);
      if (t >= 0 && t <= 1) hits.push(BodyBlock.V(x, a.y + (b.y - a.y) * t));
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
      a: BodyBlock.V(x, top - inset),
      b: BodyBlock.V(x, bot + inset),
    };
  }

  function drawGrainline(parent, draft, dx, toSvg) {
    var pieces = [
      BodyBlock.backOutline(draft),
      BodyBlock.translate(BodyBlock.frontOutline(draft), dx),
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
      var dx = pts[i].x - target.x;
      var dy = pts[i].y - target.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = pts[i];
      }
    }
    return best;
  }

  function notchOutward(outline, pt, seam) {
    var probe = Math.max(seam, 0.8);
    var outer = BodyBlock.offsetClosed(outline, probe);
    var towardCut = nearestPoint(outer, pt);
    var dx = towardCut.x - pt.x;
    var dy = towardCut.y - pt.y;
    var len = Math.hypot(dx, dy);
    if (!len) return BodyBlock.V(0, 0);
    return BodyBlock.V(dx / len, dy / len);
  }

  function drawNotch(parent, outline, pt, seam, toSvg) {
    var n = notchOutward(outline, pt, seam);
    var outLen = seam > 0.05 ? Math.max(0.45, Math.min(0.7, seam * 0.7)) : 0.6;
    line(
      parent,
      BodyBlock.V(pt.x - n.x * 0.12, pt.y - n.y * 0.12),
      BodyBlock.V(pt.x + n.x * outLen, pt.y + n.y * outLen),
      STYLES.grain,
      toSvg
    );
    return n;
  }

  function drawNotches(parent, draft, dx, seam, toSvg) {
    var back = BodyBlock.backOutline(draft);
    var front = BodyBlock.frontOutline(draft);
    drawNotch(parent, back, draft.notchB, seam, toSvg);
    drawNotch(parent, BodyBlock.translate(front, dx), moved(draft.notchA, dx), seam, toSvg);
  }

  function drawPiece(parent, outline, seam, toSvg) {
    parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(BodyBlock.closeRing(outline), toSvg) }, STYLES.outline)));
    if (seam > 0) {
      var cutting = BodyBlock.closeRing(BodyBlock.offsetClosed(outline, seam));
      parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(cutting, toSvg) }, STYLES.seam)));
    }
  }

  function drawGrid(parent, box, toSvg) {
    var x0 = Math.floor(box.minX);
    var x1 = Math.ceil(box.maxX);
    var y0 = Math.floor(box.minY);
    var y1 = Math.ceil(box.maxY);
    for (var x = x0; x <= x1; x += 1) {
      line(parent, BodyBlock.V(x, box.minY), BodyBlock.V(x, box.maxY), STYLES.grid, toSvg);
    }
    for (var y = y0; y <= y1; y += 1) {
      line(parent, BodyBlock.V(box.minX, y), BodyBlock.V(box.maxX, y), STYLES.grid, toSvg);
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
    var dx = BodyBlock.frontDisplayShift(draft, seam);
    var contentBox = bbox(draft, seam);
    var box = sheetView(contentBox);
    var toSvg = renderer(box);

    var svg = PatternPage.beginSvg(drawing, box, "Women's basic bodice block");
    var typeSize = typeSizeForDrawing(box);
    STYLES.type["font-size"] = typeSize.toFixed(3);
    STYLES.type["letter-spacing"] = (typeSize * 0.1).toFixed(3);

    if (show.grid) drawGrid(svg, box, toSvg);

    if (show.construction) {
      line(svg, BodyBlock.V(draft.cbX, draft.topY), BodyBlock.V(draft.sideX, draft.topY), STYLES.construction, toSvg);
      line(svg, BodyBlock.V(draft.cbX, draft.blY), draft.underarm, STYLES.construction, toSvg);
      line(svg, BodyBlock.V(draft.cbX, draft.wlY), draft.sideWaist, STYLES.construction, toSvg);
      line(svg, BodyBlock.V(draft.cbX, draft.wlY), BodyBlock.V(draft.cbX, draft.topY), STYLES.construction, toSvg);
      line(svg, BodyBlock.V(draft.backWidthX, draft.blY), BodyBlock.V(draft.backWidthX, draft.topY), STYLES.construction, toSvg);
      line(svg, BodyBlock.V(draft.sideX, draft.wlY), BodyBlock.V(draft.sideX, draft.blY), STYLES.construction, toSvg);
      line(svg, draft.underarm, draft.sideWaist, STYLES.construction, toSvg);
      line(svg, draft.backSnp, draft.backShoulder, STYLES.construction, toSvg);
      line(svg, BodyBlock.V(draft.backSnp.x, draft.topY), draft.backSnp, STYLES.construction, toSvg);

      line(svg, moved(BodyBlock.V(draft.sideX, draft.topY), dx), moved(BodyBlock.V(draft.cfX, draft.topY), dx), STYLES.construction, toSvg);
      line(svg, moved(draft.underarm, dx), moved(BodyBlock.V(draft.cfX, draft.blY), dx), STYLES.construction, toSvg);
      line(svg, moved(draft.sideWaist, dx), moved(BodyBlock.V(draft.cfX, draft.wlY), dx), STYLES.construction, toSvg);
      line(svg, moved(BodyBlock.V(draft.cfX, draft.cfHem.y), dx), moved(BodyBlock.V(draft.cfX, draft.topY), dx), STYLES.construction, toSvg);
      line(svg, moved(BodyBlock.V(draft.chestWidthX, draft.blY), dx), moved(BodyBlock.V(draft.chestWidthX, draft.topY), dx), STYLES.construction, toSvg);
      line(svg, moved(BodyBlock.V(draft.sideX, draft.wlY), dx), moved(BodyBlock.V(draft.sideX, draft.blY), dx), STYLES.construction, toSvg);
      line(svg, moved(draft.underarm, dx), moved(draft.sideWaist, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.frontSnp, dx), moved(draft.frontShoulder, dx), STYLES.construction, toSvg);
      line(svg, moved(BodyBlock.V(draft.frontSnp.x, draft.topY), dx), moved(BodyBlock.V(draft.frontSnp.x, draft.cfNeck.y), dx), STYLES.construction, toSvg);
      line(svg, moved(BodyBlock.V(draft.frontSnp.x, draft.cfNeck.y), dx), moved(draft.cfNeck, dx), STYLES.construction, toSvg);
      line(svg, moved(BodyBlock.V(draft.bp.x, draft.blY), dx), moved(draft.hemAtBp, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.cfHem, dx), moved(draft.hemAtBp, dx), STYLES.construction, toSvg);
    }

    drawPiece(svg, BodyBlock.backOutline(draft), seam, toSvg);
    drawPiece(svg, BodyBlock.translate(BodyBlock.frontOutline(draft), dx), seam, toSvg);
    drawGrainline(svg, draft, dx, toSvg);
    drawNotches(svg, draft, dx, seam, toSvg);

    if (show.construction) {
      circle(svg, draft.underarm, 0.22, STYLES.point, toSvg);
      circle(svg, draft.sideWaist, 0.22, STYLES.point, toSvg);
      circle(svg, draft.backAhBisector, 0.22, STYLES.point, toSvg);
      circle(svg, BodyBlock.V(draft.backSnp.x, draft.topY), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.bp, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.underarm, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.sideWaist, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.frontAhBisector, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.frontNeckOffset, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.hemAtBp, dx), 0.22, STYLES.point, toSvg);
      circle(svg, draft.notchB, 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.notchA, dx), 0.22, STYLES.point, toSvg);
      circle(svg, draft.backAhHalf, 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.frontAhHalf, dx), 0.22, STYLES.point, toSvg);
      circle(svg, draft.backAhMid, 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.frontAhMid, dx), 0.22, STYLES.point, toSvg);
    }

    if (show.labels) {
      text(svg, BodyBlock.V(draft.backWidthX * 0.35, draft.blY + 1.2), "Back", STYLES.label, 0, 0, toSvg);
      text(svg, moved(BodyBlock.V((draft.chestWidthX + draft.cfX) / 2, draft.blY + 1.2), dx), "Front", STYLES.label, 0, 0, toSvg);
      if (show.construction) {
        text(svg, BodyBlock.V(draft.cbX + 0.4, draft.blY + 0.35), "BL", STYLES.label, 0, 0, toSvg);
        text(svg, BodyBlock.V(draft.cbX + 0.4, draft.wlY + 0.35), "WL", STYLES.label, 0, 0, toSvg);
        text(svg, moved(BodyBlock.V(draft.bp.x + 0.4, draft.bp.y + 0.35), dx), "BP", STYLES.label, 0, 0, toSvg);
        text(
          svg,
          BodyBlock.V((draft.backAhHalf.x + draft.notchB.x) / 2 - 1.1, (draft.backAhHalf.y + draft.notchB.y) / 2),
          "3",
          STYLES.label,
          0,
          0,
          toSvg
        );
        text(
          svg,
          moved(
            BodyBlock.V((draft.frontAhHalf.x + draft.notchA.x) / 2 + 0.5, (draft.frontAhHalf.y + draft.notchA.y) / 2),
            dx
          ),
          "3",
          STYLES.label,
          0,
          0,
          toSvg
        );
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
      stat("Back AH", fmt(draft.backArmholeLen)) +
      stat("Front AH", fmt(draft.frontArmholeLen)) +
      stat("Back width", fmt(draft.backWidth)) +
      stat("Chest width", fmt(draft.chestWidth)) +
      stat("Back shoulder", fmt(draft.backShoulderLen, 3)) +
      stat("Front shoulder", fmt(draft.frontShoulderLen, 3));
    if (draft.notes.length) {
      notesEl.hidden = false;
      notesEl.textContent = draft.notes.join(" ");
    } else {
      notesEl.hidden = true;
      notesEl.textContent = "";
    }
  }

  function redraw() {
    outs.bust.textContent = fmt(fields.bust.value);
    outs.backLength.textContent = fmt(fields.backLength.value);
    outs.seamAllowance.textContent = fmt(fields.seamAllowance.value);

    PatternStore.write(currentParams());

    var draft = BodyBlock.draftBody(currentParams());
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
    PatternStore.publish("bodice", {
      frontAh: draft.frontArmholeLen,
      backAh: draft.backArmholeLen,
    });
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
