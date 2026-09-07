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
    waist: document.getElementById("waist"),
    hip: document.getElementById("hip"),
    dressLength: document.getElementById("dressLength"),
    seamAllowance: document.getElementById("seamAllowance"),
  };
  var outs = {
    bust: document.getElementById("bustOut"),
    backLength: document.getElementById("backLengthOut"),
    waist: document.getElementById("waistOut"),
    hip: document.getElementById("hipOut"),
    dressLength: document.getElementById("dressLengthOut"),
    seamAllowance: document.getElementById("seamAllowanceOut"),
  };
  var toggles = {
    labels: document.getElementById("showLabels"),
    grid: document.getElementById("showGrid"),
    construction: document.getElementById("showConstruction"),
  };

  function fmt(n, digits) {
    return Number(n).toFixed(digits === undefined ? 2 : digits) + " cm";
  }

  var OWNED = ["bust", "backLength", "waist", "hip", "dressLength", "seamAllowance"];

  function toggleOn(el) {
    return el.getAttribute("aria-pressed") === "true";
  }

  function currentParams() {
    return {
      bust: Number(fields.bust.value),
      backLength: Number(fields.backLength.value),
      waist: Number(fields.waist.value),
      hip: Number(fields.hip.value),
      dressLength: Number(fields.dressLength.value),
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

  function bbox(draft, seam, margin, includeConstruction) {
    margin = margin || 4;
    var laid = PrincessDress.laidOutPanels(draft, seam);
    var pts = [];
    laid.forEach(function (panel) {
      pts = pts.concat(panel.outline);
      if (seam > 0) pts = pts.concat(PrincessDress.offsetClosed(panel.outline, seam));
      if (includeConstruction) {
        (panel.construction || []).forEach(function (poly) {
          pts = pts.concat(poly);
        });
        (panel.overlays || []).forEach(function (poly) {
          pts = pts.concat(poly);
        });
        (panel.preRotation || []).forEach(function (poly) {
          pts = pts.concat(poly);
        });
      }
    });
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

  var STYLES = {
    grid: { stroke: "#3a3a3a", "stroke-width": "0.6", "vector-effect": "non-scaling-stroke" },
    outline: { stroke: "#fff", "stroke-width": "0.8", fill: "none", "stroke-dasharray": "5 4", "vector-effect": "non-scaling-stroke" },
    seam: { stroke: "#fff", "stroke-width": "0.8", fill: "none", "vector-effect": "non-scaling-stroke" },
    grain: { stroke: "#fff", "stroke-width": "0.8", fill: "none", "vector-effect": "non-scaling-stroke" },
    construction: { stroke: "#b3b3b3", "stroke-width": "0.8", fill: "none", "stroke-dasharray": "5 4", "vector-effect": "non-scaling-stroke" },
    overlay: { stroke: "#4caf50", "stroke-width": "0.8", fill: "none", "stroke-dasharray": "5 4", "vector-effect": "non-scaling-stroke" },
    preRotation: { stroke: "#f5d76e", "stroke-width": "0.8", fill: "none", "stroke-dasharray": "5 4", "vector-effect": "non-scaling-stroke" },
    point: { fill: "#b3b3b3", stroke: "none" },
    type: {
      "font-family": "Poppins, sans-serif",
      "font-weight": "400",
      "letter-spacing": "0.08rem",
      "text-transform": "uppercase",
    },
    label: { fill: "#fff" },
    mark: { fill: "#b3b3b3" },
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

  function intersectVertical(poly, x) {
    var ring = PrincessDress.closeRing(poly);
    var hits = [];
    for (var i = 0; i < ring.length - 1; i++) {
      var a = ring[i];
      var b = ring[i + 1];
      if ((a.x - x) * (b.x - x) > 0) continue;
      if (Math.abs(b.x - a.x) < 1e-9) continue;
      var t = (x - a.x) / (b.x - a.x);
      if (t >= 0 && t <= 1) hits.push(PrincessDress.V(x, a.y + (b.y - a.y) * t));
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
      a: PrincessDress.V(x, top - inset),
      b: PrincessDress.V(x, bot + inset),
    };
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
    var outer = PrincessDress.offsetClosed(outline, probe);
    var towardCut = nearestPoint(outer, pt);
    var dx = towardCut.x - pt.x;
    var dy = towardCut.y - pt.y;
    var len = Math.hypot(dx, dy);
    if (!len) return PrincessDress.V(0, 0);
    return PrincessDress.V(dx / len, dy / len);
  }

  function drawNotch(parent, outline, pt, seam, toSvg) {
    var n = notchOutward(outline, pt, seam);
    var outLen = seam > 0.05 ? Math.max(0.45, Math.min(0.7, seam * 0.7)) : 0.6;
    line(
      parent,
      PrincessDress.V(pt.x - n.x * 0.12, pt.y - n.y * 0.12),
      PrincessDress.V(pt.x + n.x * outLen, pt.y + n.y * outLen),
      STYLES.grain,
      toSvg
    );
  }

  function drawPiece(parent, outline, seam, toSvg) {
    parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(PrincessDress.closeRing(outline), toSvg) }, STYLES.outline)));
    if (seam > 0) {
      var cutting = PrincessDress.closeRing(PrincessDress.offsetClosed(outline, seam));
      parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(cutting, toSvg) }, STYLES.seam)));
    }
  }

  function drawGrid(parent, box, toSvg) {
    var x0 = Math.floor(box.minX);
    var x1 = Math.ceil(box.maxX);
    var y0 = Math.floor(box.minY);
    var y1 = Math.ceil(box.maxY);
    for (var x = x0; x <= x1; x += 1) {
      line(parent, PrincessDress.V(x, box.minY), PrincessDress.V(x, box.maxY), STYLES.grid, toSvg);
    }
    for (var y = y0; y <= y1; y += 1) {
      line(parent, PrincessDress.V(box.minX, y), PrincessDress.V(box.maxX, y), STYLES.grid, toSvg);
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
      labels: toggleOn(toggles.labels),
      grid: toggleOn(toggles.grid),
      construction: toggleOn(toggles.construction),
    };
    var seam = Number(fields.seamAllowance.value) || 0;
    var laid = PrincessDress.laidOutPanels(draft, seam);
    var contentBox = bbox(draft, seam, 4, show.construction);
    var box = sheetView(contentBox);
    var toSvg = renderer(box);

    var svg = PatternPage.beginSvg(drawing, box, "Princess line dress");
    var typeSize = typeSizeForDrawing(box);
    STYLES.type["font-size"] = typeSize.toFixed(3);
    STYLES.type["letter-spacing"] = (typeSize * 0.1).toFixed(3);

    if (show.grid) drawGrid(svg, box, toSvg);

    for (var i = 0; i < laid.length; i++) {
      drawPiece(svg, laid[i].outline, seam, toSvg);
      var grain = grainlineOnPiece(laid[i].outline);
      if (grain) line(svg, grain.a, grain.b, STYLES.grain, toSvg);
      for (var n = 0; n < laid[i].notches.length; n++) {
        drawNotch(svg, laid[i].outline, laid[i].notches[n], seam, toSvg);
      }
      if (show.construction) {
        function drawPolys(polys, style) {
          for (var c = 0; c < polys.length; c++) {
            svg.appendChild(
              svgEl("polyline", Object.assign({ points: pointsAttr(polys[c], toSvg) }, style))
            );
          }
        }
        drawPolys(laid[i].overlays || [], STYLES.overlay);
        drawPolys(laid[i].preRotation || [], STYLES.preRotation);
        drawPolys(laid[i].construction || [], STYLES.construction);
        var marks = laid[i].marks || [];
        for (var m = 0; m < marks.length; m++) {
          var mark = marks[m];
          var pt = mark.pt || mark;
          circle(svg, pt, 0.22, STYLES.point, toSvg);
          if (mark.label) text(svg, pt, mark.label, STYLES.mark, 0.4, -0.2, toSvg);
        }
      }
      if (show.labels) {
        var xs = laid[i].outline.map(function (pt) { return pt.x; });
        var ys = laid[i].outline.map(function (pt) { return pt.y; });
        var mid = PrincessDress.V(
          (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2,
          (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2
        );
        text(svg, mid, laid[i].name, STYLES.label, 0, 0, toSvg);
      }
    }
    PatternPage.commitSvg(drawing, svg);
  }

  function stat(label, value) {
    return "<div class=\"stat\"><span class=\"k\">" + label + "</span><span class=\"v\">" + value + "</span></div>";
  }

  function renderStats(draft) {
    statsEl.innerHTML =
      stat("Back waist", fmt(draft.backWaist)) +
      stat("Front waist", fmt(draft.frontWaist)) +
      stat("Back hip", fmt(draft.backHip)) +
      stat("Front hip", fmt(draft.frontHip)) +
      stat("Back dart", fmt(draft.backDart)) +
      stat("Front dart", fmt(draft.frontDart)) +
      stat("Side dart", fmt(draft.sideDart));
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
    outs.waist.textContent = fmt(fields.waist.value);
    outs.hip.textContent = fmt(fields.hip.value);
    outs.dressLength.textContent = fmt(fields.dressLength.value);
    outs.seamAllowance.textContent = fmt(fields.seamAllowance.value);

    PatternStore.write(currentParams());

    var draft = PrincessDress.draftPrincessDress(currentParams());
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

  function exportDxf() {
    var draft = PrincessDress.draftPrincessDress(currentParams());
    if (draft.error) return;
    var seam = Number(fields.seamAllowance.value) || 0;
    var laid = PrincessDress.laidOutPanels(draft, seam);
    var pieces = PatternDxf.piecesFromLaid(
      laid,
      seam,
      PrincessDress.offsetClosed,
      PrincessDress.closeRing
    );
    PatternDxf.download("princess-line-dress.dxf", PatternDxf.fromPieces(pieces));
  }

  document.getElementById("exportDxf").addEventListener("click", exportDxf);

  PatternPage.mount({
    fields: fields,
    toggles: toggles,
    owned: OWNED,
    sheet: document.getElementById("sheet"),
    reset: document.getElementById("reset"),
    redraw: redraw,
  });
})();
