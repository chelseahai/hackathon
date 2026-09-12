/* AI-to-Garment Workflow Presentation Wireframe Logic
   Integrates the Math Dress Princess Line drafting engine and DXF export,
   with interactive placeholders for upstream Gemini measurement extraction,
   downstream CLO 3D simulation, and Gemini photorealistic try-on.
*/

(function () {
  'use strict';

  /* ==========================================================================
     STEP 01: GEMINI AI MEASUREMENT EXTRACTION (WIRE-FRAME INTERACTION)
     ========================================================================== */

  var SCAN_PROFILES = {
    standard: {
      name: 'Reference Body',
      bust: 84.0,
      backLength: 38.0,
      waist: 68.0,
      hip: 90.0,
      refScale: 'Standard A4 Marker (210 × 297 mm)',
      confidence: { bust: 99.2, backLength: 98.7, waist: 99.4, hip: 99.1 }
    },
    petite: {
      name: 'Profile B (Petite)',
      bust: 80.0,
      backLength: 36.0,
      waist: 62.0,
      hip: 86.0,
      refScale: 'Metric Ruler Calibration (30 cm)',
      confidence: { bust: 98.8, backLength: 97.9, waist: 98.9, hip: 98.6 }
    },
    curvy: {
      name: 'Profile C (Curvy)',
      bust: 96.0,
      backLength: 40.0,
      waist: 76.0,
      hip: 104.0,
      refScale: 'Standard A4 Marker (210 × 297 mm)',
      confidence: { bust: 99.5, backLength: 98.9, waist: 99.2, hip: 99.3 }
    }
  };

  var currentScan = SCAN_PROFILES.standard;

  function updateScanUI(profile) {
    currentScan = profile;
    document.getElementById('scanBust').textContent = profile.bust.toFixed(1) + ' cm';
    document.getElementById('scanBackLength').textContent = profile.backLength.toFixed(1) + ' cm';
    document.getElementById('scanWaist').textContent = profile.waist.toFixed(1) + ' cm';
    document.getElementById('scanHip').textContent = profile.hip.toFixed(1) + ' cm';

    document.getElementById('confBust').textContent = '(' + profile.confidence.bust + '% conf)';
    document.getElementById('confBackLength').textContent = '(' + profile.confidence.backLength + '% conf)';
    document.getElementById('confWaist').textContent = '(' + profile.confidence.waist + '% conf)';
    document.getElementById('confHip').textContent = '(' + profile.confidence.hip + '% conf)';

    document.getElementById('scanRefName').textContent = profile.refScale;

    // Update active preset button
    var buttons = document.querySelectorAll('.wf-preset-btn');
    buttons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.preset === profile.key);
    });
  }

  /* ==========================================================================
     STEP 02: PARAMETRIC PRINCESS LINE PATTERN DRAFTER (LIVE ENGINE)
     ========================================================================== */

  var STYLES = {
    stitch: {
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "0.8",
      "stroke-dasharray": "5 4",
      "vector-effect": "non-scaling-stroke",
    },
    cut: {
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "0.8",
      "vector-effect": "non-scaling-stroke",
    },
    grain: {
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "0.8",
      "vector-effect": "non-scaling-stroke",
    },
    notch: {
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "0.8",
      "vector-effect": "non-scaling-stroke",
    },
    grid: {
      fill: "none",
      stroke: "#262626",
      "stroke-width": "0.5",
      "vector-effect": "non-scaling-stroke",
    },
    construction: {
      fill: "none",
      stroke: "#707070",
      "stroke-width": "0.8",
      "stroke-dasharray": "5 4",
      "vector-effect": "non-scaling-stroke",
    },
    point: {
      fill: "#b3b3b3",
      stroke: "none",
    },
    label: {
      fill: "#ffffff",
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-family": "Poppins, sans-serif",
      "font-size": "1.8",
      "letter-spacing": "0.18",
    }
  };

  var sharesMap = {
    reference: [3 / 16, 4 / 16, 4 / 16, 5 / 16],
    princess: [0, 0.5, 0, 0.5],
    side: [0.5, 0, 0.5, 0],
    equal: [0.25, 0.25, 0.25, 0.25]
  };

  var drafterInputs = {
    bust: document.getElementById('wf-bust'),
    backLength: document.getElementById('wf-backLength'),
    waist: document.getElementById('wf-waist'),
    hip: document.getElementById('wf-hip'),
    dressLength: document.getElementById('wf-dressLength'),
    waistEase: document.getElementById('wf-waistEase'),
    hipEase: document.getElementById('wf-hipEase'),
    hemFullness: document.getElementById('wf-hemFullness'),
    distribution: document.getElementById('wf-distribution'),
    seamAllowance: document.getElementById('wf-seamAllowance')
  };

  var drafterOuts = {
    bust: document.getElementById('wf-bust-out'),
    backLength: document.getElementById('wf-backLength-out'),
    waist: document.getElementById('wf-waist-out'),
    hip: document.getElementById('wf-hip-out'),
    dressLength: document.getElementById('wf-dressLength-out'),
    waistEase: document.getElementById('wf-waistEase-out'),
    hipEase: document.getElementById('wf-hipEase-out'),
    hemFullness: document.getElementById('wf-hemFullness-out'),
    seamAllowance: document.getElementById('wf-seamAllowance-out')
  };

  var displayToggles = {
    labels: document.getElementById('wf-toggle-labels'),
    grid: document.getElementById('wf-toggle-grid'),
    construction: document.getElementById('wf-toggle-construction')
  };

  var drawingSvg = document.getElementById('wf-drawing');
  var errorEl = document.getElementById('wf-drafter-error');
  var statsSummary = document.getElementById('wf-pattern-summary');

  function getDrafterParams() {
    return {
      bust: Number(drafterInputs.bust.value),
      backLength: Number(drafterInputs.backLength.value),
      waist: Number(drafterInputs.waist.value),
      hip: Number(drafterInputs.hip.value),
      dressLength: Number(drafterInputs.dressLength.value),
      waistEase: Number(drafterInputs.waistEase.value),
      hipEase: Number(drafterInputs.hipEase.value),
      hemFullness: Number(drafterInputs.hemFullness.value),
      hemDistribution: sharesMap[drafterInputs.distribution.value] || sharesMap.reference,
      seamAllowance: Number(drafterInputs.seamAllowance.value)
    };
  }

  function svgElem(tag, attrs, text) {
    var elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) {
      elem.setAttribute(k, attrs[k]);
    });
    if (text !== undefined) elem.textContent = text;
    return elem;
  }

  function renderPattern() {
    var params = getDrafterParams();

    // Update readout numbers
    drafterOuts.bust.textContent = params.bust.toFixed(1) + ' cm';
    drafterOuts.backLength.textContent = params.backLength.toFixed(1) + ' cm';
    drafterOuts.waist.textContent = params.waist.toFixed(1) + ' cm';
    drafterOuts.hip.textContent = params.hip.toFixed(1) + ' cm';
    drafterOuts.dressLength.textContent = params.dressLength.toFixed(1) + ' cm';
    drafterOuts.waistEase.textContent = params.waistEase.toFixed(1) + ' cm';
    drafterOuts.hipEase.textContent = params.hipEase.toFixed(1) + ' cm';
    drafterOuts.hemFullness.textContent = params.hemFullness.toFixed(1) + ' cm';
    drafterOuts.seamAllowance.textContent = params.seamAllowance.toFixed(1) + ' cm';

    var draft = PrincessDress.draftPrincessDress(params);
    if (draft.error) {
      drawingSvg.replaceChildren();
      errorEl.hidden = false;
      errorEl.textContent = draft.error;
      statsSummary.textContent = 'Unsupported geometry. Adjust measurements or ease.';
      document.getElementById('wf-export-dxf').disabled = true;
      document.getElementById('wf-send-to-clo').disabled = true;
      return;
    }

    errorEl.hidden = true;
    document.getElementById('wf-export-dxf').disabled = false;
    document.getElementById('wf-send-to-clo').disabled = false;

    // Derived stats readout
    var totalWaist = (2 * (draft.backWaist + draft.frontWaist)).toFixed(1);
    var totalHip = (2 * (draft.backHip + draft.frontHip)).toFixed(1);
    document.getElementById('stat-garment-waist').textContent = totalWaist + ' cm';
    document.getElementById('stat-garment-hip').textContent = totalHip + ' cm';
    document.getElementById('stat-back-dart').textContent = draft.backDart.toFixed(1) + ' cm';
    document.getElementById('stat-front-dart').textContent = draft.frontDart.toFixed(1) + ' cm';
    document.getElementById('stat-side-dart').textContent = draft.sideDart.toFixed(1) + ' cm';

    var family = (window.SilhouettePolicy && window.SilhouettePolicy.classify)
      ? window.SilhouettePolicy.classify(params).family
      : 'Fitted flare';
    document.getElementById('stat-silhouette').textContent = family;

    statsSummary.textContent = 'Garment waist ' + totalWaist + ' cm · garment hip ' + totalHip + ' cm · 4 calculated panels';

    // SVG Drawing
    var seam = params.seamAllowance;
    var laid = PrincessDress.laidOutPanels(draft, seam);

    // Compute bounding box
    var allPts = [];
    laid.forEach(function (panel) {
      panel.outline.forEach(function (pt) { allPts.push(pt); });
      if (panel.seamAllowance) {
        panel.seamAllowance.forEach(function (pt) { allPts.push(pt); });
      }
    });

    if (!allPts.length) return;
    var xs = allPts.map(function (p) { return p.x; });
    var ys = allPts.map(function (p) { return p.y; });
    var minX = Math.min.apply(null, xs) - 5;
    var maxX = Math.max.apply(null, xs) + 5;
    var minY = Math.min.apply(null, ys) - 5;
    var maxY = Math.max.apply(null, ys) + 5;
    var w = maxX - minX;
    var h = maxY - minY;

    drawingSvg.setAttribute('viewBox', minX + ' ' + (-maxY) + ' ' + w + ' ' + h);
    drawingSvg.replaceChildren();

    var showGrid = displayToggles.grid.getAttribute('aria-pressed') === 'true';
    var showLabels = displayToggles.labels.getAttribute('aria-pressed') === 'true';
    var showConst = displayToggles.construction.getAttribute('aria-pressed') === 'true';

    // Optional 1cm grid
    if (showGrid) {
      var gridG = svgElem('g', { class: 'grid' });
      var step = 5;
      for (var gx = Math.floor(minX / step) * step; gx <= maxX; gx += step) {
        gridG.appendChild(svgElem('line', Object.assign({ x1: gx, y1: -minY, x2: gx, y2: -maxY }, STYLES.grid)));
      }
      for (var gy = Math.floor(minY / step) * step; gy <= maxY; gy += step) {
        gridG.appendChild(svgElem('line', Object.assign({ x1: minX, y1: -gy, x2: maxX, y2: -gy }, STYLES.grid)));
      }
      drawingSvg.appendChild(gridG);
    }

    // Draw panels
    laid.forEach(function (panel) {
      var g = svgElem('g', { class: 'panel-' + panel.name });

      // Stitch line (pattern edge)
      var stitchPts = PrincessDress.closeRing(panel.outline).map(function (p) { return p.x + ',' + (-p.y); }).join(' ');
      g.appendChild(svgElem('polyline', Object.assign({ points: stitchPts }, STYLES.stitch)));

      // Seam allowance (cutting line)
      if (seam > 0 && panel.seamAllowance && panel.seamAllowance.length) {
        var cutPts = PrincessDress.closeRing(panel.seamAllowance).map(function (p) { return p.x + ',' + (-p.y); }).join(' ');
        g.appendChild(svgElem('polyline', Object.assign({ points: cutPts }, STYLES.cut)));
      }

      // Grainline
      var pxs = panel.outline.map(function (p) { return p.x; });
      var pys = panel.outline.map(function (p) { return p.y; });
      var midX = (Math.min.apply(null, pxs) + Math.max.apply(null, pxs)) / 2;
      var topY = Math.max.apply(null, pys) - 8;
      var botY = Math.min.apply(null, pys) + 8;
      g.appendChild(svgElem('line', Object.assign({ x1: midX, y1: -topY, x2: midX, y2: -botY }, STYLES.grain)));

      // Labels
      if (showLabels) {
        var midY = (topY + botY) / 2;
        g.appendChild(svgElem('text', Object.assign({ x: midX, y: -midY }, STYLES.label), panel.name));
      }

      // Construction lines & marks
      if (showConst && panel.construction) {
        panel.construction.forEach(function (poly) {
          var pts = poly.map(function (p) { return p.x + ',' + (-p.y); }).join(' ');
          g.appendChild(svgElem('polyline', Object.assign({ points: pts }, STYLES.construction)));
        });
      }

      drawingSvg.appendChild(g);
    });

    // Update Step 4 Prompt text to reflect active garment specs
    updateGeminiPrompt();
  }

  function bindDrafterEvents() {
    Object.keys(drafterInputs).forEach(function (key) {
      var el = drafterInputs[key];
      el.addEventListener('input', renderPattern);
    });

    Object.keys(displayToggles).forEach(function (key) {
      var btn = displayToggles[key];
      btn.addEventListener('click', function () {
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!pressed));
        renderPattern();
      });
    });

    document.getElementById('wf-reset-drafter').addEventListener('click', function () {
      drafterInputs.bust.value = 84;
      drafterInputs.backLength.value = 38;
      drafterInputs.waist.value = 68;
      drafterInputs.hip.value = 90;
      drafterInputs.dressLength.value = 50;
      drafterInputs.waistEase.value = 3;
      drafterInputs.hipEase.value = 4;
      drafterInputs.hemFullness.value = 32;
      drafterInputs.distribution.value = 'reference';
      drafterInputs.seamAllowance.value = 1;
      renderPattern();
    });

    document.getElementById('wf-export-dxf').addEventListener('click', function () {
      exportDxfFile();
    });

    document.getElementById('wf-send-to-clo').addEventListener('click', function () {
      exportDxfFile();
      var cloSection = document.getElementById('step-03');
      cloSection.scrollIntoView({ behavior: 'smooth' });
      var badge = document.getElementById('clo-status-badge');
      badge.textContent = 'Pattern received from Step 2: 4 cuttable panels compiled';
      badge.style.color = '#fff';
    });
  }

  function exportDxfFile() {
    var params = getDrafterParams();
    var draft = PrincessDress.draftPrincessDress(params);
    if (draft.error) return;
    var seam = params.seamAllowance;
    var laid = PrincessDress.laidOutPanels(draft, seam);
    var pieces = PatternDxf.piecesFromLaid(
      laid,
      seam,
      PrincessDress.offsetClosed,
      PrincessDress.closeRing
    );
    PatternDxf.download("princess-line-dress.dxf", PatternDxf.fromPieces(pieces));
  }

  /* ==========================================================================
     STEP 03: CLO 3D VIRTUAL TOILE SIMULATION (MOCKUP & INTERACTION)
     ========================================================================== */

  var TOILE_SVGS = {
    front: `
      <svg viewBox="0 0 240 440" class="clo-mesh">
        <defs>
          <linearGradient id="muslinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="60%" stop-color="#e8e8e8"/>
            <stop offset="100%" stop-color="#d0d0d0"/>
          </linearGradient>
        </defs>
        <!-- Avatar shadow -->
        <ellipse cx="120" cy="425" rx="55" ry="10" fill="#000" opacity="0.4"/>
        <!-- Neck & head indication -->
        <path d="M106 35 L106 72 Q120 76 134 72 L134 35 Z" fill="#2c2c2c"/>
        <circle cx="120" cy="30" r="16" fill="#2c2c2c"/>
        <!-- Draped White Muslin Toile -->
        <!-- Center Front Panels (Left + Right mirror) -->
        <path d="M106 72 Q120 77 134 72 L144 88 L136 148 Q132 185 130 220 L146 390 Q120 396 94 390 L110 220 Q108 185 104 148 L96 88 Z" fill="url(#muslinGrad)" stroke="#111" stroke-width="0.8"/>
        <!-- Princess Seams (Front Left & Front Right) -->
        <path d="M112 80 Q108 135 104 148 Q98 185 110 220 L94 390" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="3 2"/>
        <path d="M128 80 Q132 135 136 148 Q142 185 130 220 L146 390" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="3 2"/>
        <!-- Side Front Panels -->
        <path d="M96 88 L68 96 Q72 130 82 155 Q86 185 85 220 L58 388 Q76 390 94 390 L110 220 Q108 185 104 148 L96 88 Z" fill="#dedede" stroke="#111" stroke-width="0.8"/>
        <path d="M144 88 L172 96 Q168 130 158 155 Q154 185 155 220 L182 388 Q164 390 146 390 L130 220 Q132 185 136 148 L144 88 Z" fill="#d2d2d2" stroke="#111" stroke-width="0.8"/>
        <!-- Hemline & Stitch contours -->
        <path d="M58 388 Q120 405 182 388" fill="none" stroke="#111" stroke-width="1"/>
        <!-- Side Seams -->
        <path d="M68 96 Q72 130 82 155 Q86 185 85 220 L58 388" fill="none" stroke="#444" stroke-width="1"/>
        <path d="M172 96 Q168 130 158 155 Q154 185 155 220 L182 388" fill="none" stroke="#444" stroke-width="1"/>
        <!-- Bust Points -->
        <circle cx="104" cy="148" r="2.2" fill="#555"/>
        <circle cx="136" cy="148" r="2.2" fill="#555"/>
      </svg>
    `,
    side: `
      <svg viewBox="0 0 240 440" class="clo-mesh">
        <ellipse cx="120" cy="425" rx="45" ry="10" fill="#000" opacity="0.4"/>
        <path d="M110 38 L110 72 L128 72 L132 38 Z" fill="#2c2c2c"/>
        <circle cx="122" cy="30" r="16" fill="#2c2c2c"/>
        <!-- Side Profile Dress -->
        <path d="M110 72 L94 88 Q88 140 92 185 Q94 220 85 390 Q125 394 155 388 Q152 220 145 185 Q140 148 132 88 L128 72 Z" fill="#e2e2e2" stroke="#111" stroke-width="0.8"/>
        <!-- Side Seam -->
        <path d="M116 92 Q114 148 120 185 Q122 220 125 391" fill="none" stroke="#222" stroke-width="1.2" stroke-dasharray="4 3"/>
        <!-- Front Silhouette Bust Contour -->
        <path d="M132 88 Q155 145 145 185" fill="none" stroke="#111" stroke-width="1"/>
        <!-- Back Curve -->
        <path d="M94 88 Q82 140 92 185" fill="none" stroke="#111" stroke-width="1"/>
      </svg>
    `,
    back: `
      <svg viewBox="0 0 240 440" class="clo-mesh">
        <ellipse cx="120" cy="425" rx="55" ry="10" fill="#000" opacity="0.4"/>
        <path d="M106 35 L106 72 Q120 74 134 72 L134 35 Z" fill="#2c2c2c"/>
        <circle cx="120" cy="30" r="16" fill="#2c2c2c"/>
        <!-- Back Dress View -->
        <path d="M106 72 L134 72 L144 88 L136 148 Q132 185 130 220 L146 390 Q120 394 94 390 L110 220 Q108 185 104 148 L96 88 Z" fill="#e0e0e0" stroke="#111" stroke-width="0.8"/>
        <!-- Center Back Seam / Closure -->
        <path d="M120 73 L120 392" fill="none" stroke="#111" stroke-width="1.2"/>
        <!-- Back Princess Lines -->
        <path d="M108 80 Q112 145 110 220 L94 390" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="3 2"/>
        <path d="M132 80 Q128 145 130 220 L146 390" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="3 2"/>
        <!-- Side Back Panels -->
        <path d="M96 88 L68 96 Q72 130 82 155 Q86 185 85 220 L58 388 Q76 390 94 390 L110 220 Q108 185 104 148 L96 88 Z" fill="#d2d2d2" stroke="#111" stroke-width="0.8"/>
        <path d="M144 88 L172 96 Q168 130 158 155 Q154 185 155 220 L182 388 Q164 390 146 390 L130 220 Q132 185 136 148 L144 88 Z" fill="#c8c8c8" stroke="#111" stroke-width="0.8"/>
      </svg>
    `
  };

  var TENSION_OVERLAY = `
    <g class="tension-overlay" opacity="0.75">
      <!-- Waist ease tension band (soft blue = relaxed ease) -->
      <path d="M85 212 Q120 216 155 212 L155 228 Q120 232 85 228 Z" fill="#00aeff" opacity="0.35"/>
      <!-- Bust apex pressure distribution -->
      <circle cx="104" cy="148" r="14" fill="#00aeff" opacity="0.25"/>
      <circle cx="136" cy="148" r="14" fill="#00aeff" opacity="0.25"/>
      <!-- Hip line ease sweep -->
      <path d="M78 260 Q120 266 162 260 L164 274 Q120 280 76 274 Z" fill="#00aeff" opacity="0.2"/>
    </g>
  `;

  var currentToileAngle = 'front';
  var isTensionOn = false;

  function renderToile() {
    var host = document.getElementById('wf-toile-stage');
    var rawSvg = TOILE_SVGS[currentToileAngle] || TOILE_SVGS.front;
    if (isTensionOn) {
      // Inject tension overlay right before closing </svg>
      rawSvg = rawSvg.replace('</svg>', TENSION_OVERLAY + '</svg>');
    }
    host.innerHTML = rawSvg;

    document.querySelectorAll('.wf-view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.angle === currentToileAngle);
    });

    var tensionBtn = document.getElementById('wf-toggle-tension');
    tensionBtn.classList.toggle('active', isTensionOn);
    tensionBtn.setAttribute('aria-pressed', String(isTensionOn));
  }

  function bindCloEvents() {
    document.querySelectorAll('.wf-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentToileAngle = btn.dataset.angle;
        renderToile();
      });
    });

    document.getElementById('wf-toggle-tension').addEventListener('click', function () {
      isTensionOn = !isTensionOn;
      renderToile();
    });

    document.getElementById('wf-send-to-gen').addEventListener('click', function () {
      document.getElementById('step-04').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ==========================================================================
     STEP 04: GEMINI AI GENERATIVE DRESS TRY-ON (SPLIT COMPARISON & PROMPT)
     ========================================================================== */

  var FABRIC_CHOICES = {
    silk: {
      name: 'Raw Silk Dupioni',
      weight: 'Medium Crisp (140 gsm)',
      desc: 'Subtle slub texture, sculptural structure, crisp hem flare'
    },
    wool: {
      name: 'Structured Wool Crepe',
      weight: 'Tailored Heavy (280 gsm)',
      desc: 'Matte architectural drape, defined princess seams'
    },
    linen: {
      name: 'Japanese Cotton Linen',
      weight: 'Medium Slub (180 gsm)',
      desc: 'Organic matte drape, soft natural surface grain'
    },
    satin: {
      name: 'Sculptural Heavy Satin',
      weight: 'Formal Heavy (320 gsm)',
      desc: 'Subtle luster, pronounced light reflection along darts'
    }
  };

  var selectedFabric = FABRIC_CHOICES.silk;
  var selectedColor = 'Midnight Navy';

  function updateGeminiPrompt() {
    var params = getDrafterParams();
    var promptEl = document.getElementById('wf-prompt-text');
    if (!promptEl) return;

    var text =
`[Gemini Multimodal Try-On Engine]
• Reference Portrait: Subject from Step 1 (Bust ${params.bust}cm, Waist ${params.waist}cm, Hip ${params.hip}cm)
• Geometric Guide: 3D CLO White Muslin Toile from Step 3 (Princess Seams, Waist Ease ${params.waistEase}cm, Fullness ${params.hemFullness}cm)
• Target Garment: Fitted Princess Line Dress with continuous 4-panel vertical seamlines.
• Material Specification: ${selectedFabric.name} (${selectedFabric.weight}) in ${selectedColor}.
• Drape Physics: ${selectedFabric.desc}.
• Fitting Invariant: Preserve exact seam placement and drape flares from the mathematical pattern; no cloth penetration.
• Render Setup: Natural diffused daylight studio, 85mm portrait focal length, realistic fabric micro-texture and thread luster.`;

    promptEl.textContent = text;
  }

  function bindGenEvents() {
    // Split Screen Dragging
    var container = document.getElementById('wf-split-container');
    var renderLayer = document.getElementById('wf-render-layer');
    var handle = document.getElementById('wf-split-handle');
    var isDragging = false;

    function setSplit(percent) {
      percent = Math.max(5, Math.min(95, percent));
      renderLayer.style.width = percent + '%';
      handle.style.left = percent + '%';
    }

    handle.addEventListener('mousedown', function (e) {
      isDragging = true;
      e.preventDefault();
    });

    window.addEventListener('mouseup', function () {
      isDragging = false;
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var pct = (x / rect.width) * 100;
      setSplit(pct);
    });

    // Touch support for mobile
    handle.addEventListener('touchstart', function () {
      isDragging = true;
    });
    window.addEventListener('touchend', function () {
      isDragging = false;
    });
    window.addEventListener('touchmove', function (e) {
      if (!isDragging || !e.touches.length) return;
      var rect = container.getBoundingClientRect();
      var x = e.touches[0].clientX - rect.left;
      var pct = (x / rect.width) * 100;
      setSplit(pct);
    });

    // Fabric Swatches
    document.querySelectorAll('.wf-swatch-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.wf-swatch-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedFabric = FABRIC_CHOICES[btn.dataset.fabric] || FABRIC_CHOICES.silk;
        document.getElementById('wf-active-fabric-name').textContent = selectedFabric.name;
        updateGeminiPrompt();
        updateAiRenderGraphic();
      });
    });

    // Color Selector
    var colorSelect = document.getElementById('wf-color-select');
    if (colorSelect) {
      colorSelect.addEventListener('change', function () {
        selectedColor = this.value;
        updateGeminiPrompt();
        updateAiRenderGraphic();
      });
    }
  }

  function updateAiRenderGraphic() {
    var svg = document.getElementById('wf-ai-render-svg');
    if (!svg) return;

    var colorMap = {
      'Midnight Navy': '#121f3d',
      'Studio Ivory': '#e5e2da',
      'Crimson': '#521422',
      'Olive': '#2c3324',
      'Noir Charcoal': '#1c1c1c'
    };

    var dressFill = colorMap[selectedColor] || '#121f3d';
    var paths = svg.querySelectorAll('.dress-fill');
    paths.forEach(function (p) {
      p.setAttribute('fill', dressFill);
    });
  }

  /* ==========================================================================
     GLOBAL INIT & WIRING
     ========================================================================== */

  function init() {
    // 1. Preset buttons in Step 1
    document.querySelectorAll('.wf-preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.preset;
        var p = SCAN_PROFILES[key];
        p.key = key;
        updateScanUI(p);
      });
    });

    // 2. Transfer from Step 1 to Step 2
    document.getElementById('wf-send-to-drafter').addEventListener('click', function () {
      drafterInputs.bust.value = currentScan.bust;
      drafterInputs.backLength.value = currentScan.backLength;
      drafterInputs.waist.value = currentScan.waist;
      drafterInputs.hip.value = currentScan.hip;

      renderPattern();

      var drafterSection = document.getElementById('step-02');
      drafterSection.scrollIntoView({ behavior: 'smooth' });

      var notice = document.getElementById('wf-drafter-transfer-notice');
      notice.textContent = 'Loaded: ' + currentScan.name + ' (' + currentScan.bust + ' / ' + currentScan.backLength + ' / ' + currentScan.waist + ' / ' + currentScan.hip + ' cm)';
      notice.hidden = false;
      setTimeout(function () { notice.hidden = true; }, 4000);
    });

    // 3. Drafter events & initial render
    bindDrafterEvents();
    renderPattern();

    // 4. CLO 3D initial render
    bindCloEvents();
    renderToile();

    // 5. Generative try-on events
    bindGenEvents();
    updateGeminiPrompt();
    updateAiRenderGraphic();

    // Set standard profile active initially
    SCAN_PROFILES.standard.key = 'standard';
    updateScanUI(SCAN_PROFILES.standard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
