# Gemini Multimodal Image Generation Fitting Tool

A standalone tool and interactive web interface to generate photographic fitting portraits from:
- **Input 1**: Picture(s) of a real human
- **Input 2**: Picture(s) of CLO 3D renders
- **Agentic Prompt**:
  > *"generate a fitting picture, white studio background, natrual soft lighting, person in input 1 is wearing the dress in input2 renders. The renders in INPUT 2 suggests more than the style of the garment but the fit as well."*

---

## 🚀 Quick Start

### 1. Launch the Web Interface (Zero Install)
Directly open `web/gemini-fitting.html` or `web/index.html` in any web browser.

### 2. Run with Local Python Server
Double-click `start.bat` (Windows) or run:
```bash
python gemini_fitting_tool.py --serve --port 8080
```
Then visit http://localhost:8080 in your browser.

### 3. Run as a Command-Line Tool (CLI)
```bash
python gemini_fitting_tool.py \
  --human web/assets/fitting/user_human_front.jpg \
  --clo web/assets/fitting/user_clo_front.png \
  --output my_fitting_result.png
```

---

## 🔑 API Key Configuration
- **Simulation / Demo Mode**: Works completely offline out of the box with sample inputs and pre-rendered high-fidelity fitting pictures.
- **Live Gemini API**: Set `GEMINI_API_KEY=your_key` in your environment, pass `--api-key your_key` in CLI, or enter it directly into the web interface.

---

## 📦 Package Contents
```
gemini-fitting-tool/
├── gemini_fitting_tool.py     # Python CLI, module, & HTTP server
├── start.bat                  # 1-click Windows launcher
├── start.sh                   # 1-click Linux/Mac launcher
├── README.md                  # Documentation
└── web/
    ├── gemini-fitting.html    # Standalone Web Interface
    ├── index.html             # Web Interface alias
    ├── gemini-fitting.css     # Dark CAD minimal styling
    ├── gemini-fitting.js      # Multimodal conditioning logic & split slider
    ├── styles.css             # Base design tokens
    └── assets/fitting/        # User human photos, CLO renders, & fitting results
```
