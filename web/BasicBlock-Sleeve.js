/* Women's basic sleeve block — same geometry as BasicBlock-Sleeve/draft.py. Units: cm. */

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

  function rotatedCcw(a) {
    return V(-a.y, a.x);
  }

  var DEFAULT_PARAMS = {
    frontAh: 20.5,
    backAh: 21.0,
    sleeveLength: 52.0,
    capHeightSubtract: 1.0,
    backDiagonalEase: 1.0,
    elbowExtra: 2.5,
    frontUpperOut: 1.8,
    frontLowerIn: 1.5,
    backUpperOut: 1.5,
    backMidAlong: 2.5,
    backLowerIn: 0.5,
    cuffFrontIn: 0.5,
    cuffBackOut: 1.0,
    cuffCenterDrop: 0.3,
    splineSamples: 32,
    seamAllowance: 1.0,
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

  function nearestIndex(points, target) {
    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < points.length; i++) {
      var d = length(sub(points[i], target));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function polylineLength(points) {
    var sum = 0;
    for (var i = 0; i < points.length - 1; i++) sum += length(sub(points[i + 1], points[i]));
    return sum;
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

  function patternOutline(draft) {
    var outline = draft.backCap
      .concat(draft.backSeam.slice(1))
      .concat(draft.cuff.slice(1))
      .concat(draft.frontSeam.slice().reverse().slice(1))
      .concat(draft.frontCap.slice().reverse().slice(1));
    return dedupeClosed(outline);
  }

  function closeRing(points) {
    if (!points.length) return points.slice();
    var out = points.slice();
    if (!samePoint(out[0], out[out.length - 1], 1e-6)) out.push(out[0]);
    return out;
  }

  function edgeOutward(from, to) {
    var d = unit(sub(to, from));
    var n = V(d.y, -d.x);
    var mid = V((from.x + to.x) / 2, (from.y + to.y) / 2);
    if (-mid.x * n.x - mid.y * n.y > 0) n = V(-n.x, -n.y);
    return n;
  }

  function offsetClosed(points, dist) {
    var ring = dedupeClosed(points);
    var n = ring.length;
    if (n < 3 || !dist) return ring.slice();
    var out = [];
    for (var i = 0; i < n; i++) {
      var prev = ring[(i - 1 + n) % n];
      var curr = ring[i];
      var next = ring[(i + 1) % n];
      var n1 = edgeOutward(prev, curr);
      var n2 = edgeOutward(curr, next);
      var den = 1 + n1.x * n2.x + n1.y * n2.y;
      if (Math.abs(den) < 0.05) {
        out.push(add(curr, mul(n1, dist)));
        continue;
      }
      var miter = dist / den;
      var limit = Math.abs(dist) * 4;
      if (Math.abs(miter) > limit) miter = (miter < 0 ? -limit : limit);
      out.push(add(curr, V((n1.x + n2.x) * miter, (n1.y + n2.y) * miter)));
    }
    return out;
  }

  function outwardInward(peak, underarm) {
    var outward = rotatedCcw(unit(sub(underarm, peak)));
    var mid = lerp(peak, underarm, 0.5);
    if (Math.abs(add(mid, outward).x) < Math.abs(mid.x)) {
      outward = mul(outward, -1);
    }
    return { out: outward, inn: mul(outward, -1) };
  }

  function draftSleeve(input) {
    var p = Object.assign({}, DEFAULT_PARAMS, input || {});
    var notes = [];
    var ah = p.frontAh + p.backAh;
    var capHeight = ah / 3 - p.capHeightSubtract;

    if (!(capHeight > 0)) {
      return { error: "Cap height must be positive. Increase the armhole, or reduce AH/3 − 1." };
    }
    if (!(p.sleeveLength > capHeight)) {
      return { error: "Sleeve length must be greater than cap height (" + capHeight.toFixed(2) + " cm)." };
    }

    var peak = V(0, capHeight);
    var cuffY = capHeight - p.sleeveLength;
    var frontDiagLen = p.frontAh;
    var backDiagLen = p.backAh + p.backDiagonalEase;

    if (frontDiagLen <= capHeight) {
      return {
        error:
          "Front AH (" +
          frontDiagLen.toFixed(2) +
          " cm) must be greater than cap height (" +
          capHeight.toFixed(2) +
          " cm).",
      };
    }
    if (backDiagLen <= capHeight) {
      return {
        error:
          "Back AH + 1 (" +
          backDiagLen.toFixed(2) +
          " cm) must be greater than cap height (" +
          capHeight.toFixed(2) +
          " cm).",
      };
    }

    var frontUnderarm = V(Math.sqrt(frontDiagLen * frontDiagLen - capHeight * capHeight), 0);
    var backUnderarm = V(-Math.sqrt(backDiagLen * backDiagLen - capHeight * capHeight), 0);
    var frontCuff = V(frontUnderarm.x, cuffY);
    var backCuff = V(backUnderarm.x, cuffY);
    var elbowFromPeak = p.sleeveLength / 2 + p.elbowExtra;
    var elbowY = capHeight - elbowFromPeak;

    var frontPerp = outwardInward(peak, frontUnderarm);
    var frontOffsetUpper = add(lerp(peak, frontUnderarm, 0.25), mul(frontPerp.out, p.frontUpperOut));
    var frontOffsetLower = add(lerp(peak, frontUnderarm, 0.75), mul(frontPerp.inn, p.frontLowerIn));

    var backPerp = outwardInward(peak, backUnderarm);
    var locatorT = 0.5 + p.backMidAlong / backDiagLen;
    if (locatorT >= 1) {
      notes.push("Back 2.5 cm locator overshoots the underarm; clamped.");
      locatorT = Math.min(locatorT, 0.95);
    }
    var backLocator = lerp(peak, backUnderarm, locatorT);
    var backOffsetUpper = add(lerp(peak, backUnderarm, 0.25), mul(backPerp.out, p.backUpperOut));
    var backOffsetLower = add(
      lerp(peak, backUnderarm, (locatorT + 1) / 2),
      mul(backPerp.inn, p.backLowerIn)
    );

    var cap = interpolate(
      [
        backUnderarm,
        backOffsetLower,
        backOffsetUpper,
        peak,
        frontOffsetUpper,
        frontOffsetLower,
        frontUnderarm,
      ],
      p.splineSamples
    );
    var peakI = nearestIndex(cap, peak);
    var backCap = cap.slice(0, peakI + 1).reverse();
    var frontCap = cap.slice(peakI);

    var cuffBackMid = V(backCuff.x / 2, cuffY - p.cuffBackOut);
    var cuffCenter = V(0, cuffY - p.cuffCenterDrop);
    var cuffFrontMid = V(frontCuff.x / 2, cuffY + p.cuffFrontIn);
    var cuff = interpolate([backCuff, cuffBackMid, cuffCenter, cuffFrontMid, frontCuff], p.splineSamples);

    var frontCapLen = polylineLength(frontCap);
    var backCapLen = polylineLength(backCap);

    return {
      error: null,
      params: p,
      capHeight: capHeight,
      origin: V(0, 0),
      peak: peak,
      frontUnderarm: frontUnderarm,
      backUnderarm: backUnderarm,
      frontCuff: frontCuff,
      backCuff: backCuff,
      elbowY: elbowY,
      cuffY: cuffY,
      frontDiagLen: frontDiagLen,
      backDiagLen: backDiagLen,
      frontWidth: frontUnderarm.x,
      backWidth: -backUnderarm.x,
      elbowFromPeak: elbowFromPeak,
      frontOffsetUpper: frontOffsetUpper,
      frontOffsetLower: frontOffsetLower,
      backOffsetUpper: backOffsetUpper,
      backOffsetLower: backOffsetLower,
      backLocator: backLocator,
      cuffFrontMid: cuffFrontMid,
      cuffBackMid: cuffBackMid,
      cuffCenter: cuffCenter,
      frontCap: frontCap,
      backCap: backCap,
      cap: cap,
      cuff: cuff,
      frontSeam: [frontUnderarm, frontCuff],
      backSeam: [backUnderarm, backCuff],
      frontCapLength: frontCapLen,
      backCapLength: backCapLen,
      frontEase: frontCapLen - p.frontAh,
      backEase: backCapLen - p.backAh,
      totalAh: ah,
      notes: notes,
    };
  }

  global.SleeveBlock = {
    DEFAULT_PARAMS: DEFAULT_PARAMS,
    draftSleeve: draftSleeve,
    patternOutline: patternOutline,
    offsetClosed: offsetClosed,
    closeRing: closeRing,
    V: V,
  };
})(window);
