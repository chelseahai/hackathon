/* Princess line dress — same geometry as GarmentDesign-PrincessLineDress/draft.py. Units: cm. */

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
    waist: 68,
    hip: 90,
    dressLength: 50,
    seamAllowance: 1,
    hipDepth: 18,
    sideShave: 1,
    widthIndent: 0.4,
    armholeMidInward: 0.2,
    neckWiden: 0.5,
    shoulderDrop: 0.5,
    armholeRaise: 0.5,
    waistEase: 3,
    hipEase: 4,
    hemFullness: 32,
    hemDistribution: [3/16, 4/16, 4/16, 5/16],
    sideHemRaise: 0.5,
    hemCtrlFromFold: 2 / 3,
    backDartFromSnp: 5.5,
    backShoulderDart: 1.5,
    frontPrincessFromSnp: 5.5,
    bpSideShave: 0.3,
    hollowTowardDart: 1,
    hollowTipTrim: 0.7,
    sfShToCf: 0.7,
    sfCtrlFromSh: 7,
    sideTakeFrac: 1 / 3,
    princessDart: 3,
    referenceBust: 84,
    referenceWaist: 68,
    referenceHip: 90,
    princessCtrlDown: 6,
    princessAboveHip: 4,
    backBlwInward: 0.2,
    frontBpwInward: 0.3,
    cfShBpToCf: 0.2,
    splineSamples: 32,
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
    eps = eps === undefined ? 1e-6 : eps;
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
    return trimOffsetLoops(out);
  }

  function insideRing(point,ring) {
    var winding=0;
    for(var i=0;i<ring.length;i++) {
      var a=ring[i],b=ring[(i+1)%ring.length];
      var dx=b.x-a.x,dy=b.y-a.y;
      var cross=dx*(point.y-a.y)-dy*(point.x-a.x);
      if(Math.abs(cross)<=1e-9*Math.max(1,Math.hypot(dx,dy)) &&
         point.x>=Math.min(a.x,b.x)-1e-9 && point.x<=Math.max(a.x,b.x)+1e-9 &&
         point.y>=Math.min(a.y,b.y)-1e-9 && point.y<=Math.max(a.y,b.y)+1e-9) return true;
      if(a.y<=point.y && point.y<b.y && cross>0) winding++;
      else if(b.y<=point.y && point.y<a.y && cross<0) winding--;
    }
    return winding!==0;
  }

  function nestedRing(inner,outer) {
    for(var i=0;i<inner.length;i++) {
      var a=inner[i],b=inner[(i+1)%inner.length];
      if(!insideRing(a,outer)) return false;
      var rx=b.x-a.x,ry=b.y-a.y,cuts=[0,1];
      for(var j=0;j<outer.length;j++) {
        var c=outer[j],d=outer[(j+1)%outer.length];
        var sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;
        if(Math.abs(den)<1e-12) continue;
        var qx=c.x-a.x,qy=c.y-a.y;
        var t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;
        if(t>=0 && t<=1 && u>=0 && u<=1) cuts.push(t);
      }
      cuts.sort(function(x,y){return x-y;});
      for(var k=0;k<cuts.length-1;k++) {
        if(cuts[k+1]-cuts[k]>1e-12 && !insideRing(lerp(a,b,(cuts[k]+cuts[k+1])/2),outer)) return false;
      }
    }
    return true;
  }

  function trimOffsetLoops(points) {
    // Exact local crossing trim; no rounding and no changes to stitch geometry.
    var ring = dedupeClosed(points);
    var orientation = signedArea(ring) > 0 ? 1 : -1;
    var limit = ring.length;
    for (var pass = 0; pass < limit; pass++) {
      var found = false;
      var n = ring.length;
      for (var i = 0; i < n && !found; i++) {
        var a = ring[i], b = ring[(i + 1) % n];
        for (var j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          var c = ring[j], d = ring[(j + 1) % n];
          if (Math.max(a.x,b.x) < Math.min(c.x,d.x) || Math.max(c.x,d.x) < Math.min(a.x,b.x) ||
              Math.max(a.y,b.y) < Math.min(c.y,d.y) || Math.max(c.y,d.y) < Math.min(a.y,b.y)) continue;
          var rx = b.x-a.x, ry = b.y-a.y, sx = d.x-c.x, sy = d.y-c.y;
          var den = rx*sy-ry*sx;
          if (Math.abs(den) < 1e-12) continue;
          var qx = c.x-a.x, qy = c.y-a.y;
          var t = (qx*sy-qy*sx)/den, u = (qx*ry-qy*rx)/den;
          if (!(t >= 0 && t <= 1 && u >= 0 && u <= 1)) continue;
          var hit = V(a.x+t*rx,a.y+t*ry);
          var first = dedupeClosed([hit].concat(ring.slice(i+1,j+1)));
          var second = dedupeClosed(ring.slice(0,i+1).concat([hit],ring.slice(j+1)));
          var area1 = signedArea(first)*orientation, area2 = signedArea(second)*orientation;
          if (area1 <= 1e-10 && area2 > 1e-10) ring = second;
          else if (area2 <= 1e-10 && area1 > 1e-10) ring = first;
          else if (area1 < area2 && nestedRing(first,second)) ring = second;
          else if (area2 < area1 && nestedRing(second,first)) ring = first;
          else throw new Error("Seam allowance has ambiguous overlapping regions");
          found = true;
          break;
        }
      }
      if (!found) return ring;
    }
    throw new Error("Seam allowance intersections could not be resolved");
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

  function translate(points, dx, dy) {
    dy = dy || 0;
    if (!dx && !dy) return points.slice();
    return points.map(function (pt) {
      return V(pt.x + dx, pt.y + dy);
    });
  }

  function translateMarks(marks, dx, dy) {
    dy = dy || 0;
    return (marks || []).map(function (m) {
      var pt = m.pt || m;
      return { pt: V(pt.x + dx, pt.y + dy), label: m.label || "" };
    });
  }

  function rotateAround(pt, origin, ang) {
    var d = sub(pt, origin);
    var c = Math.cos(ang);
    var s = Math.sin(ang);
    return V(origin.x + d.x * c - d.y * s, origin.y + d.x * s + d.y * c);
  }

  function rotatePoly(points, origin, ang) {
    if (Math.abs(ang) < 1e-12) return points.slice();
    return points.map(function (pt) {
      return rotateAround(pt, origin, ang);
    });
  }

  function angleAt(origin, a, b) {
    var va = sub(a, origin);
    var vb = sub(b, origin);
    return Math.atan2(va.x * vb.y - va.y * vb.x, va.x * vb.x + va.y * vb.y);
  }

  function ensureCcw(ring) {
    var pts = dedupeClosed(ring);
    if (pts.length >= 3 && signedArea(pts) < 0) pts.reverse();
    return pts;
  }

  function cleanKnots(points) {
    var cleaned = [];
    for (var i = 0; i < points.length; i++) {
      if (!cleaned.length || !samePoint(points[i], cleaned[cleaned.length - 1], 0.05)) {
        cleaned.push(points[i]);
      }
    }
    return cleaned;
  }

  function lineSeam(name, a, b) {
    return { name: name, kind: "line", points: [a, b], knots: [a, b], spans: [], center: null };
  }

  function curveSeam(name, knots, samples) {
    var kn = cleanKnots(knots);
    if (kn.length < 2) return { name: name, kind: "line", points: kn, knots: kn, spans: [], center: null };
    if (kn.length === 2) return lineSeam(name, kn[0], kn[1]);
    return { name: name, kind: "curve", points: interpolate(kn, samples), knots: kn, spans: [kn], center: null };
  }

  function spanSeam(name, spans, samples) {
    var cleaned = [];
    for (var i = 0; i < spans.length; i++) {
      var kn = cleanKnots(spans[i] || []);
      if (kn.length >= 2) cleaned.push(kn);
    }
    var points = [];
    for (var i = 0; i < cleaned.length; i++) {
      var part = cleaned[i].length > 2 ? interpolate(cleaned[i], samples) : cleaned[i];
      if (points.length && part.length) {
        if (samePoint(points[points.length - 1], part[0], 0.05)) points = points.concat(part.slice(1));
        else points = points.concat(part);
      } else {
        points = points.concat(part);
      }
    }
    if (cleaned.length === 1 && cleaned[0].length === 2) return lineSeam(name, cleaned[0][0], cleaned[0][1]);
    return { name: name, kind: "curve", points: points, knots: [], spans: cleaned, center: null };
  }

  function arcSeam(name, start, end, samples) {
    var points = arcHorizontalAtStart(start, end, samples);
    var dy = end.y - start.y;
    if (Math.abs(dy) < 1e-9) return lineSeam(name, start, end);
    var dx = end.x - start.x;
    var radius = (dx * dx + dy * dy) / (2 * dy);
    var center = V(start.x, start.y + radius);
    return { name: name, kind: "arc", points: points, knots: [start, end], spans: [], center: center };
  }

  function reverseSeam(seam) {
    var spans = (seam.spans || []).slice().reverse().map(function (span) {
      return span.slice().reverse();
    });
    return {
      name: seam.name,
      kind: seam.kind,
      points: (seam.points || []).slice().reverse(),
      knots: (seam.knots || []).slice().reverse(),
      spans: spans,
      center: seam.center,
    };
  }

  function joinSeams(seams) {
    var pts = [];
    for (var i = 0; i < seams.length; i++) {
      var sp = seams[i].points || [];
      if (!sp.length) continue;
      if (pts.length && samePoint(pts[pts.length - 1], sp[0], 0.05)) pts = pts.concat(sp.slice(1));
      else pts = pts.concat(sp);
    }
    return pts;
  }

  function seamsCcw(seams) {
    var outline = joinSeams(seams);
    var ring = dedupeClosed(outline);
    if (ring.length >= 3 && signedArea(ring) < 0) {
      seams = seams.slice().reverse().map(reverseSeam);
      outline = joinSeams(seams);
    }
    return { seams: seams, outline: ensureCcw(outline) };
  }

  function translateSeams(seams, dx, dy) {
    dy = dy || 0;
    return (seams || []).map(function (seam) {
      var center = seam.center ? V(seam.center.x + dx, seam.center.y + dy) : null;
      return {
        name: seam.name,
        kind: seam.kind,
        points: translate(seam.points, dx, dy),
        knots: translate(seam.knots || [], dx, dy),
        spans: (seam.spans || []).map(function (span) { return translate(span, dx, dy); }),
        center: center,
      };
    });
  }

  function alongSegment(a, b, dist) {
    var span = length(sub(b, a));
    if (span < 1e-12) return a;
    return lerp(a, b, Math.min(Math.max(dist / span, 0), 1));
  }

  function closestOnPolyline(poly, pt) {
    var bestPt = poly[0];
    var bestD = length(sub(poly[0], pt));
    var bestAlong = 0;
    var along = 0;
    for (var i = 0; i < poly.length - 1; i++) {
      var a = poly[i];
      var b = poly[i + 1];
      var ab = sub(b, a);
      var len = length(ab);
      if (len < 1e-12) continue;
      var t = ((pt.x - a.x) * ab.x + (pt.y - a.y) * ab.y) / (len * len);
      t = Math.min(Math.max(t, 0), 1);
      var q = lerp(a, b, t);
      var d = length(sub(q, pt));
      if (d < bestD) {
        bestD = d;
        bestPt = q;
        bestAlong = along + t * len;
      }
      along += len;
    }
    return { pt: bestPt, along: bestAlong };
  }

  function upSeamFromLevel(poly, levelY, dist, toward) {
    var hit = nearestHit(hitsAtY(poly, levelY), toward);
    if (!hit) return V(toward.x, levelY + dist);
    var alongHit = closestOnPolyline(poly, hit).along;
    return pointAlong(poly, Math.max(0, alongHit - dist));
  }

  function hitsAtY(poly, y) {
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

  function nearestHit(hits, target) {
    if (!hits.length) return null;
    var best = hits[0];
    var bestD = length(sub(hits[0], target));
    for (var i = 1; i < hits.length; i++) {
      var d = length(sub(hits[i], target));
      if (d < bestD) {
        bestD = d;
        best = hits[i];
      }
    }
    return best;
  }

  function layoutShifts(outlines, seam, gap) {
    gap = gap === undefined ? PIECE_GAP : gap;
    var shifts = [];
    var cursor = null;
    for (var i = 0; i < outlines.length; i++) {
      var pts = outlines[i].slice();
      if (seam) pts = pts.concat(offsetClosed(outlines[i], seam));
      var minX = Math.min.apply(null, pts.map(function (pt) { return pt.x; }));
      var maxX = Math.max.apply(null, pts.map(function (pt) { return pt.x; }));
      if (cursor === null) {
        shifts.push(0);
        cursor = maxX + gap;
      } else {
        var dx = cursor - minX;
        shifts.push(dx);
        cursor = maxX + dx + gap;
      }
    }
    return shifts;
  }

  function laidOutPanels(draft, seam, gap) {
    var shifts = layoutShifts(
      draft.panels.map(function (panel) {
        var pts = panel.outline.slice();
        if (seam) pts = pts.concat(offsetClosed(panel.outline, seam));
        (panel.construction || []).forEach(function (poly) {
          pts = pts.concat(poly);
        });
        (panel.preRotation || []).forEach(function (poly) {
          pts = pts.concat(poly);
        });
        return pts;
      }),
      0,
      gap
    );
    return draft.panels.map(function (panel, i) {
      return {
        name: panel.name,
        outline: translate(panel.outline, shifts[i]),
        notches: translate(panel.notches, shifts[i]),
        notchIds: (panel.notchIds || []).slice(),
        marks: translateMarks(panel.marks || [], shifts[i]),
        construction: (panel.construction || []).map(function (poly) {
          return translate(poly, shifts[i]);
        }),
        overlays: (panel.overlays || []).map(function (poly) {
          return translate(poly, shifts[i]);
        }),
        preRotation: (panel.preRotation || []).map(function (poly) {
          return translate(poly, shifts[i]);
        }),
        seams: translateSeams(panel.seams || [], shifts[i]),
      };
    });
  }

  function sideCurve(underarm, waist, whHalf, hip, hemHalf, hem, samples) {
    return interpolate([underarm, waist, whHalf, hip, hemHalf, hem], samples);
  }

  function princess(points, samples) {
    var cleaned = [];
    for (var i = 0; i < points.length; i++) {
      if (!cleaned.length || !samePoint(points[i], cleaned[cleaned.length - 1], 0.05)) {
        cleaned.push(points[i]);
      }
    }
    if (cleaned.length < 2) return cleaned;
    return interpolate(cleaned, samples);
  }

  function princessAtWaist(upper, lower, samples) {
    var up = princess(upper, samples);
    var down = princess(lower, samples);
    if (!up.length) return down;
    if (!down.length) return up;
    return up.concat(down.slice(1));
  }

  function hipHemStraight(hip, hem) {
    return { q: lerp(hip, hem, 0.25), half: lerp(hip, hem, 0.5) };
  }

  function scaledPrincessDart(takeout, refTakeout, refDart) {
    if (refTakeout < 1e-9) return refDart;
    return takeout * (refDart / refTakeout);
  }

  function scyeFromBack(backLength, bodyParams, refBust) {
    var armhole = refBust / 6 + bodyParams.armholeDepthAdd;
    var blY = backLength - armhole;
    return { blY: blY, bpY: blY - bodyParams.bpBelowBl };
  }

  function offsetToward(origin, target, distance) {
    var delta = sub(target, origin);
    if (length(delta) < 1e-12) return origin;
    return add(origin, mul(unit(delta), distance));
  }

  function offsetOutward(origin, interior, distance) {
    return offsetToward(origin, V(interior.x, origin.y), -distance);
  }

  function raiseUp(origin, distance) {
    return V(origin.x, origin.y + distance);
  }

  function raisePoly(points, distance) {
    if (!distance) return points.slice();
    return points.map(function (pt) {
      return raiseUp(pt, distance);
    });
  }

  function intersectHorizontal(a, b, y) {
    if (Math.abs(b.y - a.y) < 1e-12) {
      return Math.abs(a.y - y) < 1e-9 ? V(a.x, y) : null;
    }
    var t = (y - a.y) / (b.y - a.y);
    if (t < -1e-9 || t > 1 + 1e-9) return null;
    return lerp(a, b, Math.min(Math.max(t, 0), 1));
  }

  function hemCurve(sideHem, ctrl, princessHem, samples) {
    return interpolate([sideHem, ctrl, princessHem], samples);
  }

  function upwardInward(origin, up, interior, inward) {
    var raised = V(origin.x, origin.y + up);
    return offsetToward(raised, V(interior.x, raised.y), inward);
  }

  function halfInward(poly, interior, inward) {
    if (!poly.length) return V(0, 0);
    var half = pointAlong(poly, polylineLength(poly) / 2);
    return offsetToward(half, V(interior.x, half.y), inward);
  }

  function centroid(pts) {
    if (!pts.length) return V(0, 0);
    var sx = 0;
    var sy = 0;
    for (var i = 0; i < pts.length; i++) {
      sx += pts[i].x;
      sy += pts[i].y;
    }
    return V(sx / pts.length, sy / pts.length);
  }

  function inwardMidpoint(a, b, interior, distance) {
    var mid = lerp(a, b, 0.5);
    var along = sub(b, a);
    if (length(along) < 1e-12) {
      var toward = sub(interior, mid);
      if (length(toward) < 1e-12) return mid;
      return add(mid, mul(unit(toward), distance));
    }
    var normal = unit(V(-along.y, along.x));
    var toInterior = sub(interior, mid);
    if (toInterior.x * normal.x + toInterior.y * normal.y < 0) {
      normal = V(-normal.x, -normal.y);
    }
    return add(mid, mul(normal, distance));
  }

  function princessNotches(pr, axisX, ys) {
    var out = [];
    for (var i = 0; i < ys.length; i++) {
      var hit = nearestHit(hitsAtY(pr, ys[i]), V(axisX, ys[i]));
      if (hit) out.push(hit);
    }
    return out;
  }

  function reverseRest(poly) {
    return poly.slice(1).reverse();
  }

  function draftPrincessDress(input) {
    var p = Object.assign({}, DEFAULT_PARAMS, input || {});
    var notes = [];
    if (![p.bust,p.waist,p.hip,p.backLength,p.dressLength,p.hipDepth,p.seamAllowance,p.waistEase,p.hipEase,p.hemFullness].every(Number.isFinite)) return {error: "Measurements and design settings must be finite."};
    if (!(p.waistEase >= 0 && p.waistEase <= 12 && p.hipEase >= 0 && p.hipEase <= 12 && p.hemFullness >= 0 && p.hemFullness <= 80)) return {error: "Ease must be 0–12 cm and hem fullness 0–80 cm."};
    if (!Array.isArray(p.hemDistribution) || p.hemDistribution.length !== 4 || !p.hemDistribution.every(function(v){return Number.isFinite(v) && v >= 0;}) || Math.abs(p.hemDistribution.reduce(function(a,b){return a+b;},0)-1)>1e-9) return {error: "Hem distribution needs four nonnegative shares summing to one."};
    if (!(p.backLength > 0 && p.hipDepth > 0 && p.seamAllowance >= 0)) return {error: "Lengths must be positive and seam allowance nonnegative."};

    if (!(p.bust > 0) || !(p.waist > 0) || !(p.hip > 0)) {
      return { error: "Bust, waist, and hip must be positive." };
    }
    if (!(p.dressLength > p.hipDepth)) {
      return { error: "Dress length must be greater than hip depth (" + p.hipDepth.toFixed(2) + " cm)." };
    }
    if (!(p.waist < p.hip)) {
      return { error: "Waist must be smaller than hip." };
    }

    var body = BodyBlock.draftBody({
      bust: p.bust,
      backLength: p.backLength,
      seamAllowance: p.seamAllowance,
    });
    if (body.error) return { error: body.error };

    var skirt = SkirtBlock.draftSkirt({
      hip: p.hip,
      waist: p.waist,
      skirtLength: p.dressLength,
      hipDepth: p.hipDepth,
      seamAllowance: p.seamAllowance,
    });
    if (skirt.error) return { error: skirt.error };

    var samples = p.splineSamples;
    var bisector = Math.SQRT1_2;
    var wlY = 0;
    var hlY = -p.hipDepth;
    var hemY = -p.dressLength;
    var scye = scyeFromBack(p.backLength, body.params, p.referenceBust);
    var blY = scye.blY;
    var bpY = scye.bpY;
    var topY = body.topY;
    var cfX = body.cfX;
    var bodiceUa = V(body.underarm.x, blY);

    var backWidthX = body.backWidthX - p.widthIndent;
    var chestWidthX = body.chestWidthX + p.widthIndent;
    var backUnderarm = upwardInward(bodiceUa, p.armholeRaise, V(0, 0), p.sideShave);
    var frontUnderarm = upwardInward(bodiceUa, p.armholeRaise, V(cfX, 0), p.sideShave);
    var ahDepth = topY - backUnderarm.y;
    var midDepthY = topY - ahDepth / 2;

    var backSnp = V(body.backSnp.x + p.neckWiden, body.backSnp.y);
    var backShoulder = V(body.backShoulder.x, body.backShoulder.y - p.shoulderDrop);
    var backNeck = arcHorizontalAtStart(body.cbNeck, backSnp, samples);

    var fnw = body.frontNeckWidth + p.neckWiden;
    var frontSnp = V(cfX - fnw, body.frontSnp.y);
    var neckCorner = V(cfX - fnw, body.cfNeck.y);
    var frontBisectorLen = fnw / 2 - body.params.frontNeckBisectorMinus;
    var frontNeckOffset = V(
      neckCorner.x + frontBisectorLen * bisector,
      neckCorner.y + frontBisectorLen * bisector
    );
    var frontNeck = interpolate([frontSnp, frontNeckOffset, body.cfNeck], samples);
    var frontShoulder = V(body.frontShoulder.x, body.frontShoulder.y - p.shoulderDrop);

    var backAhWidth = backUnderarm.x - backWidthX;
    var frontAhWidth = chestWidthX - frontUnderarm.x;
    var backAhAlong = Math.max(backAhWidth, 0.4) / 2 + body.params.backAhBisectorExtra;
    var frontAhAlong = Math.max(frontAhWidth, 0.4) / 2;
    var backAhMid = V(backWidthX, midDepthY);
    var frontAhMid = V(chestWidthX, midDepthY);
    var backAhBisector = V(
      backWidthX + backAhAlong * bisector,
      backUnderarm.y + backAhAlong * bisector
    );
    var frontAhBisector = V(
      chestWidthX - frontAhAlong * bisector,
      frontUnderarm.y + frontAhAlong * bisector
    );
    var backArmhole = interpolate([backShoulder, backAhMid, backAhBisector, backUnderarm], samples);
    backAhMid = halfInward(backArmhole, V(0, 0), p.armholeMidInward);
    backArmhole = interpolate([backShoulder, backAhMid, backAhBisector, backUnderarm], samples);
    var frontArmhole = interpolate(
      [frontUnderarm, frontAhBisector, frontAhMid, frontShoulder],
      samples
    );
    frontAhMid = halfInward(frontArmhole, V(cfX, 0), p.armholeMidInward);
    frontArmhole = interpolate(
      [frontUnderarm, frontAhBisector, frontAhMid, frontShoulder],
      samples
    );

    var frontLift = -body.cfHem.y;
    frontSnp = raiseUp(frontSnp, frontLift);
    frontNeckOffset = raiseUp(frontNeckOffset, frontLift);
    frontNeck = raisePoly(frontNeck, frontLift);
    frontShoulder = raiseUp(frontShoulder, frontLift);
    frontUnderarm = raiseUp(frontUnderarm, frontLift);
    frontAhMid = raiseUp(frontAhMid, frontLift);
    frontAhBisector = raiseUp(frontAhBisector, frontLift);
    frontArmhole = raisePoly(frontArmhole, frontLift);
    var bpFront = raiseUp(V(body.bp.x, bpY), frontLift);
    var cfNeck = raiseUp(body.cfNeck, frontLift);

    var backHip = (p.hip + p.hipEase) / 4 - 1;
    var frontHip = (p.hip + p.hipEase) / 4 + 1;
    var backWaist = (p.waist + p.waistEase) / 4 - 0.75;
    var frontWaist = (p.waist + p.waistEase) / 4 + 0.75;
    var backTake = backHip - backWaist;
    var frontTake = frontHip - frontWaist;
    if (backTake <= 0 || frontTake <= 0) {
      return { error: "Waist-hip difference is too small for this dress." };
    }
    var refSkirt = SkirtBlock.draftSkirt({
      hip: p.referenceHip,
      waist: p.referenceWaist,
      skirtLength: p.dressLength,
      hipDepth: p.hipDepth,
      seamAllowance: p.seamAllowance,
    });
    if (refSkirt.error) return { error: refSkirt.error };
    var refBackTake = refSkirt.backHip - p.referenceWaist / 4;
    var refFrontTake = refSkirt.frontHip - refSkirt.frontWaist;
    var backDart = scaledPrincessDart(backTake, refBackTake, p.princessDart);
    var frontDart = scaledPrincessDart(frontTake, refFrontTake, p.princessDart);
    var backSideTake = backTake - backDart;
    var frontSideTake = frontTake - frontDart;

    var cbHem = V(0, hemY);
    var cfHem = V(cfX, hemY);
    var backHipPt = V(backHip, hlY);
    var backSideWaist = V(backHip - backSideTake, wlY);
    var backSideHem0 = offsetOutward(V(backHip, hemY), V(0, hemY), p.hemFullness / 2 * p.hemDistribution[0]);
    var backHem23 = lerp(cbHem, backSideHem0, p.hemCtrlFromFold);
    var backSideHem = raiseUp(backSideHem0, p.sideHemRaise);
    var backWhHalf = lerp(backSideWaist, backHipPt, 0.5);
    var backSideHalf = lerp(backHipPt, backSideHem, 0.5);
    var frontHipPt = V(cfX - frontHip, hlY);
    var frontSideWaist = V(cfX - frontHip + frontSideTake, wlY);
    var frontSideHem0 = offsetOutward(V(cfX - frontHip, hemY), V(cfX, hemY), p.hemFullness / 2 * p.hemDistribution[2]);
    var frontHem23 = lerp(cfHem, frontSideHem0, p.hemCtrlFromFold);
    var frontSideHem = raiseUp(frontSideHem0, p.sideHemRaise);
    var frontWhHalf = lerp(frontSideWaist, frontHipPt, 0.5);
    var frontSideHalf = lerp(frontHipPt, frontSideHem, 0.5);

    var backSide = sideCurve(
      backUnderarm,
      backSideWaist,
      backWhHalf,
      backHipPt,
      backSideHalf,
      backSideHem,
      samples
    );
    var bodiceSideUa = offsetToward(
      raiseUp(bodiceUa, frontLift),
      V(cfX, blY + frontLift),
      p.sideShave
    );
    var bodiceSideSw = offsetToward(
      raiseUp(body.sideWaist, frontLift),
      V(cfX, body.sideWaist.y + frontLift),
      p.sideShave
    );
    var pointA = intersectHorizontal(bodiceSideUa, bodiceSideSw, bpFront.y);
    if (!pointA) pointA = lerp(bodiceSideUa, bodiceSideSw, 0.5);
    var frontBelow = interpolate(
      [frontSideWaist, frontWhHalf, frontHipPt, frontSideHalf, frontSideHem],
      samples
    );
    var line1Len = length(sub(frontUnderarm, pointA));
    var line2Len = length(sub(pointA, frontSideWaist));
    var backSideLen = polylineLength(backSide);
    var frontSideLen0 = line1Len + line2Len + polylineLength(frontBelow);
    var sideDart = frontSideLen0 - backSideLen;
    var frontSide = [frontUnderarm, pointA, frontSideWaist].concat(frontBelow.slice(1));

    var backAxis = backWidthX / 2;
    var bp = V(body.bp.x, bpY);
    var p0 = alongSegment(backSnp, backShoulder, p.backDartFromSnp);
    var p1 = alongSegment(backSnp, backShoulder, p.backDartFromSnp + p.backShoulderDart);
    var cbWaist = V(backAxis - backDart / 2, wlY);
    var sbWaist = V(backAxis + backDart / 2, wlY);
    var cbHip = V(backAxis, hlY);
    var sbHip = V(backAxis, hlY);
    var backPrFlare = p.hemFullness / 4 * p.hemDistribution[1];
    var cbPrHem = offsetOutward(V(backAxis, hemY), V(0, hemY), backPrFlare);
    var sbPrHem = offsetOutward(V(backAxis, hemY), V(backHip, hemY), backPrFlare);
    var blPt = V(backAxis, blY);
    var bpLevel = V(backAxis, bp.y);
    var backKnotCb = upSeamFromLevel(
      princess([p0, blPt, cbWaist], samples),
      bp.y,
      p.princessCtrlDown,
      bpLevel
    );
    var backKnotSb = upSeamFromLevel(
      princess([p1, blPt, sbWaist], samples),
      bp.y,
      p.princessCtrlDown,
      bpLevel
    );
    var cbKnot4 = V(cbHip.x, cbHip.y + p.princessAboveHip);
    var sbKnot4 = V(sbHip.x, sbHip.y + p.princessAboveHip);
    var cbStr = hipHemStraight(cbHip, cbPrHem);
    var sbStr = hipHemStraight(sbHip, sbPrHem);
    var cbInterior = centroid([body.cbNeck, V(0, wlY), V(0, hemY)]);
    var sbInterior = centroid([backShoulder, backUnderarm, backSideWaist, backSideHem]);
    var cbBlW = inwardMidpoint(blPt, cbWaist, cbInterior, p.backBlwInward);
    var sbBlW = inwardMidpoint(blPt, sbWaist, sbInterior, p.backBlwInward);
    var backPrCb = princessAtWaist(
      [p0, backKnotCb, cbBlW, cbWaist],
      [cbWaist, cbKnot4, cbStr.half, cbPrHem],
      samples
    );
    var backPrSb = princessAtWaist(
      [p1, backKnotSb, sbBlW, sbWaist],
      [sbWaist, sbKnot4, sbStr.half, sbPrHem],
      samples
    );

    bp = bpFront;

    var f0 = alongSegment(frontSnp, frontShoulder, p.frontPrincessFromSnp);
    var rotAng = 0;
    var dartU = pointA;
    var dartL = pointA;
    var frontArmholeR = frontArmhole.slice();
    var frontShoulderR = frontShoulder;
    var f0Side = f0;
    var frontSideR = frontSide.slice();
    if (sideDart > 0.08) {
      dartU = pointA;
      dartL = alongSegment(pointA, frontSideWaist, sideDart);
      rotAng = angleAt(bp, dartU, dartL);
      frontArmholeR = rotatePoly(frontArmhole, bp, rotAng);
      frontShoulderR = rotateAround(frontShoulder, bp, rotAng);
      f0Side = rotateAround(f0, bp, rotAng);
      var uaR = rotateAround(frontUnderarm, bp, rotAng);
      frontSideR = [uaR, dartL];
      if (!samePoint(dartL, frontSideWaist, 0.05)) frontSideR.push(frontSideWaist);
      frontSideR = frontSideR.concat(frontBelow.slice(1));
      if (frontSideR.length < 2) frontSideR = frontSide.slice();
    }

    // Preserve the rigid dart transfer before later shoulder/BP refinements.
    var upperBefore = [bp, f0, frontShoulder].concat(frontArmhole.slice(0, -1).reverse(), [dartU, bp]);
    var dartTransfer = {
      pivot: bp, angle: rotAng, upperBefore: upperBefore,
      upperAfter: rotatePoly(upperBefore, bp, rotAng),
      lowerSide: [bp, dartL, frontSideWaist].concat(frontBelow.slice(1)),
      dartUpper: dartU, dartLower: dartL, shoulder: f0
    };

    var f0Cf = alongSegment(
      frontSnp,
      frontShoulder,
      p.frontPrincessFromSnp + p.hollowTowardDart
    );
    var tipToDart = sub(f0Side, frontShoulderR);
    if (length(tipToDart) > p.hollowTipTrim + 0.2) {
      frontShoulderR = add(frontShoulderR, mul(unit(tipToDart), p.hollowTipTrim));
    }
    var frontAhMidR = rotateAround(frontAhMid, bp, rotAng);
    var frontAhBisectorR = rotateAround(frontAhBisector, bp, rotAng);
    var ahUa = frontArmholeR.length ? frontArmholeR[0] : frontUnderarm;
    frontArmholeR = interpolate([ahUa, frontAhBisectorR, frontAhMidR, frontShoulderR], samples);
    f0Side = offsetToward(f0Side, V(cfX, f0Side.y), p.sfShToCf);
    var sfFromSh = alongSegment(f0Side, bp, p.sfCtrlFromSh);

    var bpSide = V(bp.x - p.bpSideShave, bp.y);
    var cfPrWaist = V(bp.x + frontDart / 2, wlY);
    var sfPrWaist = V(bp.x - frontDart / 2, wlY);
    var cfPrHip = V(bp.x, hlY);
    var sfPrHip = V(bp.x, hlY);
    var frontPrFlare = p.hemFullness / 4 * p.hemDistribution[3];
    var cfPrHem = offsetOutward(V(bp.x, hemY), V(cfX, hemY), frontPrFlare);
    var sfPrHem = offsetOutward(V(bp.x, hemY), V(cfX - frontHip, hemY), frontPrFlare);
    var cfKnot4 = V(cfPrHip.x, cfPrHip.y + p.princessAboveHip);
    var sfKnot4 = V(sfPrHip.x, sfPrHip.y + p.princessAboveHip);
    var cfStr = hipHemStraight(cfPrHip, cfPrHem);
    var sfStr = hipHemStraight(sfPrHip, sfPrHem);
    var cfInterior = centroid([cfNeck, V(cfX, wlY), V(cfX, hemY)]);
    var sfUnderarm = frontArmholeR.length ? frontArmholeR[0] : frontUnderarm;
    var sfInterior = centroid([frontShoulderR, sfUnderarm, frontSideWaist, frontSideHem]);
    var cfBpW = inwardMidpoint(bp, cfPrWaist, cfInterior, p.frontBpwInward);
    var sfBpW = inwardMidpoint(bpSide, sfPrWaist, sfInterior, p.frontBpwInward);
    var cfShBp = offsetToward(
      lerp(f0Cf, bp, 0.5),
      V(cfX, (f0Cf.y + bp.y) / 2),
      p.cfShBpToCf
    );
    var frontPrCf = princessAtWaist(
      [f0Cf, cfShBp, bp, cfBpW, cfPrWaist],
      [cfPrWaist, cfKnot4, cfStr.half, cfPrHem],
      samples
    );
    var frontPrSf = princessAtWaist(
      [f0Side, sfFromSh, bpSide, sfBpW, sfPrWaist],
      [sfPrWaist, sfKnot4, sfStr.half, sfPrHem],
      samples
    );

    var sbHem = hemCurve(backSideHem, backHem23, sbPrHem, samples);
    var sfHem = hemCurve(frontSideHem, frontHem23, sfPrHem, samples);

    var preSfInterior = centroid([frontShoulder, frontUnderarm, frontSideWaist, frontSideHem]);
    var preSfBpW = inwardMidpoint(bpSide, sfPrWaist, preSfInterior, p.frontBpwInward);
    var prePrSf = princessAtWaist(
      [f0, bpSide, preSfBpW, sfPrWaist],
      [sfPrWaist, sfKnot4, sfStr.half, sfPrHem],
      samples
    );
    var sfPre = closeRing(
      ensureCcw(
        [f0, frontShoulder]
          .concat(frontArmhole.slice(0, -1).reverse())
          .concat(frontSide.slice(1))
          .concat(sfHem.slice(1))
          .concat(reverseRest(prePrSf))
      )
    );

    var cbUpper = [p0, backKnotCb, cbBlW, cbWaist];
    var cbLower = [cbWaist, cbKnot4, cbStr.half, cbPrHem];
    var sbUpper = [p1, backKnotSb, sbBlW, sbWaist];
    var sbLower = [sbWaist, sbKnot4, sbStr.half, sbPrHem];
    var cfUpper = [f0Cf, cfShBp, bp, cfBpW, cfPrWaist];
    var cfLower = [cfPrWaist, cfKnot4, cfStr.half, cfPrHem];
    var sfUpper = [f0Side, sfFromSh, bpSide, sfBpW, sfPrWaist];
    var sfLower = [sfPrWaist, sfKnot4, sfStr.half, sfPrHem];

    var sfSideSpans;
    if (sideDart > 0.08) {
      sfSideSpans = [[frontSideR[0], dartL]];
      if (!samePoint(dartL, frontSideWaist, 0.05)) sfSideSpans.push([dartL, frontSideWaist]);
      sfSideSpans.push([frontSideWaist, frontWhHalf, frontHipPt, frontSideHalf, frontSideHem]);
    } else {
      sfSideSpans = [
        [frontUnderarm, pointA],
        [pointA, frontSideWaist],
        [frontSideWaist, frontWhHalf, frontHipPt, frontSideHalf, frontSideHem],
      ];
    }

    var cbBuilt = seamsCcw([
      arcSeam("SEAM-CB-Collar", body.cbNeck, backSnp, samples),
      lineSeam("SEAM-CB-Shoulder", backSnp, p0),
      spanSeam("SEAM-CB-PrincessSeam", [cbUpper, cbLower], samples),
      lineSeam("SEAM-CB-Hem", cbPrHem, cbHem),
      lineSeam("SEAM-CB-Center", cbHem, body.cbNeck),
    ]);
    var sbBuilt = seamsCcw([
      lineSeam("SEAM-SB-Shoulder", p1, backShoulder),
      curveSeam("SEAM-SB-Armhole", [backShoulder, backAhMid, backAhBisector, backUnderarm], samples),
      curveSeam(
        "SEAM-SB-Side",
        [backUnderarm, backSideWaist, backWhHalf, backHipPt, backSideHalf, backSideHem],
        samples
      ),
      curveSeam("SEAM-SB-Hem", [backSideHem, backHem23, sbPrHem], samples),
      spanSeam("SEAM-SB-PrincessSeam", [sbLower.slice().reverse(), sbUpper.slice().reverse()], samples),
    ]);
    var ahUa = frontArmholeR.length ? frontArmholeR[0] : frontUnderarm;
    var sfBuilt = seamsCcw([
      lineSeam("SEAM-SF-Shoulder", f0Side, frontShoulderR),
      curveSeam("SEAM-SF-Armhole", [frontShoulderR, frontAhMidR, frontAhBisectorR, ahUa], samples),
      spanSeam("SEAM-SF-Side", sfSideSpans, samples),
      curveSeam("SEAM-SF-Hem", [frontSideHem, frontHem23, sfPrHem], samples),
      spanSeam("SEAM-SF-PrincessSeam", [sfLower.slice().reverse(), sfUpper.slice().reverse()], samples),
    ]);
    var cfBuilt = seamsCcw([
      curveSeam("SEAM-CF-Collar", [frontSnp, frontNeckOffset, cfNeck], samples),
      lineSeam("SEAM-CF-Center", cfNeck, cfHem),
      lineSeam("SEAM-CF-Hem", cfHem, cfPrHem),
      spanSeam("SEAM-CF-PrincessSeam", [cfLower.slice().reverse(), cfUpper.slice().reverse()], samples),
      lineSeam("SEAM-CF-Shoulder", f0Cf, frontSnp),
    ]);
    var cbOutline = cbBuilt.outline;
    var sbOutline = sbBuilt.outline;
    var sfOutline = sfBuilt.outline;
    var cfOutline = cfBuilt.outline;

    var notchYs = [blY, wlY, hlY];
    var cbNotches = princessNotches(backPrCb, backAxis, notchYs);
    var sbNotches = princessNotches(backPrSb, backAxis, notchYs);
    var sfNotches = princessNotches(frontPrSf, bp.x, notchYs);
    var cfNotches = princessNotches(frontPrCf, bp.x, notchYs);

    var sfConstruction = [
      [bodiceSideUa, bodiceSideSw],
      [bp, pointA],
      [frontUnderarm, pointA],
      [pointA, frontSideWaist],
      [f0Side, bp],
    ];
    if (sideDart > 0.08) sfConstruction.push([dartU, bp, dartL]);
    var cfConstruction = [[f0Cf, bp]];

    var bodyFront = closeRing(raisePoly(BodyBlock.frontOutline(body), frontLift));

    var panels = [
      {
        name: "Centre back",
        outline: cbOutline,
        notches: cbNotches,
        marks: [
          { pt: p0, label: "SH" },
          { pt: backKnotCb, label: "6" },
          { pt: blPt, label: "BL" },
          { pt: cbBlW, label: "0.2" },
          { pt: cbWaist, label: "W" },
          { pt: cbKnot4, label: "4" },
          { pt: cbHip, label: "H" },
          { pt: cbStr.q, label: "¼" },
          { pt: cbStr.half, label: "½" },
          { pt: cbPrHem, label: "HEM" },
          { pt: cbHem, label: "HEM" },
        ],
        seams: cbBuilt.seams,
      },
      {
        name: "Side back",
        outline: sbOutline,
        notches: sbNotches,
        marks: [
          { pt: p1, label: "SH" },
          { pt: backKnotSb, label: "6" },
          { pt: blPt, label: "BL" },
          { pt: sbBlW, label: "0.2" },
          { pt: sbWaist, label: "W" },
          { pt: sbKnot4, label: "4" },
          { pt: sbHip, label: "H" },
          { pt: sbStr.q, label: "¼" },
          { pt: sbStr.half, label: "½" },
          { pt: sbPrHem, label: "HEM" },
          { pt: backShoulder, label: "TIP" },
          { pt: backAhMid, label: "MID" },
          { pt: backAhBisector, label: "45" },
          { pt: backUnderarm, label: "UA" },
          { pt: backSideWaist, label: "W" },
          { pt: backWhHalf, label: "½" },
          { pt: backHipPt, label: "H" },
          { pt: backSideHalf, label: "½" },
          { pt: backHem23, label: "⅔" },
          { pt: backSideHem, label: "HEM" },
        ],
        seams: sbBuilt.seams,
      },
      {
        name: "Side front",
        outline: sfOutline,
        notches: sfNotches,
        marks: [
          { pt: f0Side, label: "SH" },
          { pt: sfFromSh, label: "7" },
          { pt: bpSide, label: "BP" },
          { pt: sfBpW, label: "0.3" },
          { pt: sfPrWaist, label: "W" },
          { pt: sfKnot4, label: "4" },
          { pt: sfPrHip, label: "H" },
          { pt: sfStr.q, label: "¼" },
          { pt: sfStr.half, label: "½" },
          { pt: sfPrHem, label: "HEM" },
          { pt: frontShoulderR, label: "TIP" },
          { pt: frontAhMidR, label: "MID" },
          { pt: frontAhBisectorR, label: "45" },
          { pt: frontSideR.length ? frontSideR[0] : frontUnderarm, label: "UA" },
          { pt: pointA, label: "A" },
          { pt: frontSideWaist, label: "W" },
          { pt: frontWhHalf, label: "½" },
          { pt: frontHipPt, label: "H" },
          { pt: frontSideHalf, label: "½" },
          { pt: frontHem23, label: "⅔" },
          { pt: frontSideHem, label: "HEM" },
        ],
        construction: sfConstruction,
        overlays: [bodyFront],
        preRotation: [sfPre],
        seams: sfBuilt.seams,
      },
      {
        name: "Centre front",
        outline: cfOutline,
        notches: cfNotches,
        marks: [
          { pt: f0Cf, label: "SH" },
          { pt: cfShBp, label: "0.2" },
          { pt: bp, label: "BP" },
          { pt: cfBpW, label: "0.3" },
          { pt: cfPrWaist, label: "W" },
          { pt: cfKnot4, label: "4" },
          { pt: cfPrHip, label: "H" },
          { pt: cfStr.q, label: "¼" },
          { pt: cfStr.half, label: "½" },
          { pt: cfPrHem, label: "HEM" },
          { pt: cfHem, label: "HEM" },
        ],
        construction: cfConstruction,
        seams: cfBuilt.seams,
      },
    ];

    for (var k = 0; k < panels.length; k++) {
      if (panels[k].outline.length < 4) {
        return { error: panels[k].name + " did not form a closed panel." };
      }
      var panel = panels[k];
      var pair = panel.name === "Centre back" || panel.name === "Side back" ? "back_princess" : "front_princess";
      if (panel.notches.length !== 3) return {error: panel.name + " is missing a princess sewing mark"};
      panel.notchIds = [pair+".upper",pair+".waist",pair+".hip"];
      var side = panel.seams.find(function(s) { return s.name.endsWith("-Side"); });
      if (side) {
        var sideLevels = [["waist",wlY],["hip",hlY]];
        for (var levelIndex = 0; levelIndex < sideLevels.length; levelIndex++) {
          var level = sideLevels[levelIndex];
          var unique = [];
          hitsAtY(side.points,level[1]).forEach(function(hit) {
            if (!unique.some(function(old) { return samePoint(hit,old); })) unique.push(hit);
          });
          if (unique.length !== 1) return {error: panel.name + " has no unique " + level[0] + " side mark"};
          panel.notches.push(unique[0]);
          panel.notchIds.push("side."+level[0]);
        }
      }
    }

    var frontSideLen = polylineLength(frontSideR);
    if (Math.abs(rotAng) > 1e-6) {
      notes.push("Front side dart rotated into the shoulder; hollow chest applied.");
    }

    return {
      error: null,
      params: p,
      panels: panels,
      backWaist: backWaist,
      frontWaist: frontWaist,
      backHip: backHip,
      frontHip: frontHip,
      backDart: backDart,
      frontDart: frontDart,
      backSideLen: backSideLen,
      frontSideLen: frontSideLen,
      sideDart: Math.max(sideDart, 0),
      dressLength: p.dressLength,
      notes: notes,
      dartTransfer: dartTransfer,
    };
  }

  global.PrincessDress = {
    DEFAULT_PARAMS: DEFAULT_PARAMS,
    draftPrincessDress: draftPrincessDress,
    PIECE_GAP: PIECE_GAP,
    laidOutPanels: laidOutPanels,
    layoutShifts: layoutShifts,
    translate: translate,
    offsetClosed: offsetClosed,
    closeRing: closeRing,
    V: V,
  };
})(window);
