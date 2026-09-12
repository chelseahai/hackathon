// GDG AI Fashion Studio Application Logic
document.addEventListener('DOMContentLoaded', () => {

  // State
  let state = {
    currentStep: 1,
    activePresetId: 'preset-autumn-hourglass',
    apiKey: localStorage.getItem('gemini_api_key') || '',
    frontImageBase64: null,
    sideImageBase64: null,
    referenceType: 'A4',
    customWidth: 21.0,
    customHeight: 29.7,
    analysisData: null,
    presets: []
  };

  // DOM Elements
  const stepTabs = document.querySelectorAll('.step-tab');
  const stepSections = document.querySelectorAll('.step-section');
  const presetButtons = document.querySelectorAll('.btn-preset');
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiStatusText = document.getElementById('apiStatusText');

  // Modal
  const apiKeyModal = document.getElementById('apiKeyModal');
  const btnOpenApiKeyModal = document.getElementById('btnOpenApiKeyModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnSaveApiKey = document.getElementById('btnSaveApiKey');
  const apiKeyInput = document.getElementById('apiKeyInput');

  // File Inputs & Previews
  const frontFileInput = document.getElementById('frontFileInput');
  const sideFileInput = document.getElementById('sideFileInput');
  const frontDropzone = document.getElementById('frontDropzone');
  const sideDropzone = document.getElementById('sideDropzone');
  const frontPreview = document.getElementById('frontPreview');
  const sidePreview = document.getElementById('sidePreview');
  const frontDropzoneContent = document.getElementById('frontDropzoneContent');
  const sideDropzoneContent = document.getElementById('sideDropzoneContent');
  const btnClearFront = document.getElementById('btnClearFront');
  const btnClearSide = document.getElementById('btnClearSide');

  // Reference radios
  const refTypeRadios = document.querySelectorAll('input[name="refType"]');
  const customWidthInput = document.getElementById('customWidth');
  const customHeightInput = document.getElementById('customHeight');

  // Actions
  const btnRunAnalysis = document.getElementById('btnRunAnalysis');
  const btnRunText = document.getElementById('btnRunText');
  const analysisSpinner = document.getElementById('analysisSpinner');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnReRender = document.getElementById('btnReRender');
  const renderCanvasWrap = document.getElementById('renderCanvasWrap');
  const renderPromptInput = document.getElementById('renderPromptInput');

  // Init API status
  updateApiStatusUI();
  fetchPresetsAndInit();

  // 1. Navigation Jump Links & Scrollspy
  stepTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
      stepTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Scrollspy to highlight current stage as user scrolls
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 180;
    stepSections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        const id = sec.getAttribute('id');
        stepTabs.forEach(t => {
          t.classList.toggle('active', t.getAttribute('href') === `#${id}`);
        });
      }
    });
  });

  // 2. API Key Management
  btnOpenApiKeyModal.addEventListener('click', () => {
    apiKeyInput.value = state.apiKey;
    apiKeyModal.classList.remove('hidden');
  });

  function closeModal() {
    apiKeyModal.classList.add('hidden');
  }

  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  btnSaveApiKey.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    state.apiKey = key;
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    updateApiStatusUI();
    closeModal();
  });

  function updateApiStatusUI() {
    if (state.apiKey) {
      apiStatusBadge.classList.add('live');
      apiStatusText.textContent = 'Live Gemini API Connected';
    } else {
      apiStatusBadge.classList.remove('live');
      apiStatusText.textContent = 'Demo / Simulation Mode';
    }
  }

  // 3. Preset Selection
  async function fetchPresetsAndInit() {
    try {
      const res = await fetch('/api/presets');
      const json = await res.json();
      if (json.success && json.presets) {
        state.presets = json.presets;
        // Load default preset (Preset 1)
        loadPresetData(state.activePresetId);
      }
    } catch (e) {
      console.warn('Failed to load presets:', e);
    }
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetId = btn.dataset.preset;
      state.activePresetId = presetId;
      loadPresetData(presetId);
    });
  });

  function loadPresetData(presetId) {
    const preset = state.presets.find(p => p.id === presetId);
    if (!preset) return;

    state.analysisData = preset;
    state.referenceType = preset.referenceType;

    // Set radio selection
    refTypeRadios.forEach(radio => {
      radio.checked = radio.value === preset.referenceType;
      radio.closest('.ref-option').classList.toggle('active', radio.checked);
    });

    // Set front preview to preset lookbook photo
    if (preset.renderImageUrl) {
      frontPreview.src = preset.renderImageUrl;
      frontPreview.classList.remove('hidden');
      frontDropzoneContent.classList.add('hidden');
      btnClearFront.classList.remove('hidden');
    }

    // Set matching editorial prompt
    const prompts = {
      'preset-autumn-hourglass': 'A high-end studio editorial fashion photograph of a woman with an hourglass body profile wearing a tailored terracotta rust wrap midi dress with a defined belted waist, elegant V-neckline, soft flowing A-line skirt, luxury fabric drape, professional lookbook photography, studio lighting, clean minimalist background.',
      'preset-winter-pear': 'A high-end studio editorial fashion photograph of a woman with a pear-shaped body profile wearing an elegant royal cobalt blue boat-neck structured shoulder A-line midi dress. Flattering fit that balances shoulders and hips, clean modern tailoring, high-fashion catalog lighting, crisp details, minimalist grey studio background.',
      'preset-spring-rectangle': 'A high-end studio editorial fashion photograph of an athletic female model wearing an elegant bright coral pleated wrap dress with waist definition and tailored collar. Clean dynamic silhouette, modern couture styling, soft studio fashion lighting, clean minimal background.'
    };
    if (prompts[presetId]) {
      renderPromptInput.value = prompts[presetId];
    }

    renderAllOutputs(preset);
  }

  // 4. File Upload & Previews
  function handleImageUpload(file, isFront = true) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      if (isFront) {
        state.frontImageBase64 = base64;
        frontPreview.src = base64;
        frontPreview.classList.remove('hidden');
        frontDropzoneContent.classList.add('hidden');
        btnClearFront.classList.remove('hidden');
      } else {
        state.sideImageBase64 = base64;
        sidePreview.src = base64;
        sidePreview.classList.remove('hidden');
        sideDropzoneContent.classList.add('hidden');
        btnClearSide.classList.remove('hidden');
      }
      // Clear preset button highlight when custom image is uploaded
      presetButtons.forEach(b => b.classList.remove('active'));
      state.activePresetId = null;
    };
    reader.readAsDataURL(file);
  }

  frontFileInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0], true));
  sideFileInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0], false));

  btnClearFront.addEventListener('click', (e) => {
    e.stopPropagation();
    state.frontImageBase64 = null;
    frontFileInput.value = '';
    frontPreview.classList.add('hidden');
    frontDropzoneContent.classList.remove('hidden');
    btnClearFront.classList.add('hidden');
  });

  btnClearSide.addEventListener('click', (e) => {
    e.stopPropagation();
    state.sideImageBase64 = null;
    sideFileInput.value = '';
    sidePreview.classList.add('hidden');
    sideDropzoneContent.classList.remove('hidden');
    btnClearSide.classList.add('hidden');
  });

  // Reference options radio change
  refTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      refTypeRadios.forEach(r => r.closest('.ref-option').classList.remove('active'));
      radio.closest('.ref-option').classList.add('active');
      state.referenceType = radio.value;
    });
  });

  // 5. Run Analysis Pipeline
  btnRunAnalysis.addEventListener('click', async () => {
    try {
      analysisSpinner.classList.remove('hidden');
      btnRunText.textContent = 'Processing with Gemini Anthropometry...';
      btnRunAnalysis.disabled = true;

      const payload = {
        frontImage: state.frontImageBase64,
        sideImage: state.sideImageBase64,
        referenceType: state.referenceType,
        customWidth: parseFloat(customWidthInput.value) || 21.0,
        customHeight: parseFloat(customHeightInput.value) || 29.7,
        apiKey: state.apiKey,
        selectedPresetId: state.activePresetId
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Analysis failed');
      }

      state.analysisData = json.data;
      renderAllOutputs(json.data);

      // Smoothly scroll down to Stage 2: Body Dimensions
      document.getElementById('step-2')?.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      alert('Error running analysis: ' + err.message);
    } finally {
      analysisSpinner.classList.add('hidden');
      btnRunText.textContent = '🚀 Run End-to-End Gemini Pipeline';
      btnRunAnalysis.disabled = false;
    }
  });

  // 6. Render Outputs Across All Sections
  function renderAllOutputs(data) {
    if (!data) return;

    // Step 2: Body Dimensions
    const dims = data.dimensions || {};
    document.getElementById('bodyShapeBadge').textContent = `${dims.body_shape_type || 'Balanced'} Shape`;
    document.getElementById('confidenceScoreLabel').textContent = `Confidence: ${Math.round((dims.confidence_score || 0.92) * 100)}%`;
    
    document.getElementById('valHeight').innerHTML = `${dims.height_cm || 168.0} <span class="unit">cm</span>`;
    document.getElementById('valShoulder').innerHTML = `${dims.shoulder_width_cm || 39.5} <span class="unit">cm</span>`;
    document.getElementById('valChest').innerHTML = `${dims.chest_circumference_cm || 94.0} <span class="unit">cm</span>`;
    document.getElementById('valWaist').innerHTML = `${dims.waist_circumference_cm || 70.0} <span class="unit">cm</span>`;
    document.getElementById('valHip').innerHTML = `${dims.hip_circumference_cm || 98.0} <span class="unit">cm</span>`;
    document.getElementById('valInseam').innerHTML = `${dims.inseam_cm || 78.5} <span class="unit">cm</span>`;
    document.getElementById('valTorso').innerHTML = `${dims.torso_length_cm || 42.0} <span class="unit">cm</span>`;
    document.getElementById('valArm').innerHTML = `${dims.arm_length_cm || 58.0} <span class="unit">cm</span>`;

    // Step 3: Color Analysis
    const color = data.colorAnalysis || {};
    document.getElementById('seasonBadge').textContent = color.seasonal_palette || 'Seasonal Palette';
    document.getElementById('skinToneVal').textContent = color.skin_tone_category || 'Neutral Medium';
    document.getElementById('undertoneVal').textContent = color.undertone || 'Warm';
    document.getElementById('contrastVal').textContent = color.contrast_level || 'Medium';
    document.getElementById('seasonDesc').textContent = color.description || '';

    // Swatches
    const swatchContainer = document.getElementById('bestColorSwatches');
    swatchContainer.innerHTML = '';
    (color.best_colors || []).forEach(sw => {
      const card = document.createElement('div');
      card.className = 'swatch-card';
      card.innerHTML = `
        <div class="swatch-preview" style="background-color: ${sw.hex};"></div>
        <div class="swatch-info">
          <div class="swatch-name">${sw.name}</div>
          <div class="swatch-hex">${sw.hex}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        navigator.clipboard.writeText(sw.hex);
        const originalHex = card.querySelector('.swatch-hex').textContent;
        card.querySelector('.swatch-hex').textContent = '✓ Copied!';
        setTimeout(() => card.querySelector('.swatch-hex').textContent = originalHex, 1200);
      });
      swatchContainer.appendChild(card);
    });

    // Avoid Colors
    const avoidContainer = document.getElementById('avoidColorsList');
    avoidContainer.innerHTML = '';
    (color.avoid_colors || []).forEach(item => {
      const div = document.createElement('div');
      div.className = 'avoid-item';
      div.innerHTML = `<strong>${item.name || item}:</strong> ${item.reason || 'Unflattering light contrast'}`;
      avoidContainer.appendChild(div);
    });

    // Step 4: Silhouette & Styling
    const styling = data.styling || {};
    document.getElementById('silhouetteTitle').textContent = `👗 ${styling.silhouette_name || 'Tailored Silhouette'}`;
    const featList = document.getElementById('stylingKeyFeatures');
    featList.innerHTML = '';
    (styling.key_features || []).forEach(f => {
      const li = document.createElement('li');
      li.textContent = f;
      featList.appendChild(li);
    });
    document.getElementById('recommendedFabrics').textContent = styling.recommended_fabrics || '';
    document.getElementById('patternAdvice').textContent = styling.pattern_advice || '';

    // Step 5: Tech Pack Table
    const tbody = document.getElementById('techpackBody');
    tbody.innerHTML = '';
    (data.techPack || []).forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${row.pom}</strong></td>
        <td class="num-val">${row.bodyCm} cm</td>
        <td class="ease-val">+${row.easeCm} cm</td>
        <td class="num-val" style="color: #6366F1;"><strong>${row.garmentCm} cm</strong></td>
        <td class="num-val">±${row.tolCm} cm</td>
        <td class="text-muted">${row.notes || ''}</td>
      `;
      tbody.appendChild(tr);
    });

    // Step 6: Virtual Try-On Render Viewport
    const primaryColor = color.best_colors?.[0] || { name: 'Terracotta Rust', hex: '#C85A32' };
    document.getElementById('summarySilhouette').textContent = styling.silhouette_name || 'Tailored Wrap Midi';
    document.getElementById('summaryColor').textContent = `${primaryColor.name} (${primaryColor.hex})`;
    document.getElementById('summaryShoulder').textContent = `${data.techPack?.[0]?.garmentCm || 41.0} cm`;
    document.getElementById('summaryBust').textContent = `${data.techPack?.[1]?.garmentCm || 98.0} cm`;
    document.getElementById('summaryWaist').textContent = `${data.techPack?.[2]?.garmentCm || 73.0} cm`;
    document.getElementById('summaryLength').textContent = `${data.techPack?.[4]?.garmentCm || 112.0} cm`;

    // Trigger visual render
    triggerGarmentRender(data);
  }

  // 7. Garment Render Generation
  async function triggerGarmentRender(data) {
    try {
      renderCanvasWrap.innerHTML = '<div class="btn-spinner"></div>';
      const res = await fetch('/api/render-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisData: data,
          apiKey: state.apiKey,
          customStylePrompt: renderPromptInput.value
        })
      });

      const json = await res.json();
      if (json.success) {
        if (json.imageUrl) {
          renderCanvasWrap.innerHTML = `<img src="${json.imageUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Virtual Try-On Render">`;
          document.getElementById('renderEngineBadge').textContent = json.source === 'imagen-3.0' ? 'Imagen 3 Generative Render' : 'High-Fashion Lookbook Render';
        } else if (json.svgContent) {
          renderCanvasWrap.innerHTML = json.svgContent;
          document.getElementById('renderEngineBadge').textContent = 'Studio Drape Visualizer';
        }
      }
    } catch (e) {
      console.warn('Render error:', e);
      renderCanvasWrap.innerHTML = '<div class="text-muted">Unable to load render</div>';
    }
  }

  btnReRender.addEventListener('click', () => {
    if (state.analysisData) {
      triggerGarmentRender(state.analysisData);
    }
  });

  // 8. Tech Pack CSV & JSON Export
  btnExportCsv.addEventListener('click', () => {
    if (!state.analysisData?.techPack) return;
    const headers = ['Point of Measure (POM)', 'Body Dim (cm)', 'Design Ease (cm)', 'Garment Finished Spec (cm)', 'Tolerance (+/- cm)', 'Notes'];
    const rows = state.analysisData.techPack.map(r => [
      `"${r.pom}"`,
      r.bodyCm,
      r.easeCm,
      r.garmentCm,
      r.tolCm,
      `"${r.notes || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `techpack-${state.analysisData.dimensions?.body_shape_type || 'garment'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnExportJson.addEventListener('click', () => {
    if (!state.analysisData) return;
    const blob = new Blob([JSON.stringify(state.analysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fashion-spec-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

});
