/* Women's basic skirt block — same geometry as BasicBlock-Skirt/draft.py. Units: cm. */

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
    hip: 90,
    waist: 68,
    skirtLength: 60,
    hipEase: 2,
    waistEase: 0.5,
    hipDepth: 18,
    sideShift: 1,
    sideRise: 0.7,
    cbDrop: 1,
    sideTakeFrac: 1 / 3,
    backWaistStraight: 1 / 3,
    frontWaistStraight: 2 / 3,
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

  function waistCurve(start, end, straightFrac, samples) {
    var span = end.x - start.x;
    var frac = Math.min(Math.max(straightFrac, 0), 0.95);
    var blend = V(start.x + span * frac, start.y);
    var straight = interpolate([start, blend], samples);
    var curve = arcHorizontalAtStart(blend, end, samples);
    return straight.slice(0, -1).concat(curve);
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

  var PIECE_GAP = 4;

  function backOutline(draft) {
    return dedupeClosed(draft.backWaistCurve.concat(draft.backSide.slice(1)).concat([draft.cbHem]));
  }

  function frontOutline(draft) {
    return dedupeClosed(draft.frontWaistCurve.concat(draft.frontSide.slice(1)).concat([draft.cfHem]));
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

  function draftSkirt(input) {
    var p = Object.assign({}, DEFAULT_PARAMS, input || {});
    var notes = [];

    if (!(p.hip > 0) || !(p.waist > 0)) return { error: "Hip and waist must be positive." };
    if (!(p.skirtLength > p.hipDepth)) {
      return { error: "Skirt length must be greater than hip depth (" + p.hipDepth.toFixed(2) + " cm)." };
    }
    if (!(p.waist < p.hip)) return { error: "Waist must be smaller than hip." };

    var totalWidth = p.hip / 2 + p.hipEase;
    var quarterW = p.waist / 4;
    var backWaist = quarterW - p.sideShift + p.waistEase;
    var frontWaist = quarterW + p.sideShift + p.waistEase;
    var sideX = totalWidth / 2 - p.sideShift;
    var backHip = sideX;
    var frontHip = totalWidth - sideX;
    var backDiff = backHip - backWaist;
    var frontDiff = frontHip - frontWaist;
    var backSideTake = backDiff * p.sideTakeFrac;
    var frontSideTake = frontDiff * p.sideTakeFrac;
    var sideTake = backSideTake;

    if (!(backWaist > 0) || !(frontWaist > 0)) return { error: "Waist is too small for this construction." };
    if (!(backSideTake > 0) || !(frontSideTake > 0)) {
      return { error: "Waist-hip difference is too small for side shaping." };
    }

    var wlY = 0;
    var hlY = -p.hipDepth;
    var hemY = -p.skirtLength;
    var cbX = 0;
    var cfX = totalWidth;

    var cbWaist = V(cbX, wlY - p.cbDrop);
    var cfWaist = V(cfX, wlY);
    var backSideWaist = V(sideX - backSideTake, wlY + p.sideRise);
    var frontSideWaist = V(sideX + frontSideTake, wlY + p.sideRise);
    var backWaistMark = V(cbX + backWaist, wlY);
    var frontWaistMark = V(cfX - frontWaist, wlY);
    var hip = V(sideX, hlY);
    var cbHem = V(cbX, hemY);
    var cfHem = V(cfX, hemY);
    var sideHem = V(sideX, hemY);

    var samples = p.splineSamples;
    var backWaistCurve = waistCurve(cbWaist, backSideWaist, p.backWaistStraight, samples);
    var frontWaistCurve = waistCurve(cfWaist, frontSideWaist, p.frontWaistStraight, samples);

    var hipCtrl = V(sideX, hlY + p.hipDepth / 3);
    var backSide = interpolate([backSideWaist, hipCtrl, hip], samples).concat(
      interpolate([hip, sideHem], samples).slice(1)
    );
    var frontSide = interpolate([frontSideWaist, hipCtrl, hip], samples).concat(
      interpolate([hip, sideHem], samples).slice(1)
    );

    return {
      error: null,
      params: p,
      totalWidth: totalWidth,
      backHip: backHip,
      frontHip: frontHip,
      backWaist: backWaist,
      frontWaist: frontWaist,
      backDiff: backDiff,
      frontDiff: frontDiff,
      sideTake: sideTake,
      backSideTake: backSideTake,
      frontSideTake: frontSideTake,
      wlY: wlY,
      hlY: hlY,
      hemY: hemY,
      cbX: cbX,
      cfX: cfX,
      sideX: sideX,
      cbWaist: cbWaist,
      cfWaist: cfWaist,
      backWaistMark: backWaistMark,
      frontWaistMark: frontWaistMark,
      backSideWaist: backSideWaist,
      frontSideWaist: frontSideWaist,
      hip: hip,
      cbHem: cbHem,
      cfHem: cfHem,
      sideHem: sideHem,
      backWaistCurve: backWaistCurve,
      frontWaistCurve: frontWaistCurve,
      backSide: backSide,
      frontSide: frontSide,
      notes: notes,
    };
  }

  global.SkirtBlock = {
    DEFAULT_PARAMS: DEFAULT_PARAMS,
    draftSkirt: draftSkirt,
    PIECE_GAP: PIECE_GAP,
    backOutline: backOutline,
    frontOutline: frontOutline,
    frontDisplayShift: frontDisplayShift,
    translate: translate,
    offsetClosed: offsetClosed,
    closeRing: closeRing,
    V: V,
  };
})(window);
