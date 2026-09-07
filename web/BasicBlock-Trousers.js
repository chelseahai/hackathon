/* Women's basic trouser block — same geometry as BasicBlock-Trousers/draft.py. Units: cm. */

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
    trouserLength: 98,
    rise: 26,
    hem: 19,
    frontHipEase: 1.5,
    crotchMinus: 1,
    sideIndent: 0.5,
    cfInset: 0.7,
    sideRise: 0.5,
    kneeUp: 4,
    kneeSideIn: 1,
    sideHollow: 0.2,
    inseamHollow: 0.3,
    hemLift: 0.5,
    dartWidth: 2.5,
    dartCount: 2,
    dartNearCfLen: 11,
    dartNearSideLen: 10,
    backCrotchAdd: 4,
    backCrotchDrop: 1,
    cbInset: 5,
    cbRise: 1.5,
    backDartWidth: 3,
    backDartLen: 12,
    crotchIn: 0.7,
    backSideOut: 0.3,
    backSideIn: 0.4,
    backInseamUpper: 1.3,
    backInseamLower: 1,
    legExtra: 1,
    backHemDrop: 0.5,
    splineSamples: 48,
    seamAllowance: 1,
  };

  var PIECE_GAP = 4;

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

  function cubicBezier(p0, c1, c2, p3, samples) {
    var n = Math.max(samples || 32, 2);
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var u = 1 - t;
      out.push(
        V(
          u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
          u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y
        )
      );
    }
    return out;
  }

  function bezierMinRadius(p0, c1, c2, p3) {
    var rmin = 1e9;
    for (var i = 0; i <= 40; i++) {
      var t = i / 40;
      var u = 1 - t;
      var dx = 3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x);
      var dy = 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y);
      var ddx = 6 * u * (c2.x - 2 * c1.x + p0.x) + 6 * t * (p3.x - 2 * c2.x + c1.x);
      var ddy = 6 * u * (c2.y - 2 * c1.y + p0.y) + 6 * t * (p3.y - 2 * c2.y + c1.y);
      var sp = dx * dx + dy * dy;
      if (sp < 1e-12) continue;
      var k = Math.abs(dx * ddy - dy * ddx) / Math.pow(sp, 1.5);
      if (k > 1e-9) rmin = Math.min(rmin, 1 / k);
    }
    return rmin;
  }

  function crotchBezier(p0, p3, ctrl, samples) {
    var best = null;
    for (var i = 20; i <= 80; i++) {
      var t = i / 100;
      var u = 1 - t;
      var A = u * u * u + 3 * u * u * t;
      var C = 3 * u * t * t + t * t * t;
      var denA = 3 * u * u * t;
      var denB = 3 * u * t * t;
      if (denA < 1e-9 || denB < 1e-9) continue;
      var a = (A * p0.y + C * p3.y - ctrl.y) / denA;
      var b = (A * p0.x + C * p3.x - ctrl.x) / denB;
      if (a < 0.5 || b < 0.5) continue;
      var c1 = V(p0.x, p0.y - a);
      var c2 = V(p3.x - b, p3.y);
      var r = bezierMinRadius(p0, c1, c2, p3);
      if (!best || r > best.r) best = { a: a, b: b, r: r };
    }
    if (!best) {
      var a0 = (0.5 * (p0.y + p3.y) - ctrl.y) / 0.375;
      var b0 = (0.5 * (p0.x + p3.x) - ctrl.x) / 0.375;
      best = { a: Math.max(a0, 0.5), b: Math.max(b0, 0.5) };
    }
    return cubicBezier(p0, V(p0.x, p0.y - best.a), V(p3.x - best.b, p3.y), p3, samples);
  }

  function fairBezier(p0, tan0, p3, tan3, ctrl, samples) {
    tan0 = unit(tan0);
    tan3 = unit(tan3);
    var best = null;
    for (var i = 20; i <= 80; i++) {
      var t = i / 100;
      var u = 1 - t;
      var A = u * u * u + 3 * u * u * t;
      var C = 3 * u * t * t + t * t * t;
      var k1 = 3 * u * u * t;
      var k2 = 3 * u * t * t;
      if (k1 < 1e-9 || k2 < 1e-9) continue;
      var rhsx = ctrl.x - A * p0.x - C * p3.x;
      var rhsy = ctrl.y - A * p0.y - C * p3.y;
      var det = k1 * tan0.x * (-k2 * tan3.y) - (-k2 * tan3.x) * k1 * tan0.y;
      if (Math.abs(det) < 1e-12) continue;
      var a = (rhsx * (-k2 * tan3.y) - (-k2 * tan3.x) * rhsy) / det;
      var b = (k1 * tan0.x * rhsy - rhsx * k1 * tan0.y) / det;
      if (a < 0.5 || b < 0.5) continue;
      var c1 = add(p0, mul(tan0, a));
      var c2 = sub(p3, mul(tan3, b));
      var r = bezierMinRadius(p0, c1, c2, p3);
      if (!best || r > best.r) best = { c1: c1, c2: c2, r: r };
    }
    if (!best) {
      var chord = length(sub(p3, p0)) / 3;
      best = { c1: add(p0, mul(tan0, chord)), c2: sub(p3, mul(tan3, chord)) };
    }
    return cubicBezier(p0, best.c1, best.c2, p3, samples);
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

  function collapseShort(points, minLen) {
    minLen = minLen === undefined ? 0.04 : minLen;
    var out = [];
    for (var i = 0; i < points.length; i++) {
      if (!out.length || length(sub(points[i], out[out.length - 1])) >= minLen) out.push(points[i]);
    }
    if (out.length > 1 && length(sub(out[0], out[out.length - 1])) < minLen) out.pop();
    return out;
  }

  function stripHairpins(ring, maxTurnDeg) {
    maxTurnDeg = maxTurnDeg === undefined ? 120 : maxTurnDeg;
    var limit = (maxTurnDeg * Math.PI) / 180;
    var pts = ring.slice();
    var changed = true;
    while (changed && pts.length > 3) {
      changed = false;
      var next = [];
      var n = pts.length;
      for (var i = 0; i < n; i++) {
        var prev = pts[(i - 1 + n) % n];
        var curr = pts[i];
        var nxt = pts[(i + 1) % n];
        var e1 = sub(curr, prev);
        var e2 = sub(nxt, curr);
        var ang = Math.atan2(e1.x * e2.y - e1.y * e2.x, e1.x * e2.x + e1.y * e2.y);
        if (Math.abs(ang) > limit) {
          changed = true;
          continue;
        }
        next.push(curr);
      }
      pts = next;
    }
    return pts;
  }

  function offsetClosed(points, dist, darts) {
    var ring = collapseShort(dedupeClosed(points));
    var n = ring.length;
    if (n < 3 || !dist) return ring.slice();
    darts = darts || [];
    var ccw = signedArea(ring) > 0;
    var out = [];
    for (var i = 0; i < n; i++) {
      var prev = ring[(i - 1 + n) % n];
      var curr = ring[i];
      var next = ring[(i + 1) % n];
      var dart = null;
      for (var d = 0; d < darts.length; d++) {
        if (Math.hypot(curr.x - darts[d].apex.x, curr.y - darts[d].apex.y) < 0.05) {
          dart = darts[d];
          break;
        }
      }
      if (dart) {
        out.push(V(dart.apex.x, dart.apex.y + dist));
        continue;
      }
      var n1 = edgeOutward(prev, curr, ccw);
      var n2 = edgeOutward(curr, next, ccw);
      var turn = n1.x * n2.x + n1.y * n2.y;
      if (turn > 0.25) {
        var nor = unit(add(n1, n2));
        if (!nor.x && !nor.y) nor = n1;
        out.push(add(curr, mul(nor, dist)));
        continue;
      }
      var den = 1 + turn;
      if (Math.abs(den) < 0.05) {
        out.push(add(curr, mul(n1, dist)));
        continue;
      }
      var miter = dist / den;
      var limit = Math.abs(dist) * 4;
      if (Math.abs(miter) > limit) miter = miter < 0 ? -limit : limit;
      out.push(add(curr, V((n1.x + n2.x) * miter, (n1.y + n2.y) * miter)));
    }
    return collapseShort(stripHairpins(out), 0.06);
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

  function intersectY(a, b, y) {
    if (Math.abs(b.y - a.y) < 1e-12) return V(a.x, y);
    return lerp(a, b, (y - a.y) / (b.y - a.y));
  }

  function intersectX(a, b, x) {
    if (Math.abs(b.x - a.x) < 1e-12) return V(x, a.y);
    return lerp(a, b, (x - a.x) / (b.x - a.x));
  }

  function rayHit(origin, direction, a, b) {
    var dx = direction.x;
    var dy = direction.y;
    var ex = b.x - a.x;
    var ey = b.y - a.y;
    var den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) return null;
    var ox = a.x - origin.x;
    var oy = a.y - origin.y;
    var t = (ox * ey - oy * ex) / den;
    if (t < -1e-9) return null;
    return add(origin, mul(direction, t));
  }

  function towardX(pt, targetX, dist) {
    return pt.x < targetX ? V(pt.x + dist, pt.y) : V(pt.x - dist, pt.y);
  }

  function frontOutline(draft, closeDarts) {
    var waist = closeDarts ? draft.waistGuide : draft.waist;
    var cfDown = interpolate([draft.cfWaist, draft.hip11], 8);
    return dedupeClosed(
      waist
        .concat(draft.side.slice(1))
        .concat(draft.hem.slice(1))
        .concat(draft.inseam.slice().reverse().slice(1))
        .concat(draft.crotch.slice().reverse().slice(1))
        .concat(cfDown.slice().reverse().slice(1))
    );
  }

  function mirrorX(pt) {
    return V(-pt.x, pt.y);
  }

  function mirrorPts(points) {
    return points.map(mirrorX);
  }

  function translate(points, dx, dy) {
    dy = dy || 0;
    if (!dx && !dy) return points.slice();
    return points.map(function (pt) {
      return V(pt.x + dx, pt.y + dy);
    });
  }

  function backOutlineRaw(draft, closeDarts) {
    var waist = closeDarts ? draft.backWaistGuide : draft.backWaist;
    return dedupeClosed(
      waist
        .concat(draft.backSide.slice(1))
        .concat(draft.backHem.slice(1))
        .concat(draft.backInseam.slice().reverse().slice(1))
        .concat(draft.backCrotch.slice().reverse().slice(1))
        .concat(draft.backCb.slice().reverse().slice(1))
    );
  }

  function backOutline(draft, closeDarts) {
    return mirrorPts(backOutlineRaw(draft, closeDarts));
  }

  function frontDisplayShift(draft, seam, gap) {
    gap = gap === undefined ? PIECE_GAP : gap;
    var back = backOutline(draft);
    var front = frontOutline(draft);
    var backPts = seam ? back.concat(offsetClosed(backOutline(draft, true), seam)) : back;
    var frontPts = seam ? front.concat(offsetClosed(frontOutline(draft, true), seam)) : front;
    var backMax = Math.max.apply(null, backPts.map(function (pt) { return pt.x; }));
    var frontMin = Math.min.apply(null, frontPts.map(function (pt) { return pt.x; }));
    return backMax + gap - frontMin;
  }

  function draftTrouser(input) {
    var p = Object.assign({}, DEFAULT_PARAMS, input || {});
    var notes = [];

    if (!(p.hip > 0) || !(p.waist > 0)) return { error: "Hip and waist must be positive." };
    if (!(p.trouserLength > p.rise)) return { error: "Trouser length must be greater than rise." };
    if (!(p.hem > 0) || !(p.rise > 0)) return { error: "Rise and hem must be positive." };
    if (!(p.waist < p.hip)) return { error: "Waist must be smaller than hip." };

    var wlY = 0;
    var clY = -p.rise;
    var hemY = -p.trouserLength;
    var frontHip = p.hip / 4 + p.frontHipEase;
    var sideX = 0;
    var cfBoxX = frontHip;
    var waistCorner = V(sideX, wlY);

    var point4 = V(sideX + p.sideIndent, clY);
    var crotchExt = frontHip / 4 - p.crotchMinus;
    if (!(crotchExt > 0)) return { error: "Front hip is too small for the crotch extension." };
    var point5 = V(cfBoxX + crotchExt, clY);
    var crotchCorner = V(cfBoxX, clY);
    var creaseX = (point4.x + point5.x) / 2;
    var klY = (clY + hemY) / 2 + p.kneeUp;

    var hemHalf = p.hem / 2;
    var hemSide = V(creaseX - hemHalf, hemY);
    var hemInseam = V(creaseX + hemHalf, hemY);
    var hemMid = V(creaseX, hemY + p.hemLift);

    var kneeAux = intersectY(point4, hemSide, klY);
    var kneeSide = towardX(kneeAux, creaseX, p.kneeSideIn);
    var kneeInseam = intersectY(point5, hemInseam, klY);

    var hlY = clY + p.rise / 3;
    var riseThirds = [0, 1, 2, 3].map(function (k) {
      return V(cfBoxX, wlY - (p.rise * k) / 3);
    });
    var hip11 = V(cfBoxX, hlY);
    var hlSide = V(sideX, hlY);

    var cfX = cfBoxX - p.cfInset;
    var cfWaist = V(cfX, wlY);
    var cfHl = V(cfX, hlY);

    var bisectorDir = unit(V(1, 1));
    var bisectorHit = rayHit(crotchCorner, bisectorDir, hip11, point5);
    if (!bisectorHit) bisectorHit = add(crotchCorner, mul(bisectorDir, (crotchExt * Math.SQRT2) / 2));
    var crotchThirds = [0, 1, 2, 3].map(function (k) {
      return lerp(crotchCorner, bisectorHit, k / 3);
    });
    var samples = p.splineSamples;
    var crotchCtrl = crotchThirds[2];
    var crotch = crotchBezier(hip11, point5, crotchCtrl, samples * 4);

    var frontWaist = p.waist / 4 + p.dartWidth * p.dartCount;
    if (!(frontWaist > 0) || !(frontWaist < frontHip)) {
      return { error: "Waist is too large or too small for this front piece." };
    }
    var sideWaist = V(cfX - frontWaist, wlY + p.sideRise);
    if (sideWaist.x < sideX - 1) return { error: "Front waist is wider than the hip rectangle." };

    var waistGuide = interpolate([cfWaist, sideWaist], samples);

    function dartOnWaist(along, width, dartLen) {
      var left = pointAlong(waistGuide, along);
      var right = pointAlong(waistGuide, along + width);
      var mid = lerp(left, right, 0.5);
      return { left: left, apex: V(mid.x, mid.y - dartLen), right: right };
    }

    var waistLen = polylineLength(waistGuide);
    var creaseOnWaist = intersectX(cfWaist, sideWaist, creaseX);
    var d1Along = length(sub(cfWaist, creaseOnWaist)) - p.dartWidth / 2;
    if (d1Along < 0.4) {
      d1Along = Math.max(0.4, waistLen * 0.28 - p.dartWidth / 2);
      notes.push("Crease is too close to centre front for the first dart; dart was shifted.");
    }
    var dartCf = dartOnWaist(d1Along, p.dartWidth, p.dartNearCfLen);
    dartCf.mid = lerp(dartCf.left, dartCf.right, 0.5);
    var restStart = d1Along + p.dartWidth;
    var rest = waistLen - restStart;
    var d2Along = restStart + (rest - p.dartWidth) / 2;
    if (d2Along < restStart + 0.3 || d2Along + p.dartWidth > waistLen - 0.3) {
      d2Along = restStart + Math.max(0.4, (rest - p.dartWidth) / 2);
    }
    var dartSide = dartOnWaist(d2Along, p.dartWidth, p.dartNearSideLen);
    dartSide.mid = lerp(dartSide.left, dartSide.right, 0.5);

    var waist = interpolate([cfWaist, dartCf.left], Math.max(4, samples / 4))
      .concat([dartCf.apex])
      .concat(interpolate([dartCf.right, dartSide.left], Math.max(4, samples / 4)))
      .concat([dartSide.apex])
      .concat(interpolate([dartSide.right, sideWaist], Math.max(4, samples / 4)));

    var thighY = (clY + klY) / 2;
    var sideHollow = towardX(intersectY(point4, kneeSide, thighY), creaseX, p.sideHollow);
    var side = interpolate([sideWaist, hlSide, point4, sideHollow, kneeSide, hemSide], samples);

    var inseamHollow = towardX(
      intersectY(point5, kneeInseam, (point5.y + kneeInseam.y) / 2),
      creaseX,
      p.inseamHollow
    );
    var inseam = interpolate([point5, inseamHollow, kneeInseam, hemInseam], samples);
    var hem = interpolate([hemSide, hemMid, hemInseam], samples);

    // ---- back, pp. 119-120 (front-style coords: side left, crotch right) ----
    var backHip = p.hip / 4 + p.frontHipEase;
    var backCrotchExt = crotchExt + p.backCrotchAdd;
    var backWaistLen = p.waist / 4 + p.backDartWidth;
    var backBase = crotchCorner;
    var backCrotchOnCl = V(cfBoxX + backCrotchExt, clY);
    var backCrotchTip = V(backCrotchOnCl.x, clY - p.backCrotchDrop);
    var backCbMark = V(cfBoxX - p.cbInset, wlY);
    var cbDir = unit(sub(backCbMark, backBase));
    var backCbWaist = add(backCbMark, mul(cbDir, p.cbRise));
    var sideY = wlY + p.sideRise;
    var dyWaist = sideY - backCbWaist.y;
    var span2 = backWaistLen * backWaistLen - dyWaist * dyWaist;
    if (!(span2 > 0.25)) return { error: "Back waist is too short to reach the side." };
    var backSideWaist = V(backCbWaist.x - Math.sqrt(span2), sideY);
    var backCbHl = intersectY(backCbWaist, backBase, hlY);
    var backHlSide = V(backCbHl.x - backHip, hlY);
    var backKneeSide = V(kneeSide.x - p.legExtra, klY);
    var backKneeInseam = V(kneeInseam.x + p.legExtra, klY);
    var backHemSide = V(hemSide.x - p.legExtra, hemY);
    var backHemInseam = V(hemInseam.x + p.legExtra, hemY);
    var backHemMid = V(creaseX, hemY - p.backHemDrop);

    var waistHipY = (backSideWaist.y + hlY) / 2;
    var waistHipOn = intersectY(backSideWaist, backHlSide, waistHipY);
    var backWaistHipOut = towardX(waistHipOn, creaseX, -p.backSideOut);
    var crotchKneeY = (clY + klY) / 2;
    var crotchKneeOn = intersectY(backHlSide, backKneeSide, crotchKneeY);
    var backCrotchKneeIn = towardX(crotchKneeOn, creaseX, p.backSideIn);

    var backCrotchCtrl = V(crotchCtrl.x - p.crotchIn, crotchCtrl.y);
    var cbTan = unit(sub(backBase, backCbWaist));
    var backCrotch = fairBezier(
      backCbHl,
      cbTan,
      backCrotchTip,
      V(1, 0),
      backCrotchCtrl,
      samples * 4
    );
    var backCb = interpolate([backCbWaist, backCbHl], Math.max(8, samples / 4));

    var backWaistGuide = interpolate([backCbWaist, backSideWaist], samples);
    var backWaistGuideLen = polylineLength(backWaistGuide);
    var dartAlong = backWaistGuideLen / 2 - p.backDartWidth / 2;
    if (dartAlong < 0.4) dartAlong = 0.4;
    var backDartLeft = pointAlong(backWaistGuide, dartAlong);
    var backDartRight = pointAlong(backWaistGuide, dartAlong + p.backDartWidth);
    var backDartMid = lerp(backDartLeft, backDartRight, 0.5);
    var dartTan = unit(sub(
      pointAlong(backWaistGuide, Math.min(backWaistGuideLen, dartAlong + p.backDartWidth / 2 + 0.4)),
      pointAlong(backWaistGuide, Math.max(0, dartAlong + p.backDartWidth / 2 - 0.4))
    ));
    var dartPerp = V(dartTan.y, -dartTan.x);
    if (dartPerp.y > 0) dartPerp = mul(dartPerp, -1);
    var backDartApex = add(backDartMid, mul(dartPerp, p.backDartLen));
    var backDart = {
      left: backDartLeft,
      apex: backDartApex,
      right: backDartRight,
      mid: backDartMid,
    };

    var backWaist = interpolate([backCbWaist, backDartLeft], Math.max(4, samples / 4))
      .concat([backDartApex])
      .concat(interpolate([backDartRight, backSideWaist], Math.max(4, samples / 4)));

    var backSide = interpolate(
      [backSideWaist, backWaistHipOut, backHlSide, backCrotchKneeIn, backKneeSide, backHemSide],
      samples
    );
    var backInseamUpper = towardX(
      lerp(backCrotchTip, backKneeInseam, 1 / 3),
      creaseX,
      p.backInseamUpper
    );
    var backInseamLower = towardX(
      lerp(backCrotchTip, backKneeInseam, 2 / 3),
      creaseX,
      p.backInseamLower
    );
    var backInseam = interpolate(
      [backCrotchTip, backInseamUpper, backInseamLower, backKneeInseam, backHemInseam],
      samples
    );
    var backHem = interpolate([backHemSide, backHemMid, backHemInseam], samples);

    return {
      error: null,
      params: p,
      frontHip: frontHip,
      crotchExt: crotchExt,
      frontWaist: frontWaist,
      hemHalf: hemHalf,
      wlY: wlY,
      clY: clY,
      hlY: hlY,
      klY: klY,
      hemY: hemY,
      sideX: sideX,
      cfBoxX: cfBoxX,
      cfX: cfX,
      creaseX: creaseX,
      sideWaist: sideWaist,
      cfWaist: cfWaist,
      cfHl: cfHl,
      hip11: hip11,
      point4: point4,
      point5: point5,
      hemSide: hemSide,
      hemInseam: hemInseam,
      hemMid: hemMid,
      kneeSide: kneeSide,
      kneeInseam: kneeInseam,
      hlSide: hlSide,
      waistCorner: waistCorner,
      crotchCorner: crotchCorner,
      bisectorHit: bisectorHit,
      crotchThirds: crotchThirds,
      riseThirds: riseThirds,
      dartCfLeft: dartCf.left,
      dartCfApex: dartCf.apex,
      dartCfRight: dartCf.right,
      dartCfMid: dartCf.mid,
      dartSideLeft: dartSide.left,
      dartSideApex: dartSide.apex,
      dartSideRight: dartSide.right,
      dartSideMid: dartSide.mid,
      darts: [dartCf, dartSide],
      waistGuide: waistGuide,
      waist: waist,
      crotch: crotch,
      inseam: inseam,
      hem: hem,
      side: side,
      backHip: backHip,
      backCrotchExt: backCrotchExt,
      backWaistLen: backWaistLen,
      backBase: backBase,
      backCrotchOnCl: backCrotchOnCl,
      backCrotchTip: backCrotchTip,
      backCbMark: backCbMark,
      backCbWaist: backCbWaist,
      backSideWaist: backSideWaist,
      backCbHl: backCbHl,
      backHlSide: backHlSide,
      backKneeSide: backKneeSide,
      backKneeInseam: backKneeInseam,
      backHemSide: backHemSide,
      backHemInseam: backHemInseam,
      backHemMid: backHemMid,
      backWaistHipOut: backWaistHipOut,
      backCrotchKneeIn: backCrotchKneeIn,
      backInseamUpper: backInseamUpper,
      backInseamLower: backInseamLower,
      backCrotchCtrl: backCrotchCtrl,
      backDartLeft: backDartLeft,
      backDartApex: backDartApex,
      backDartRight: backDartRight,
      backDartMid: backDartMid,
      backDarts: [backDart],
      backWaistGuide: backWaistGuide,
      backWaist: backWaist,
      backSide: backSide,
      backInseam: backInseam,
      backHem: backHem,
      backCrotch: backCrotch,
      backCb: backCb,
      notes: notes,
    };
  }

  global.TrouserBlock = {
    DEFAULT_PARAMS: DEFAULT_PARAMS,
    draftTrouser: draftTrouser,
    frontOutline: frontOutline,
    backOutline: backOutline,
    offsetClosed: offsetClosed,
    closeRing: closeRing,
    translate: translate,
    mirrorX: mirrorX,
    frontDisplayShift: frontDisplayShift,
    V: V,
  };
})(window);
