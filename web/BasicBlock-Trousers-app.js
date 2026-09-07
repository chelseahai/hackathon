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
    trouserLength: document.getElementById("trouserLength"),
    rise: document.getElementById("rise"),
    hem: document.getElementById("hem"),
    seamAllowance: document.getElementById("seamAllowance"),
  };
  var outs = {
    hip: document.getElementById("hipOut"),
    waist: document.getElementById("waistOut"),
    trouserLength: document.getElementById("trouserLengthOut"),
    rise: document.getElementById("riseOut"),
    hem: document.getElementById("hemOut"),
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

  var OWNED = ["hip", "waist", "trouserLength", "rise", "hem", "seamAllowance"];

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
      trouserLength: Number(fields.trouserLength.value),
      rise: Number(fields.rise.value),
      hem: Number(fields.hem.value),
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
    var dx = TrouserBlock.frontDisplayShift(draft, seam);
    var back = TrouserBlock.backOutline(draft);
    var front = TrouserBlock.translate(TrouserBlock.frontOutline(draft), dx);
    var pts = back.concat(front);
    if (seam > 0) {
      pts = pts.concat(TrouserBlock.offsetClosed(TrouserBlock.backOutline(draft, true), seam));
      pts = pts.concat(
        TrouserBlock.translate(TrouserBlock.offsetClosed(TrouserBlock.frontOutline(draft, true), seam), dx)
      );
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

  function moved(pt, dx) {
    return TrouserBlock.V(pt.x + dx, pt.y);
  }

  function backPt(pt) {
    return TrouserBlock.mirrorX(pt);
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
    seam: { stroke: "#fff", "stroke-width": "0.8", fill: "none", "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" },
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

  function intersectVertical(poly, x) {
    var ring = TrouserBlock.closeRing(poly);
    var hits = [];
    for (var i = 0; i < ring.length - 1; i++) {
      var a = ring[i];
      var b = ring[i + 1];
      if ((a.x - x) * (b.x - x) > 0) continue;
      if (Math.abs(b.x - a.x) < 1e-9) continue;
      var t = (x - a.x) / (b.x - a.x);
      if (t >= 0 && t <= 1) hits.push(TrouserBlock.V(x, a.y + (b.y - a.y) * t));
    }
    return hits;
  }

  function grainlineOnPiece(poly, x) {
    var hits = intersectVertical(poly, x);
    if (hits.length < 2) return null;
    var top = hits[0].y;
    var bot = hits[0].y;
    for (var i = 1; i < hits.length; i++) {
      if (hits[i].y > top) top = hits[i].y;
      if (hits[i].y < bot) bot = hits[i].y;
    }
    var span = top - bot;
    var inset = Math.min(8, Math.max(5, span * 0.08));
    if (inset * 2 + 10 > span) inset = span * 0.12;
    return {
      a: TrouserBlock.V(x, top - inset),
      b: TrouserBlock.V(x, bot + inset),
    };
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
    var outer = TrouserBlock.offsetClosed(outline, probe);
    var towardCut = nearestPoint(outer, pt);
    var nx = towardCut.x - pt.x;
    var ny = towardCut.y - pt.y;
    var len = Math.hypot(nx, ny);
    if (!len) return TrouserBlock.V(0, 0);
    return TrouserBlock.V(nx / len, ny / len);
  }

  function drawNotch(parent, outline, pt, seam, toSvg) {
    var n = notchOutward(outline, pt, seam);
    var outLen = seam > 0.05 ? Math.max(0.45, Math.min(0.7, seam * 0.7)) : 0.6;
    line(
      parent,
      TrouserBlock.V(pt.x - n.x * 0.12, pt.y - n.y * 0.12),
      TrouserBlock.V(pt.x + n.x * outLen, pt.y + n.y * outLen),
      STYLES.grain,
      toSvg
    );
  }

  function drawPiece(parent, outline, cutting, seam, toSvg) {
    parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(TrouserBlock.closeRing(outline), toSvg) }, STYLES.outline)));
    if (seam > 0) {
      var cut = TrouserBlock.closeRing(TrouserBlock.offsetClosed(cutting, seam));
      parent.appendChild(svgEl("polyline", Object.assign({ points: pointsAttr(cut, toSvg) }, STYLES.seam)));
    }
  }

  function drawGrid(parent, box, toSvg) {
    var x0 = Math.floor(box.minX);
    var x1 = Math.ceil(box.maxX);
    var y0 = Math.floor(box.minY);
    var y1 = Math.ceil(box.maxY);
    for (var x = x0; x <= x1; x += 1) {
      line(parent, TrouserBlock.V(x, box.minY), TrouserBlock.V(x, box.maxY), STYLES.grid, toSvg);
    }
    for (var y = y0; y <= y1; y += 1) {
      line(parent, TrouserBlock.V(box.minX, y), TrouserBlock.V(box.maxX, y), STYLES.grid, toSvg);
    }
  }

  function drawTicksAlong(parent, points, toSvg) {
    var tick = 0.45;
    for (var i = 0; i < points.length; i++) {
      var tan;
      if (i === 0) tan = TrouserBlock.V(points[1].x - points[0].x, points[1].y - points[0].y);
      else if (i === points.length - 1) tan = TrouserBlock.V(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      else tan = TrouserBlock.V(points[i + 1].x - points[i - 1].x, points[i + 1].y - points[i - 1].y);
      var len = Math.hypot(tan.x, tan.y) || 1;
      var nx = -tan.y / len;
      var ny = tan.x / len;
      var pt = points[i];
      line(
        parent,
        TrouserBlock.V(pt.x - nx * tick, pt.y - ny * tick),
        TrouserBlock.V(pt.x + nx * tick, pt.y + ny * tick),
        STYLES.construction,
        toSvg
      );
      if (i > 0 && i < points.length - 1) circle(parent, pt, 0.22, STYLES.point, toSvg);
    }
  }

  function drawThirdTicks(parent, points, horizontal, toSvg) {
    var tick = 0.5;
    for (var i = 0; i < points.length; i++) {
      var pt = points[i];
      if (horizontal) {
        line(parent, TrouserBlock.V(pt.x - tick, pt.y), TrouserBlock.V(pt.x + tick, pt.y), STYLES.construction, toSvg);
      } else {
        line(parent, TrouserBlock.V(pt.x, pt.y - tick), TrouserBlock.V(pt.x, pt.y + tick), STYLES.construction, toSvg);
      }
      if (i > 0 && i < points.length - 1) circle(parent, pt, 0.22, STYLES.point, toSvg);
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
    var dx = TrouserBlock.frontDisplayShift(draft, seam);
    var contentBox = bbox(draft, seam);
    var box = sheetView(contentBox);
    var toSvg = renderer(box);

    var svg = PatternPage.beginSvg(drawing, box, "Women's basic trouser block, back and front");
    var typeSize = typeSizeForDrawing(box);
    STYLES.type["font-size"] = typeSize.toFixed(3);
    STYLES.type["letter-spacing"] = (typeSize * 0.1).toFixed(3);

    if (show.grid) drawGrid(svg, box, toSvg);

    if (show.construction) {
      line(svg, backPt(TrouserBlock.V(draft.backHlSide.x, draft.wlY)), backPt(draft.backBase), STYLES.construction, toSvg);
      line(svg, backPt(TrouserBlock.V(draft.backHlSide.x, draft.hlY)), backPt(draft.backCbHl), STYLES.construction, toSvg);
      line(svg, backPt(draft.backBase), backPt(draft.backCrotchOnCl), STYLES.construction, toSvg);
      line(svg, backPt(draft.backCrotchOnCl), backPt(draft.backCrotchTip), STYLES.construction, toSvg);
      line(svg, backPt(draft.backHemSide), backPt(draft.backHemInseam), STYLES.construction, toSvg);
      line(svg, backPt(TrouserBlock.V(draft.backKneeSide.x, draft.klY)), backPt(TrouserBlock.V(draft.backKneeInseam.x, draft.klY)), STYLES.construction, toSvg);
      line(svg, backPt(draft.backCbWaist), backPt(draft.backBase), STYLES.construction, toSvg);
      line(svg, backPt(TrouserBlock.V(draft.creaseX, draft.wlY)), backPt(TrouserBlock.V(draft.creaseX, draft.hemY)), STYLES.construction, toSvg);
      line(svg, backPt(draft.backCrotchTip), backPt(draft.backHemInseam), STYLES.construction, toSvg);
      line(svg, backPt(draft.backHlSide), backPt(draft.backKneeSide), STYLES.construction, toSvg);

      line(svg, moved(TrouserBlock.V(draft.sideX, draft.wlY), dx), moved(TrouserBlock.V(draft.cfBoxX, draft.wlY), dx), STYLES.construction, toSvg);
      line(svg, moved(TrouserBlock.V(draft.sideX, draft.hlY), dx), moved(TrouserBlock.V(draft.cfBoxX, draft.hlY), dx), STYLES.construction, toSvg);
      line(svg, moved(TrouserBlock.V(draft.sideX, draft.clY), dx), moved(draft.point5, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.hemSide, dx), moved(draft.hemInseam, dx), STYLES.construction, toSvg);
      line(svg, moved(TrouserBlock.V(draft.sideX, draft.klY), dx), moved(TrouserBlock.V(draft.kneeInseam.x + 1, draft.klY), dx), STYLES.construction, toSvg);
      line(svg, moved(TrouserBlock.V(draft.sideX, draft.wlY), dx), moved(TrouserBlock.V(draft.sideX, draft.hemY), dx), STYLES.construction, toSvg);
      line(svg, moved(TrouserBlock.V(draft.cfBoxX, draft.wlY), dx), moved(TrouserBlock.V(draft.cfBoxX, draft.clY), dx), STYLES.construction, toSvg);
      line(svg, moved(TrouserBlock.V(draft.cfX, draft.wlY), dx), moved(draft.cfHl, dx), STYLES.construction, toSvg);
      line(svg, moved(TrouserBlock.V(draft.creaseX, draft.wlY), dx), moved(TrouserBlock.V(draft.creaseX, draft.hemY), dx), STYLES.construction, toSvg);
      line(svg, moved(draft.hemSide, dx), moved(draft.point4, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.point4, dx), moved(draft.waistCorner, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.kneeSide, dx), moved(draft.hemSide, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.kneeSide, dx), moved(draft.waistCorner, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.point5, dx), moved(draft.hemInseam, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.hip11, dx), moved(draft.point5, dx), STYLES.construction, toSvg);
      line(svg, moved(draft.crotchCorner, dx), moved(draft.bisectorHit, dx), STYLES.construction, toSvg);
      drawThirdTicks(svg, draft.riseThirds.map(function (pt) { return moved(pt, dx); }), true, toSvg);
      drawTicksAlong(svg, draft.crotchThirds.map(function (pt) { return moved(pt, dx); }), toSvg);
    }

    var back = TrouserBlock.backOutline(draft);
    var front = TrouserBlock.translate(TrouserBlock.frontOutline(draft), dx);
    drawPiece(svg, back, TrouserBlock.backOutline(draft, true), seam, toSvg);
    drawPiece(svg, front, TrouserBlock.translate(TrouserBlock.frontOutline(draft, true), dx), seam, toSvg);

    var backGrain = grainlineOnPiece(back, -draft.creaseX);
    if (backGrain) line(svg, backGrain.a, backGrain.b, STYLES.grain, toSvg);
    var frontGrain = grainlineOnPiece(front, draft.creaseX + dx);
    if (frontGrain) line(svg, frontGrain.a, frontGrain.b, STYLES.grain, toSvg);
    drawNotch(svg, back, backPt(draft.backHlSide), seam, toSvg);
    drawNotch(svg, front, moved(draft.hlSide, dx), seam, toSvg);

    if (show.construction) {
      var dartOver = 0.6;
      line(svg, backPt(TrouserBlock.V(draft.backDartMid.x, draft.backDartMid.y + dartOver)), backPt(draft.backDartApex), STYLES.construction, toSvg);
      circle(svg, backPt(draft.backDartMid), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backCbWaist), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backSideWaist), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backBase), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backCrotchOnCl), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backCrotchTip), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backCbHl), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backHlSide), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backKneeSide), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backKneeInseam), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backHemSide), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backHemInseam), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backHemMid), 0.22, STYLES.point, toSvg);
      circle(svg, backPt(draft.backDartApex), 0.22, STYLES.point, toSvg);

      var cfAxis = moved(TrouserBlock.V(draft.dartCfMid.x, draft.dartCfMid.y + dartOver), dx);
      var sideAxis = moved(TrouserBlock.V(draft.dartSideMid.x, draft.dartSideMid.y + dartOver), dx);
      line(svg, cfAxis, moved(draft.dartCfApex, dx), STYLES.construction, toSvg);
      line(svg, sideAxis, moved(draft.dartSideApex, dx), STYLES.construction, toSvg);
      circle(svg, moved(draft.dartCfMid, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.dartSideMid, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.cfWaist, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.sideWaist, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.point4, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.point5, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.hip11, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.kneeSide, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.kneeInseam, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.hemSide, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.hemInseam, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.hemMid, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.dartCfApex, dx), 0.22, STYLES.point, toSvg);
      circle(svg, moved(draft.dartSideApex, dx), 0.22, STYLES.point, toSvg);
    }

    if (show.labels) {
      text(svg, TrouserBlock.V(-draft.creaseX - 0.5, (draft.hlY + draft.klY) / 2), "Back", Object.assign({}, STYLES.label, { "text-anchor": "end" }), 0, 0, toSvg);
      text(svg, moved(TrouserBlock.V(draft.creaseX + 0.5, (draft.hlY + draft.klY) / 2), dx), "Front", STYLES.label, 0, 0, toSvg);
      if (show.construction) {
        text(svg, moved(TrouserBlock.V(draft.sideX + 0.4, draft.wlY + 0.35), dx), "WL", STYLES.label, 0, 0, toSvg);
        text(svg, moved(TrouserBlock.V(draft.sideX + 0.4, draft.hlY + 0.35), dx), "HL", STYLES.label, 0, 0, toSvg);
        text(svg, moved(TrouserBlock.V(draft.sideX + 0.4, draft.klY + 0.35), dx), "KL", STYLES.label, 0, 0, toSvg);
        var riseMid0 = moved(TrouserBlock.V(draft.cfBoxX - 1.1, (draft.riseThirds[0].y + draft.riseThirds[1].y) / 2), dx);
        var riseMid1 = moved(TrouserBlock.V(draft.cfBoxX - 1.1, (draft.riseThirds[1].y + draft.riseThirds[2].y) / 2), dx);
        var riseMid2 = moved(TrouserBlock.V(draft.cfBoxX - 1.1, (draft.riseThirds[2].y + draft.riseThirds[3].y) / 2), dx);
        text(svg, riseMid0, "1/3", Object.assign({}, STYLES.label, { "text-anchor": "end" }), 0, 0, toSvg);
        text(svg, riseMid1, "1/3", Object.assign({}, STYLES.label, { "text-anchor": "end" }), 0, 0, toSvg);
        text(svg, riseMid2, "1/3", Object.assign({}, STYLES.label, { "text-anchor": "end" }), 0, 0, toSvg);
        var ca = moved(draft.crotchThirds[1], dx);
        var cb = moved(draft.crotchThirds[2], dx);
        var cdx = cb.x - ca.x;
        var cdy = cb.y - ca.y;
        var clen = Math.hypot(cdx, cdy) || 1;
        var cmid = TrouserBlock.V(
          (ca.x + cb.x) / 2 + (cdy / clen) * 1.6,
          (ca.y + cb.y) / 2 - (cdx / clen) * 1.6
        );
        text(svg, cmid, "1/3", Object.assign({}, STYLES.label, { "text-anchor": "middle" }), 0, 0, toSvg);
      }
    }
    PatternPage.commitSvg(drawing, svg);
  }

  function stat(label, value) {
    return "<div class=\"stat\"><span class=\"k\">" + label + "</span><span class=\"v\">" + value + "</span></div>";
  }

  function renderStats(draft) {
    statsEl.innerHTML =
      stat("Front hip", fmt(draft.frontHip)) +
      stat("Back hip", fmt(draft.backHip)) +
      stat("Front waist", fmt(draft.frontWaist)) +
      stat("Back waist", fmt(draft.backWaistLen)) +
      stat("Front crotch", fmt(draft.crotchExt)) +
      stat("Back crotch", fmt(draft.backCrotchExt));
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
    outs.trouserLength.textContent = fmt(fields.trouserLength.value);
    outs.rise.textContent = fmt(fields.rise.value);
    outs.hem.textContent = fmt(fields.hem.value);
    outs.seamAllowance.textContent = fmt(fields.seamAllowance.value);

    PatternStore.write(currentParams());

    var draft = TrouserBlock.draftTrouser(currentParams());
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
