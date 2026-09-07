/* Served copy of ../../Export-DXF/dxf.js — edit Export-DXF/dxf.js, then copy here. See HOW-IT-WORKS.txt. */

(function (global) {
  "use strict";

  var MM = 10;
  var ACADVER = "AC1015";

  function xy(pt) {
    if (Array.isArray(pt)) return { x: pt[0], y: pt[1] };
    return { x: pt.x, y: pt.y };
  }

  function fmt(n) {
    return n.toFixed(4);
  }

  function pair(code, value) {
    return code + "\n" + value + "\n";
  }

  function grainlineOnPiece(outline) {
    if (!outline || outline.length < 2) return null;
    var minX = Infinity;
    var maxX = -Infinity;
    for (var i = 0; i < outline.length; i++) {
      if (outline[i].x < minX) minX = outline[i].x;
      if (outline[i].x > maxX) maxX = outline[i].x;
    }
    var x = (minX + maxX) / 2;
    var ring = outline.slice();
    if (outline[0].x !== outline[outline.length - 1].x || outline[0].y !== outline[outline.length - 1].y) {
      ring.push(outline[0]);
    }
    var hits = [];
    for (var i = 0; i < ring.length - 1; i++) {
      var a = ring[i];
      var b = ring[i + 1];
      if ((a.x - x) * (b.x - x) > 0) continue;
      if (Math.abs(b.x - a.x) < 1e-9) continue;
      var t = (x - a.x) / (b.x - a.x);
      if (t >= 0 && t <= 1) hits.push({ x: x, y: a.y + (b.y - a.y) * t });
    }
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
    return { a: { x: x, y: top - inset }, b: { x: x, y: bot + inset } };
  }

  function notchSegment(outline, pt, seam, offsetClosed) {
    var probe = Math.max(seam, 0.8);
    var outer = offsetClosed(outline, probe);
    if (!outer || !outer.length) return null;
    var best = outer[0];
    var bestD = Infinity;
    for (var i = 0; i < outer.length; i++) {
      var dx = outer[i].x - pt.x;
      var dy = outer[i].y - pt.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = outer[i];
      }
    }
    var nx = best.x - pt.x;
    var ny = best.y - pt.y;
    var len = Math.hypot(nx, ny);
    if (!len) return null;
    nx /= len;
    ny /= len;
    var outLen = seam > 0.05 ? Math.max(0.45, Math.min(0.7, seam * 0.7)) : 0.6;
    return {
      a: { x: pt.x - nx * 0.12, y: pt.y - ny * 0.12 },
      b: { x: pt.x + nx * outLen, y: pt.y + ny * outLen },
    };
  }

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

  function cubicBeziersFromKnots(points) {
    var pts = (points || []).map(xy);
    if (pts.length < 2) return [];
    if (pts.length === 2) {
      var a = pts[0];
      var b = pts[1];
      return [
        [
          a,
          { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 },
          { x: a.x + (2 * (b.x - a.x)) / 3, y: a.y + (2 * (b.y - a.y) / 3 },
          b,
        ],
      ];
    }
    var t = [0];
    for (var i = 0; i < pts.length - 1; i++) {
      t.push(t[t.length - 1] + Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y));
    }
    var xs = pts.map(function (p) { return p.x; });
    var ys = pts.map(function (p) { return p.y; });
    var mx = naturalSeconds(t, xs);
    var my = naturalSeconds(t, ys);
    var beziers = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var h = t[i + 1] - t[i];
      if (h < 1e-12) continue;
      var d0x = (xs[i + 1] - xs[i]) / h - (h * (2 * mx[i] + mx[i + 1])) / 6;
      var d1x = (xs[i + 1] - xs[i]) / h + (h * (mx[i] + 2 * mx[i + 1])) / 6;
      var d0y = (ys[i + 1] - ys[i]) / h - (h * (2 * my[i] + my[i + 1])) / 6;
      var d1y = (ys[i + 1] - ys[i]) / h + (h * (my[i] + 2 * my[i + 1])) / 6;
      var p0 = { x: xs[i], y: ys[i] };
      var p3 = { x: xs[i + 1], y: ys[i + 1] };
      beziers.push([
        p0,
        { x: p0.x + (d0x * h) / 3, y: p0.y + (d0y * h) / 3 },
        { x: p3.x - (d1x * h) / 3, y: p3.y - (d1y * h) / 3 },
        p3,
      ]);
    }
    return beziers;
  }

  function beziersFromSpans(spans) {
    var out = [];
    for (var i = 0; i < (spans || []).length; i++) {
      if (!spans[i] || spans[i].length < 2) continue;
      out = out.concat(cubicBeziersFromKnots(spans[i]));
    }
    return out;
  }

  function isLinearBezier(bez, eps) {
    eps = eps || 1e-6;
    var a = bez[0];
    var b = bez[3];
    var vx = b.x - a.x;
    var vy = b.y - a.y;
    var span = Math.hypot(vx, vy);
    if (span < eps) return true;
    function off(p) {
      return Math.abs((p.x - a.x) * vy - (p.y - a.y) * vx) / span;
    }
    return off(bez[1]) < eps && off(bez[2]) < eps;
  }

  function Dxf() {
    this._n = 0;
    this.model = "1";
  }

  Dxf.prototype.handle = function () {
    this._n += 1;
    return this._n.toString(16).toUpperCase();
  };

  Dxf.prototype.entityHead = function (etype, layer) {
    return (
      pair(0, etype) +
      pair(5, this.handle()) +
      pair(330, this.model) +
      pair(100, "AcDbEntity") +
      pair(8, layer)
    );
  };

  Dxf.prototype.line = function (layer, a, b) {
    a = xy(a);
    b = xy(b);
    return (
      this.entityHead("LINE", layer) +
      pair(100, "AcDbLine") +
      pair(10, fmt(a.x * MM)) +
      pair(20, fmt(a.y * MM)) +
      pair(30, "0.0") +
      pair(11, fmt(b.x * MM)) +
      pair(21, fmt(b.y * MM)) +
      pair(31, "0.0")
    );
  };

  Dxf.prototype.text = function (layer, pt, label, heightCm) {
    heightCm = heightCm === undefined ? 1 : heightCm;
    pt = xy(pt);
    return (
      this.entityHead("TEXT", layer) +
      pair(100, "AcDbText") +
      pair(10, fmt(pt.x * MM)) +
      pair(20, fmt(pt.y * MM)) +
      pair(30, "0.0") +
      pair(40, fmt(heightCm * MM)) +
      pair(1, String(label).toUpperCase()) +
      pair(7, "STANDARD")
    );
  };

  Dxf.prototype.polyline = function (layer, points, closed, bulge) {
    var pts = (points || []).map(xy);
    if (pts.length < 2) return "";
    if (
      closed &&
      pts.length > 2 &&
      pts[0].x === pts[pts.length - 1].x &&
      pts[0].y === pts[pts.length - 1].y
    ) {
      pts = pts.slice(0, -1);
    }
    var out =
      this.entityHead("LWPOLYLINE", layer) +
      pair(100, "AcDbPolyline") +
      pair(90, pts.length) +
      pair(70, closed ? 1 : 0);
    for (var i = 0; i < pts.length; i++) {
      out += pair(10, fmt(pts[i].x * MM)) + pair(20, fmt(pts[i].y * MM));
      if (bulge !== undefined && bulge !== null && i === 0) out += pair(42, fmt(bulge));
    }
    return out;
  };

  Dxf.prototype.spline = function (layer, beziers) {
    if (!beziers.length) return "";
    var ctrl = [beziers[0][0], beziers[0][1], beziers[0][2], beziers[0][3]];
    for (var i = 1; i < beziers.length; i++) {
      ctrl.push(beziers[i][1], beziers[i][2], beziers[i][3]);
    }
    var k = beziers.length;
    var knots = [0, 0, 0, 0];
    for (var i = 1; i < k; i++) knots.push(i, i, i);
    knots.push(k, k, k, k);
    var out =
      this.entityHead("SPLINE", layer) +
      pair(100, "AcDbSpline") +
      pair(70, 8) +
      pair(71, 3) +
      pair(72, knots.length) +
      pair(73, ctrl.length) +
      pair(74, 0) +
      pair(42, "0.0000001") +
      pair(43, "0.0000001");
    for (var i = 0; i < knots.length; i++) out += pair(40, fmt(knots[i]));
    for (var i = 0; i < ctrl.length; i++) {
      out += pair(10, fmt(ctrl[i].x * MM)) + pair(20, fmt(ctrl[i].y * MM)) + pair(30, "0.0");
    }
    return out;
  };

  Dxf.prototype.arcLwpolyline = function (layer, start, end, center) {
    start = xy(start);
    end = xy(end);
    center = xy(center);
    var a0 = Math.atan2(start.y - center.y, start.x - center.x);
    var a1 = Math.atan2(end.y - center.y, end.x - center.x);
    var da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    var bulge = Math.abs(da) > 1e-12 ? Math.tan(da / 4) : 0;
    return this.polyline(layer, [start, end], false, bulge);
  };

  Dxf.prototype.seam = function (seam) {
    var layer = String(seam.name || "STITCH").toUpperCase();
    var kind = seam.kind || "curve";
    var knots = seam.knots || [];
    var spans = seam.spans || [];
    if (kind === "arc" && seam.center) {
      var apts = knots.length ? knots : seam.points || [];
      if (apts.length < 2) return "";
      return this.arcLwpolyline(layer, apts[0], apts[apts.length - 1], seam.center);
    }
    if (kind === "line" || (!spans.length && knots.length === 2)) {
      var pts = knots.length ? knots : seam.points || [];
      if (pts.length < 2) return "";
      return this.line(layer, pts[0], pts[pts.length - 1]);
    }
    if (!spans.length) spans = knots.length >= 2 ? [knots] : [seam.points || []];
    var beziers = beziersFromSpans(spans);
    if (!beziers.length) return "";
    if (beziers.length === 1 && isLinearBezier(beziers[0])) {
      return this.line(layer, beziers[0][0], beziers[0][3]);
    }
    return this.spline(layer, beziers);
  };

  Dxf.prototype.emptyTable = function (name) {
    return (
      pair(0, "TABLE") +
      pair(2, name) +
      pair(5, this.handle()) +
      pair(330, "0") +
      pair(100, "AcDbSymbolTable") +
      pair(70, 0) +
      pair(0, "ENDTAB")
    );
  };

  Dxf.prototype.tableBegin = function (name, count) {
    var tableH = this.handle();
    var body =
      pair(0, "TABLE") +
      pair(2, name) +
      pair(5, tableH) +
      pair(330, "0") +
      pair(100, "AcDbSymbolTable") +
      pair(70, count);
    return { body: body, handle: tableH };
  };

  Dxf.prototype.blockDef = function (record, name) {
    return (
      pair(0, "BLOCK") +
      pair(5, this.handle()) +
      pair(330, record) +
      pair(100, "AcDbEntity") +
      pair(8, "0") +
      pair(100, "AcDbBlockBegin") +
      pair(2, name) +
      pair(70, 0) +
      pair(10, "0.0") +
      pair(20, "0.0") +
      pair(30, "0.0") +
      pair(3, name) +
      pair(1, "") +
      pair(0, "ENDBLK") +
      pair(5, this.handle()) +
      pair(330, record) +
      pair(100, "AcDbEntity") +
      pair(8, "0") +
      pair(100, "AcDbBlockEnd")
    );
  };

  function grainEnds(grain) {
    if (!grain) return null;
    if (grain.a && grain.b) return grain;
    if (grain[0] && grain[1]) return { a: xy(grain[0]), b: xy(grain[1]) };
    return null;
  }

  function notchEnds(n) {
    if (n.a && n.b) return n;
    return { a: xy(n[0]), b: xy(n[1]) };
  }

  function fromPieces(pieces) {
    var dxf = new Dxf();
    var seamLayers = [];
    for (var i = 0; i < pieces.length; i++) {
      var ss = pieces[i].seams || [];
      for (var s = 0; s < ss.length; s++) {
        var nm = String(ss[s].name || "").toUpperCase();
        if (nm && seamLayers.indexOf(nm) < 0) seamLayers.push(nm);
      }
    }
    var layerDefs = [
      ["0", 7],
      ["CUT", 7],
      ["STITCH", 8],
      ["GRAIN", 4],
      ["NOTCH", 1],
      ["NAME", 7],
    ];
    for (var i = 0; i < seamLayers.length; i++) layerDefs.push([seamLayers[i], 8]);

    var hRoot = dxf.handle();
    var hGroup = dxf.handle();
    var ltypeTab = dxf.tableBegin("LTYPE", 3);
    var hByblock = dxf.handle();
    var hBylayer = dxf.handle();
    var hContinuous = dxf.handle();
    var layerTab = dxf.tableBegin("LAYER", layerDefs.length);
    var layerHandles = [];
    for (var i = 0; i < layerDefs.length; i++) layerHandles.push(dxf.handle());
    var styleTab = dxf.tableBegin("STYLE", 1);
    var hStandard = dxf.handle();
    var appidTab = dxf.tableBegin("APPID", 1);
    var hAcad = dxf.handle();
    var dimTab = dxf.tableBegin("DIMSTYLE", 1);
    var hDimstd = dxf.handle();
    var blkTab = dxf.tableBegin("BLOCK_RECORD", 2);
    var hModel = dxf.handle();
    var hPaper = dxf.handle();
    dxf.model = hModel;

    function ltype(handle, name, desc) {
      return (
        pair(0, "LTYPE") +
        pair(5, handle) +
        pair(330, ltypeTab.handle) +
        pair(100, "AcDbSymbolTableRecord") +
        pair(100, "AcDbLinetypeTableRecord") +
        pair(2, name) +
        pair(70, 0) +
        pair(3, desc) +
        pair(72, 65) +
        pair(73, 0) +
        pair(40, "0.0")
      );
    }

    function layerRec(handle, name, color) {
      return (
        pair(0, "LAYER") +
        pair(5, handle) +
        pair(330, layerTab.handle) +
        pair(100, "AcDbSymbolTableRecord") +
        pair(100, "AcDbLayerTableRecord") +
        pair(2, name) +
        pair(70, 0) +
        pair(62, color) +
        pair(6, "CONTINUOUS")
      );
    }

    function blockRec(handle, name) {
      return (
        pair(0, "BLOCK_RECORD") +
        pair(5, handle) +
        pair(330, blkTab.handle) +
        pair(100, "AcDbSymbolTableRecord") +
        pair(100, "AcDbBlockTableRecord") +
        pair(2, name)
      );
    }

    var entities = "";
    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i];
      var seams = piece.seams || [];
      if (seams.length) {
        for (var s = 0; s < seams.length; s++) entities += dxf.seam(seams[s]);
      } else if (piece.outline && piece.outline.length) {
        entities += dxf.polyline("STITCH", piece.outline, true);
      }
      if (piece.cut && piece.cut.length) entities += dxf.polyline("CUT", piece.cut, true);
      var grain = grainEnds(piece.grain);
      if (grain) entities += dxf.line("GRAIN", grain.a, grain.b);
      var notches = piece.notches || [];
      for (var n = 0; n < notches.length; n++) {
        var seg = notchEnds(notches[n]);
        entities += dxf.line("NOTCH", seg.a, seg.b);
      }
      if (piece.name && piece.outline && piece.outline.length) {
        var xs = piece.outline.map(function (pt) { return pt.x; });
        var ys = piece.outline.map(function (pt) { return pt.y; });
        var mid = {
          x: (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2,
          y: (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2,
        };
        entities += dxf.text("NAME", mid, piece.name);
      }
    }

    var classes = pair(0, "SECTION") + pair(2, "CLASSES") + pair(0, "ENDSEC");
    var layerRows = "";
    for (var i = 0; i < layerDefs.length; i++) {
      layerRows += layerRec(layerHandles[i], layerDefs[i][0], layerDefs[i][1]);
    }
    var tables =
      pair(0, "SECTION") +
      pair(2, "TABLES") +
      dxf.emptyTable("VPORT") +
      ltypeTab.body +
      ltype(hByblock, "BYBLOCK", "") +
      ltype(hBylayer, "BYLAYER", "") +
      ltype(hContinuous, "CONTINUOUS", "Solid line") +
      pair(0, "ENDTAB") +
      layerTab.body +
      layerRows +
      pair(0, "ENDTAB") +
      styleTab.body +
      pair(0, "STYLE") +
      pair(5, hStandard) +
      pair(330, styleTab.handle) +
      pair(100, "AcDbSymbolTableRecord") +
      pair(100, "AcDbTextStyleTableRecord") +
      pair(2, "STANDARD") +
      pair(70, 0) +
      pair(40, "0.0") +
      pair(41, "1.0") +
      pair(50, "0.0") +
      pair(71, 0) +
      pair(42, "1.0") +
      pair(3, "txt") +
      pair(4, "") +
      pair(0, "ENDTAB") +
      dxf.emptyTable("VIEW") +
      dxf.emptyTable("UCS") +
      appidTab.body +
      pair(0, "APPID") +
      pair(5, hAcad) +
      pair(330, appidTab.handle) +
      pair(100, "AcDbSymbolTableRecord") +
      pair(100, "AcDbRegAppTableRecord") +
      pair(2, "ACAD") +
      pair(70, 0) +
      pair(0, "ENDTAB") +
      dimTab.body +
      pair(0, "DIMSTYLE") +
      pair(105, hDimstd) +
      pair(330, dimTab.handle) +
      pair(100, "AcDbSymbolTableRecord") +
      pair(100, "AcDbDimStyleTableRecord") +
      pair(2, "STANDARD") +
      pair(70, 0) +
      pair(0, "ENDTAB") +
      blkTab.body +
      blockRec(hModel, "*MODEL_SPACE") +
      blockRec(hPaper, "*PAPER_SPACE") +
      pair(0, "ENDTAB") +
      pair(0, "ENDSEC");
    var blocks =
      pair(0, "SECTION") +
      pair(2, "BLOCKS") +
      dxf.blockDef(hModel, "*MODEL_SPACE") +
      dxf.blockDef(hPaper, "*PAPER_SPACE") +
      pair(0, "ENDSEC");
    var ents = pair(0, "SECTION") + pair(2, "ENTITIES") + entities + pair(0, "ENDSEC");
    var objects =
      pair(0, "SECTION") +
      pair(2, "OBJECTS") +
      pair(0, "DICTIONARY") +
      pair(5, hRoot) +
      pair(330, "0") +
      pair(100, "AcDbDictionary") +
      pair(281, 1) +
      pair(3, "ACAD_GROUP") +
      pair(350, hGroup) +
      pair(0, "DICTIONARY") +
      pair(5, hGroup) +
      pair(330, hRoot) +
      pair(100, "AcDbDictionary") +
      pair(281, 1) +
      pair(0, "ENDSEC") +
      pair(0, "EOF");
    var header =
      pair(0, "SECTION") +
      pair(2, "HEADER") +
      pair(9, "$ACADVER") +
      pair(1, ACADVER) +
      pair(9, "$HANDSEED") +
      pair(5, (dxf._n + 1).toString(16).toUpperCase()) +
      pair(9, "$DWGCODEPAGE") +
      pair(3, "ANSI_1252") +
      pair(9, "$INSUNITS") +
      pair(70, 4) +
      pair(9, "$MEASUREMENT") +
      pair(70, 1) +
      pair(0, "ENDSEC");
    return header + classes + tables + blocks + ents + objects;
  }

  function piecesFromLaid(laid, seam, offsetClosed, closeRing) {
    var pieces = [];
    for (var i = 0; i < laid.length; i++) {
      var panel = laid[i];
      var outline = closeRing(panel.outline);
      var cut = seam > 0 ? closeRing(offsetClosed(panel.outline, seam)) : null;
      var grain = grainlineOnPiece(panel.outline);
      var notches = [];
      var pts = panel.notches || [];
      for (var n = 0; n < pts.length; n++) {
        var seg = notchSegment(panel.outline, pts[n], seam, offsetClosed);
        if (seg) notches.push(seg);
      }
      pieces.push({
        name: panel.name,
        outline: outline,
        cut: cut,
        grain: grain,
        notches: notches,
        seams: panel.seams || [],
      });
    }
    return pieces;
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: "application/dxf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  global.PatternDxf = {
    fromPieces: fromPieces,
    piecesFromLaid: piecesFromLaid,
    grainlineOnPiece: grainlineOnPiece,
    download: download,
  };
})(window);
