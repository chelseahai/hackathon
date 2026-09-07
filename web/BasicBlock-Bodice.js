/* Women's basic bodice block — same geometry as BasicBlock-Bodice/draft.py. Units: cm. */

(function (global) {
  "use strict";

  function V(x, y) {
    return { x: x, y: y };
  }

  function add(a, b) {
    return V(a.x + b.x, a.y + b.y);
  }

  function sub(a, b) {
    return V(a.x - b.x, a.y - b.y);
  }

  function mul(a, s) {
    return V(a.x * s, a.y * s);
  }

  function length(a) {
    return Math.hypot(a.x, a.y);
  }

  function unit(a) {
    var len = length(a);
    return len === 0 ? V(0, 0) : V(a.x / len, a.y / len);
  }

  function lerp(a, b, t) {
    return V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  var DEFAULT_PARAMS = {
    bust: 84,
    backLength: 38,
    widthEase: 5,
    armholeDepthAdd: 7,
    backWidthAdd: 4.5,
    chestWidthAdd: 3,
    neckUnitDiv: 12,
    frontNeckWidthMinus: 0.2,
    frontNeckDepthAdd: 1,
    frontSideNeckDrop: 0.5,
    frontNeckBisectorMinus: 0.3,
    backShoulderOut: 2,
    frontShoulderShorter: 1.8,
    backAhBisectorExtra: 0.5,
    sideSeamToBack: 2,
    bpToArmhole: 0.7,
    bpBelowBl: 4,
    sleeveNotchDown: 3,
    splineSamples: 32,
    seamAllowance: 1,
  };

  function naturalSeconds(t, values) {
    var n = values.length - 1;
    var m = [];
    for (var i = 0; i <= n; i++) m.push(0);
    if (n < 2) return m;
    var h = [];
    for (var i = 0; i < n; i++) h.push(t[i + 1] - t[i]);
    var size = n - 1;
    var a = new Array(size);
    var b = new Array(size);
    var c = new Array(size);
    var d = new Array(size);
    for (var i = 1; i < n; i++) {
      var k = i - 1;
      a[k] = h[i - 1];
      b[k] = 2 * (h[i - 1] + h[i]);
      c[k] = h[i];
      d[k] = 6 * ((values[i + 1] - values[i]) / h[i] - (values[i] - values[i - 1]) / h[i - 1]);
    }
    for (var i = 1; i < size; i++) {
      var w = a[i] / b[i - 1];
      b[i] -= w * c[i - 1];
      d[i] -= w * d[i - 1];
    }
    var interior = new Array(size);
    interior[size - 1] = d[size - 1] / b[size - 1];
    for (var i = size - 2; i >= 0; i--) {
      interior[i] = (d[i] - c[i] * interior[i + 1]) / b[i];
    }
    for (var i = 0; i < size; i++) m[i + 1] = interior[i];
    return m;
  }

  function evalNaturalCubic(s, t0, t1, y0, y1, m0, m1) {
    var h = t1 - t0;
    var a = t1 - s;
    var b = s - t0;
    return (
      (m0 / (6 * h)) * a * a * a +
      (m1 / (6 * h)) * b * b * b +
      (y0 / h - (m0 * h) / 6) * a +
      (y1 / h - (m1 * h) / 6) * b
    );
  }

  function interpolate(points, samples) {
    if (points.length < 2) return points.slice();
    if (points.length === 2) {
      var line = [];
      for (var i = 0; i <= samples; i++) line.push(lerp(points[0], points[1], i / samples));
      return line;
    }
    var t = [0];
    for (var i = 0; i < points.length - 1; i++) {
      t.push(t[t.length - 1] + length(sub(points[i + 1], points[i])));
    }
    var xs = points.map(function (p) { return p.x; });
    var ys = points.map(function (p) { return p.y; });
    var mx = naturalSeconds(t, xs);
    var my = naturalSeconds(t, ys);
    var out = [];
    for (var i = 0; i < points.length - 1; i++) {
      for (var k = 0; k < samples; k++) {
        var s = t[i] + (t[i + 1] - t[i]) * (k / samples);
        out.push(
          V(
            evalNaturalCubic(s, t[i], t[i + 1], xs[i], xs[i + 1], mx[i], mx[i + 1]),
            evalNaturalCubic(s, t[i], t[i + 1], ys[i], ys[i + 1], my[i], my[i + 1])
          )
        );
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }

  function arcHorizontalAtStart(start, end, samples) {
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var n = Math.max(samples || 32, 2);
    if (Math.abs(dy) < 1e-9) {
      var line = [];
      for (var i = 0; i < n; i++) line.push(lerp(start, end, i / (n - 1)));
      return line;
    }
    var radius = (dx * dx + dy * dy) / (2 * dy);
    var center = V(start.x, start.y + radius);
    var r = Math.hypot(start.x - center.x, start.y - center.y);
    var a0 = Math.atan2(start.y - center.y, start.x - center.x);
    var a1 = Math.atan2(end.y - center.y, end.x - center.x);
    var da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = a0 + da * i / (n - 1);
      out.push(V(center.x + r * Math.cos(a), center.y + r * Math.sin(a)));
    }
    out[0] = start;
    out[out.length - 1] = end;
    return out;
  }

  function samePoint(a, b, eps) {
    return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
  }

  function dedupeClosed(points, eps) {
    eps = eps === undefined ? 1e-6 : eps;
    var out = [];
    for (var i = 0; i < points.length; i++) {
      if (!out.length || !samePoint(points[i], out[out.length - 1], eps)) out.push(points[i]);
    }
    if (out.length > 1 && samePoint(out[0], out[out.length - 1], eps)) out.pop();
    return out;
  }

  function closeRing(points) {
    if (!points.length) return points.slice();
    var out = points.slice();
    if (!samePoint(out[0], out[out.length - 1], 1e-6)) out.push(out[0]);
    return out;
  }

  function signedArea(ring) {
    var area = 0;
    var n = ring.length;
    for (var i = 0; i < n; i++) {
      var a = ring[i];
      var b = ring[(i + 1) % n];
      area += a.x * b.y - b.x * a.y;
    }
    return area;
  }

  function edgeOutward(from, to, ccw) {
    var d = unit(sub(to, from));
    return ccw ? V(d.y, -d.x) : V(-d.y, d.x);
  }

  function offsetClosed(points, dist) {
    var ring = dedupeClosed(points);
    var n = ring.length;
    if (n < 3 || !dist) return ring.slice();
    var ccw = signedArea(ring) > 0;
    var out = [];
    for (var i = 0; i < n; i++) {
      var prev = ring[(i - 1 + n) % n];
      var curr = ring[i];
      var next = ring[(i + 1) % n];
      var n1 = edgeOutward(prev, curr, ccw);
      var n2 = edgeOutward(curr, next, ccw);
      var den = 1 + n1.x * n2.x + n1.y * n2.y;
      if (Math.abs(den) < 0.05) {
        out.push(add(curr, mul(n1, dist)));
        continue;
      }
      var miter = dist / den;
      var limit = Math.abs(dist) * 4;
      if (Math.abs(miter) > limit) miter = miter < 0 ? -limit : limit;
      out.push(add(curr, V((n1.x + n2.x) * miter, (n1.y + n2.y) * miter)));
    }
    return out;
  }

  function horizCircle(center, radius, y, towardSmallerX) {
    var dy = y - center.y;
    var span = radius * radius - dy * dy;
    var dx = span < 0 ? 0 : Math.sqrt(span);
    return V(towardSmallerX ? center.x - dx : center.x + dx, y);
  }

  function intersectHorizontal(poly, y) {
    var hits = [];
    for (var i = 0; i < poly.length - 1; i++) {
      var a = poly[i];
      var b = poly[i + 1];
      if ((a.y - y) * (b.y - y) > 0) continue;
      if (Math.abs(b.y - a.y) < 1e-9) continue;
      var t = (y - a.y) / (b.y - a.y);
      if (t >= 0 && t <= 1) hits.push(lerp(a, b, t));
    }
    return hits;
  }

  function polylineLength(points) {
    var sum = 0;
    for (var i = 0; i < points.length - 1; i++) sum += length(sub(points[i + 1], points[i]));
    return sum;
  }

  function pointAlong(points, distance) {
    if (!points.length) return V(0, 0);
    if (distance <= 0) return points[0];
    var remaining = distance;
    for (var i = 0; i < points.length - 1; i++) {
      var seg = length(sub(points[i + 1], points[i]));
      if (remaining <= seg) return lerp(points[i], points[i + 1], seg ? remaining / seg : 0);
      remaining -= seg;
    }
    return points[points.length - 1];
  }

  function armholeHalfAndNotch(armhole, down) {
    var total = polylineLength(armhole);
    var half = total / 2;
    var mid = pointAlong(armhole, half);
    var startsAtUnderarm = armhole[0].y < armhole[armhole.length - 1].y;
    var notch = startsAtUnderarm
      ? pointAlong(armhole, Math.max(0, half - down))
      : pointAlong(armhole, Math.min(total, half + down));
    return { mid: mid, notch: notch };
  }

  var PIECE_GAP = 4;

  function backOutline(draft) {
    return dedupeClosed(
      draft.backNeck
        .concat([draft.backShoulder])
        .concat(draft.backArmhole.slice(1))
        .concat([draft.sideWaist, draft.cbWaist])
    );
  }

  function frontOutline(draft) {
    return dedupeClosed(
      draft.frontArmhole
        .concat([draft.frontSnp])
        .concat(draft.frontNeck.slice(1))
        .concat([draft.cfHem])
        .concat(draft.hem.slice(1))
    );
  }

  function translate(points, dx, dy) {
    dy = dy || 0;
    if (!dx && !dy) return points.slice();
    return points.map(function (pt) {
      return V(pt.x + dx, pt.y + dy);
    });
  }

  function frontDisplayShift(draft, seam, gap) {
    gap = gap === undefined ? PIECE_GAP : gap;
    var back = backOutline(draft);
    var front = frontOutline(draft);
    var backPts = seam ? back.concat(offsetClosed(back, seam)) : back;
    var frontPts = seam ? front.concat(offsetClosed(front, seam)) : front;
    var backMax = Math.max.apply(null, backPts.map(function (pt) { return pt.x; }));
    var frontMin = Math.min.apply(null, frontPts.map(function (pt) { return pt.x; }));
    return backMax + gap - frontMin;
  }

  function patternOutline(draft) {
    return backOutline(draft);
  }

  function draftBody(input) {
    var p = Object.assign({}, DEFAULT_PARAMS, input || {});
    var notes = [];

    if (!(p.bust > 0)) return { error: "Bust must be positive." };

    var totalWidth = p.bust / 2 + p.widthEase;
    var armholeDepth = p.bust / 6 + p.armholeDepthAdd;
    var backWidth = p.bust / 6 + p.backWidthAdd;
    var chestWidth = p.bust / 6 + p.chestWidthAdd;

    if (!(p.backLength > armholeDepth)) {
      return { error: "Back length must be greater than armhole depth (" + armholeDepth.toFixed(2) + " cm)." };
    }
    if (backWidth + chestWidth >= totalWidth) {
      return { error: "Back width + chest width exceeds total width." };
    }

    var topY = p.backLength;
    var blY = p.backLength - armholeDepth;
    var wlY = 0;
    var cbX = 0;
    var cfX = totalWidth;
    var backWidthX = backWidth;
    var chestWidthX = totalWidth - chestWidth;
    var sideX = (backWidthX + chestWidthX) / 2;

    var bnw = p.bust / p.neckUnitDiv;
    var bnh = bnw / 3;
    var fnw = bnw - p.frontNeckWidthMinus;
    var fnd = bnw + p.frontNeckDepthAdd;

    var cbNeck = V(cbX, topY);
    var backSnp = V(bnw, topY + bnh);
    var backShoulder = V(backWidthX + p.backShoulderOut, topY - bnh);
    var backShoulderLen = length(sub(backShoulder, backSnp));
    var frontShoulderLen = backShoulderLen - p.frontShoulderShorter;

    var cfNeck = V(cfX, topY - fnd);
    var frontSnp = V(cfX - fnw, topY - p.frontSideNeckDrop);
    var neckCorner = V(cfX - fnw, topY - fnd);
    var bisector = Math.SQRT1_2;
    var frontBisectorLen = fnw / 2 - p.frontNeckBisectorMinus;
    var frontNeckOffset = V(
      neckCorner.x + frontBisectorLen * bisector,
      neckCorner.y + frontBisectorLen * bisector
    );

    var frontShoulderY = topY - 2 * bnh;
    var frontShoulder;
    if (frontShoulderLen <= Math.abs(frontShoulderY - frontSnp.y)) {
      notes.push("Front shoulder length is shorter than the 2x neck-height drop; clamped.");
      frontShoulder = V(frontSnp.x, frontShoulderY);
    } else {
      frontShoulder = horizCircle(frontSnp, frontShoulderLen, frontShoulderY, true);
    }

    var underarm = V(sideX, blY);
    var sideWaist = V(sideX - p.sideSeamToBack, wlY);
    var cbWaist = V(cbX, wlY);
    var bp = V((chestWidthX + cfX) / 2 - p.bpToArmhole, blY - p.bpBelowBl);
    var cfHem = V(cfX, wlY - fnw / 2);
    var hemAtBp = V(bp.x, cfHem.y);

    var backAhWidth = sideX - backWidthX;
    var backAhAlong = backAhWidth / 2 + p.backAhBisectorExtra;
    var frontAhAlong = backAhWidth / 2;
    var backAhBisector = V(backWidthX + backAhAlong * bisector, blY + backAhAlong * bisector);
    var frontAhBisector = V(chestWidthX - frontAhAlong * bisector, blY + frontAhAlong * bisector);

    var midDepthY = topY - armholeDepth / 2;
    var backAhMid = V(backWidthX, midDepthY);
    var frontAhMid = V(chestWidthX, midDepthY);
    var samples = p.splineSamples;

    var backNeck = arcHorizontalAtStart(cbNeck, backSnp, samples);
    var frontNeck = interpolate([frontSnp, frontNeckOffset, cfNeck], samples);
    var backArmhole = interpolate([backShoulder, backAhMid, backAhBisector, underarm], samples);
    var frontArmhole = interpolate([underarm, frontAhBisector, frontAhMid, frontShoulder], samples);
    var hem = [cfHem, hemAtBp, sideWaist];

    // Step 16: 1/2 of each drafted armhole curve, then 3 cm along the curve
    // toward the underarm.
    var backNotch = armholeHalfAndNotch(backArmhole, p.sleeveNotchDown);
    var frontNotch = armholeHalfAndNotch(frontArmhole, p.sleeveNotchDown);
    var backAhHalf = backNotch.mid;
    var frontAhHalf = frontNotch.mid;
    var notchB = backNotch.notch;
    var notchA = frontNotch.notch;
    var backArmholeLen = polylineLength(backArmhole);
    var frontArmholeLen = polylineLength(frontArmhole);

    return {
      error: null,
      params: p,
      totalWidth: totalWidth,
      armholeDepth: armholeDepth,
      backArmholeLen: backArmholeLen,
      frontArmholeLen: frontArmholeLen,
      backWidth: backWidth,
      chestWidth: chestWidth,
      backNeckWidth: bnw,
      backNeckHeight: bnh,
      frontNeckWidth: fnw,
      frontNeckDepth: fnd,
      backShoulderLen: backShoulderLen,
      frontShoulderLen: frontShoulderLen,
      topY: topY,
      blY: blY,
      wlY: wlY,
      cbX: cbX,
      cfX: cfX,
      backWidthX: backWidthX,
      chestWidthX: chestWidthX,
      sideX: sideX,
      cbNeck: cbNeck,
      backSnp: backSnp,
      backShoulder: backShoulder,
      cfNeck: cfNeck,
      frontSnp: frontSnp,
      frontNeckOffset: frontNeckOffset,
      frontShoulder: frontShoulder,
      underarm: underarm,
      sideWaist: sideWaist,
      cbWaist: cbWaist,
      cfHem: cfHem,
      hemAtBp: hemAtBp,
      bp: bp,
      backAhBisector: backAhBisector,
      frontAhBisector: frontAhBisector,
      backAhMid: backAhMid,
      frontAhMid: frontAhMid,
      backAhHalf: backAhHalf,
      frontAhHalf: frontAhHalf,
      notchA: notchA,
      notchB: notchB,
      backNeck: backNeck,
      frontNeck: frontNeck,
      backArmhole: backArmhole,
      frontArmhole: frontArmhole,
      hem: hem,
      notes: notes,
    };
  }

  global.BodyBlock = {
    DEFAULT_PARAMS: DEFAULT_PARAMS,
    draftBody: draftBody,
    PIECE_GAP: PIECE_GAP,
    backOutline: backOutline,
    frontOutline: frontOutline,
    frontDisplayShift: frontDisplayShift,
    translate: translate,
    patternOutline: patternOutline,
    offsetClosed: offsetClosed,
    closeRing: closeRing,
    V: V,
  };
})(window);
