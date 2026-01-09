/**
 * Font Compare - A single-page app for comparing web fonts
 */

// LocalStorage key
const STORAGE_KEY = 'fontCompare_customFonts';

// Application State
const state = {
    fontA: {
        family: 'system-ui',
        weight: 400,
        size: 48,
        italic: false,
        letterSpacing: 0
    },
    fontB: {
        family: 'Roboto',
        weight: 400,
        size: 48,
        italic: false,
        letterSpacing: 0
    },
    sampleText: 'The quick brown fox jumps over the lazy dog',
    characters: ['a', 'f', 'r', 't', 'c', 'G', 'Q', 'R', '1', '%'],
    customFonts: [] // Array of { name, url, type: 'css' | 'file' }
};

// Color constants
const COLORS = {
    fontA: { r: 0, g: 188, b: 212 },    // Cyan
    fontB: { r: 233, g: 30, b: 99 },     // Pink/Red
    overlap: { r: 0, g: 0, b: 0 }         // Black
};

// Canvas settings
const CANVAS_SIZE = 120;
const FONT_SIZE_RATIO = 0.7;

// DOM Elements
const elements = {
    // Font A controls
    fontASelect: document.getElementById('font-a-select'),
    fontAWeight: document.getElementById('font-a-weight'),
    fontAWeightValue: document.getElementById('font-a-weight-value'),
    fontASize: document.getElementById('font-a-size'),
    fontASizeValue: document.getElementById('font-a-size-value'),
    fontASpacing: document.getElementById('font-a-spacing'),
    fontASpacingValue: document.getElementById('font-a-spacing-value'),
    fontAItalic: document.getElementById('font-a-italic'),

    // Font B controls
    fontBSelect: document.getElementById('font-b-select'),
    fontBWeight: document.getElementById('font-b-weight'),
    fontBWeightValue: document.getElementById('font-b-weight-value'),
    fontBSize: document.getElementById('font-b-size'),
    fontBSizeValue: document.getElementById('font-b-size-value'),
    fontBSpacing: document.getElementById('font-b-spacing'),
    fontBSpacingValue: document.getElementById('font-b-spacing-value'),
    fontBItalic: document.getElementById('font-b-italic'),

    // Sample text
    sampleTextInput: document.getElementById('sample-text-input'),
    sampleLineA: document.getElementById('sample-line-a').querySelector('.sample-text'),
    sampleLineB: document.getElementById('sample-line-b').querySelector('.sample-text'),

    // Character comparison
    charSetInput: document.getElementById('char-set-input'),
    comparisonTbody: document.getElementById('comparison-tbody'),

    // Character modal
    charModal: document.getElementById('char-modal'),
    charModalClose: document.getElementById('modal-close'),
    charModalBody: document.getElementById('modal-body'),

    // Custom font modal
    addCustomFontBtn: document.getElementById('add-custom-font-btn'),
    customFontModal: document.getElementById('custom-font-modal'),
    customFontModalClose: document.getElementById('custom-font-modal-close'),
    customFontUrl: document.getElementById('custom-font-url'),
    customFontFetch: document.getElementById('custom-font-fetch'),
    customFontResults: document.getElementById('custom-font-results')
};

/**
 * Initialize the application
 */
async function init() {
    // Load custom fonts from localStorage
    await loadCustomFontsFromStorage();

    setupEventListeners();
    updateSampleText();

    // Wait for specific fonts to load before rendering comparison table
    try {
        await Promise.all([
            loadFontForCanvas(state.fontA),
            loadFontForCanvas(state.fontB)
        ]);
        updateComparisonTable();
    } catch (error) {
        console.error('Font loading error:', error);
        updateComparisonTable();
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Font A controls
    elements.fontASelect.addEventListener('change', async (e) => {
        state.fontA.family = e.target.value;
        updateSampleText();
        await loadFontForCanvas(state.fontA);
        updateComparisonTable();
    });

    elements.fontAWeight.addEventListener('input', (e) => {
        state.fontA.weight = parseInt(e.target.value);
        elements.fontAWeightValue.textContent = e.target.value;
        updateAll();
    });

    elements.fontASize.addEventListener('input', (e) => {
        state.fontA.size = parseInt(e.target.value);
        elements.fontASizeValue.textContent = e.target.value;
        updateSampleText();
    });

    elements.fontASpacing.addEventListener('input', (e) => {
        state.fontA.letterSpacing = parseFloat(e.target.value);
        elements.fontASpacingValue.textContent = e.target.value;
        updateSampleText();
    });

    elements.fontAItalic.addEventListener('change', (e) => {
        state.fontA.italic = e.target.checked;
        updateAll();
    });

    // Font B controls
    elements.fontBSelect.addEventListener('change', async (e) => {
        state.fontB.family = e.target.value;
        updateSampleText();
        await loadFontForCanvas(state.fontB);
        updateComparisonTable();
    });

    elements.fontBWeight.addEventListener('input', (e) => {
        state.fontB.weight = parseInt(e.target.value);
        elements.fontBWeightValue.textContent = e.target.value;
        updateAll();
    });

    elements.fontBSize.addEventListener('input', (e) => {
        state.fontB.size = parseInt(e.target.value);
        elements.fontBSizeValue.textContent = e.target.value;
        updateSampleText();
    });

    elements.fontBSpacing.addEventListener('input', (e) => {
        state.fontB.letterSpacing = parseFloat(e.target.value);
        elements.fontBSpacingValue.textContent = e.target.value;
        updateSampleText();
    });

    elements.fontBItalic.addEventListener('change', (e) => {
        state.fontB.italic = e.target.checked;
        updateAll();
    });

    // Sample text
    elements.sampleTextInput.addEventListener('input', debounce((e) => {
        state.sampleText = e.target.value;
        updateSampleText();
    }, 150));

    // Character set
    elements.charSetInput.addEventListener('input', debounce((e) => {
        parseCharacterSet(e.target.value);
        updateComparisonTable();
    }, 300));

    // Character modal
    elements.charModalClose.addEventListener('click', closeCharModal);
    elements.charModal.addEventListener('click', (e) => {
        if (e.target === elements.charModal) closeCharModal();
    });

    // Custom font modal
    elements.addCustomFontBtn.addEventListener('click', openCustomFontModal);
    elements.customFontModalClose.addEventListener('click', closeCustomFontModal);
    elements.customFontModal.addEventListener('click', (e) => {
        if (e.target === elements.customFontModal) closeCustomFontModal();
    });
    elements.customFontFetch.addEventListener('click', fetchAndDetectFont);

    // Keyboard escape to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.charModal.classList.contains('active')) closeCharModal();
            if (elements.customFontModal.classList.contains('active')) closeCustomFontModal();
        }
    });
}

// ============================================
// Custom Font Modal Functions
// ============================================

function openCustomFontModal() {
    elements.customFontUrl.value = '';
    elements.customFontResults.innerHTML = '';
    elements.customFontModal.classList.add('active');
    elements.customFontUrl.focus();
}

function closeCustomFontModal() {
    elements.customFontModal.classList.remove('active');
}

/**
 * Fetch URL and detect if it's CSS or a font file
 */
async function fetchAndDetectFont() {
    const url = elements.customFontUrl.value.trim();

    if (!url) {
        showFontError('Please enter a URL');
        return;
    }

    try {
        new URL(url);
    } catch {
        showFontError('Please enter a valid URL');
        return;
    }

    elements.customFontFetch.disabled = true;
    elements.customFontFetch.textContent = 'Loading...';
    elements.customFontResults.innerHTML = '<div class="custom-font-results loading">Fetching font...</div>';

    try {
        // Try to fetch the URL to check its content
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        // Check if content contains @font-face (CSS file)
        if (text.includes('@font-face')) {
            // Parse font-family names from CSS
            const fontNames = parseFontFamiliesFromCss(text);

            if (fontNames.length === 0) {
                showFontError('No font-family declarations found in CSS');
                showManualInput(url);
            } else {
                showFontResults(fontNames, url, 'css');
            }
        } else if (contentType.includes('font') ||
                   url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) {
            // It's a font file - ask for font name
            showManualInput(url);
        } else {
            // Unknown content type
            showFontError('Could not detect font type. Please provide the font name manually.');
            showManualInput(url);
        }
    } catch (error) {
        console.error('Failed to fetch URL:', error);

        // CORS might prevent fetching, try loading as CSS anyway
        showFontError('Could not fetch URL (might be CORS restricted). Please enter the font name manually.');
        showManualInput(url);
    } finally {
        elements.customFontFetch.disabled = false;
        elements.customFontFetch.textContent = 'Fetch Font';
    }
}

/**
 * Parse font-family names from CSS text
 */
function parseFontFamiliesFromCss(cssText) {
    const fontFamilies = new Set();

    // Match font-family in @font-face rules
    const fontFaceRegex = /@font-face\s*\{[^}]*font-family\s*:\s*(['"]?)([^'";]+)\1[^}]*\}/gi;
    let match;

    while ((match = fontFaceRegex.exec(cssText)) !== null) {
        const fontName = match[2].trim();
        if (fontName) {
            fontFamilies.add(fontName);
        }
    }

    // Also try a simpler pattern
    const simpleFontFamilyRegex = /font-family\s*:\s*(['"]?)([^'";,]+)\1/gi;
    while ((match = simpleFontFamilyRegex.exec(cssText)) !== null) {
        const fontName = match[2].trim();
        if (fontName && !fontName.includes('{') && !fontName.includes('}')) {
            fontFamilies.add(fontName);
        }
    }

    return Array.from(fontFamilies);
}

/**
 * Show detected font results
 */
function showFontResults(fontNames, url, type) {
    elements.customFontResults.innerHTML = '';

    fontNames.forEach(fontName => {
        const isAdded = state.customFonts.some(f => f.name === fontName);

        const item = document.createElement('div');
        item.className = 'font-result-item';
        item.innerHTML = `
            <div>
                <div class="font-result-name">${fontName}</div>
                <div class="font-result-preview" style="font-family: '${fontName}'">Aa Bb Cc 123</div>
            </div>
            <button class="add-font-btn ${isAdded ? 'added' : ''}" data-font="${fontName}" data-url="${url}" data-type="${type}">
                ${isAdded ? 'Added' : 'Add'}
            </button>
        `;

        if (!isAdded) {
            item.querySelector('.add-font-btn').addEventListener('click', async (e) => {
                await addCustomFont(fontName, url, type, e.target);
            });
        }

        elements.customFontResults.appendChild(item);
    });

    // Load the CSS so fonts are available for preview
    loadCssStylesheet(url);
}

/**
 * Show error message
 */
function showFontError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'custom-font-error';
    errorDiv.textContent = message;
    elements.customFontResults.innerHTML = '';
    elements.customFontResults.appendChild(errorDiv);
}

/**
 * Show manual font name input
 */
function showManualInput(url) {
    const manualDiv = document.createElement('div');
    manualDiv.className = 'custom-font-manual';
    manualDiv.innerHTML = `
        <label for="manual-font-name">Font name:</label>
        <input type="text" id="manual-font-name" placeholder="Enter exact font name">
        <button class="add-font-btn" id="manual-add-btn">Add Font</button>
    `;

    elements.customFontResults.appendChild(manualDiv);

    document.getElementById('manual-add-btn').addEventListener('click', async () => {
        const fontName = document.getElementById('manual-font-name').value.trim();
        if (!fontName) {
            alert('Please enter a font name');
            return;
        }
        await addCustomFont(fontName, url, 'unknown', document.getElementById('manual-add-btn'));
    });
}

/**
 * Add a custom font to both dropdowns and localStorage
 */
async function addCustomFont(fontName, url, type, button) {
    // Check if already added
    if (state.customFonts.some(f => f.name === fontName)) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Loading...';

    try {
        // Load the font
        if (type === 'css') {
            await loadCssStylesheet(url);
        } else {
            // Try to load as font file
            const fontFace = new FontFace(fontName, `url(${url})`);
            await fontFace.load();
            document.fonts.add(fontFace);
        }

        // Wait for font to be ready
        await document.fonts.ready;

        // Add to state
        state.customFonts.push({ name: fontName, url, type });

        // Save to localStorage
        saveCustomFontsToStorage();

        // Add to both dropdowns
        addFontToDropdowns(fontName);

        button.textContent = 'Added';
        button.classList.add('added');
    } catch (error) {
        console.error('Failed to add font:', error);
        button.disabled = false;
        button.textContent = 'Add';
        alert('Failed to load font. Please check the font name and URL.');
    }
}

/**
 * Load CSS stylesheet
 */
function loadCssStylesheet(url) {
    return new Promise((resolve) => {
        // Check if already loaded
        if (document.querySelector(`link[href="${url}"]`)) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.onload = () => {
            document.fonts.ready.then(resolve);
        };
        link.onerror = () => {
            // Resolve anyway - font might still work
            resolve();
        };
        document.head.appendChild(link);
    });
}

/**
 * Add font to both A and B dropdowns
 */
function addFontToDropdowns(fontName) {
    [elements.fontASelect, elements.fontBSelect].forEach(select => {
        // Check if already exists
        if (Array.from(select.options).some(opt => opt.value === fontName)) {
            return;
        }

        // Find or create Custom optgroup
        let customGroup = select.querySelector('optgroup[label="Custom"]');
        if (!customGroup) {
            customGroup = document.createElement('optgroup');
            customGroup.label = 'Custom';
            select.appendChild(customGroup);
        }

        const option = document.createElement('option');
        option.value = fontName;
        option.textContent = fontName;
        customGroup.appendChild(option);
    });
}

// ============================================
// localStorage Functions
// ============================================

function saveCustomFontsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customFonts));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

async function loadCustomFontsFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const fonts = JSON.parse(saved);
        if (!Array.isArray(fonts)) return;

        for (const font of fonts) {
            if (!font.name || !font.url) continue;

            try {
                // Load the font
                if (font.type === 'css') {
                    await loadCssStylesheet(font.url);
                } else {
                    const fontFace = new FontFace(font.name, `url(${font.url})`);
                    await fontFace.load();
                    document.fonts.add(fontFace);
                }

                // Add to state and dropdowns
                state.customFonts.push(font);
                addFontToDropdowns(font.name);
            } catch (error) {
                console.error(`Failed to load saved font ${font.name}:`, error);
            }
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
    }
}

// ============================================
// Character Set Functions
// ============================================

function parseCharacterSet(input) {
    if (input.includes(' ')) {
        // Space-separated: allows sequences like "the quick" or "a f r t"
        state.characters = input.split(' ')
            .filter(c => c.length > 0);
    } else {
        // No spaces: split into individual characters
        state.characters = input.split('').filter(c => c.length > 0);
    }
}

// ============================================
// Sample Text Functions
// ============================================

function updateSampleText() {
    const fontAStyle = buildFontStyle(state.fontA);
    const fontBStyle = buildFontStyle(state.fontB);

    elements.sampleLineA.style.cssText = fontAStyle;
    elements.sampleLineA.textContent = state.sampleText;

    elements.sampleLineB.style.cssText = fontBStyle;
    elements.sampleLineB.textContent = state.sampleText;
}

// Generic font families that should not be quoted in CSS
const GENERIC_FONT_FAMILIES = ['system-ui', 'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded'];

function formatFontFamily(family) {
    // Generic font families should not be quoted
    if (GENERIC_FONT_FAMILIES.includes(family)) {
        return family;
    }
    return `"${family}"`;
}

function buildFontStyle(fontConfig) {
    return `
        font-family: ${formatFontFamily(fontConfig.family)}, sans-serif;
        font-weight: ${fontConfig.weight};
        font-size: ${fontConfig.size}px;
        font-style: ${fontConfig.italic ? 'italic' : 'normal'};
        letter-spacing: ${fontConfig.letterSpacing}px;
    `;
}

// ============================================
// Comparison Table Functions
// ============================================

function updateComparisonTable() {
    elements.comparisonTbody.innerHTML = '';

    state.characters.forEach(char => {
        const row = createComparisonRow(char);
        elements.comparisonTbody.appendChild(row);
    });
}

function createComparisonRow(char) {
    const row = document.createElement('tr');

    const fontACanvas = renderCharacter(char, state.fontA, COLORS.fontA);
    const tdA = document.createElement('td');
    tdA.appendChild(fontACanvas);
    fontACanvas.addEventListener('click', () => openCharModal(char, 'a'));

    const overlayCanvas = renderOverlay(char, state.fontA, state.fontB);
    const tdOverlay = document.createElement('td');
    tdOverlay.appendChild(overlayCanvas);
    overlayCanvas.addEventListener('click', () => openCharModal(char, 'overlay'));

    const fontBCanvas = renderCharacter(char, state.fontB, COLORS.fontB);
    const tdB = document.createElement('td');
    tdB.appendChild(fontBCanvas);
    fontBCanvas.addEventListener('click', () => openCharModal(char, 'b'));

    row.appendChild(tdA);
    row.appendChild(tdOverlay);
    row.appendChild(tdB);

    return row;
}

// ============================================
// Canvas Rendering Functions
// ============================================

function renderCharacter(char, fontConfig, color) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const fontSize = CANVAS_SIZE * FONT_SIZE_RATIO;
    const fontStyle = fontConfig.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontConfig.weight} ${fontSize}px ${formatFontFamily(fontConfig.family)}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.fillStyle = 'black';
    ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
            data[i] = color.r;
            data[i + 1] = color.g;
            data[i + 2] = color.b;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function renderOverlay(char, fontConfigA, fontConfigB) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    const canvasA = document.createElement('canvas');
    canvasA.width = CANVAS_SIZE;
    canvasA.height = CANVAS_SIZE;
    const ctxA = canvasA.getContext('2d');

    const canvasB = document.createElement('canvas');
    canvasB.width = CANVAS_SIZE;
    canvasB.height = CANVAS_SIZE;
    const ctxB = canvasB.getContext('2d');

    const fontSize = CANVAS_SIZE * FONT_SIZE_RATIO;

    const fontStyleA = fontConfigA.italic ? 'italic' : 'normal';
    ctxA.font = `${fontStyleA} ${fontConfigA.weight} ${fontSize}px ${formatFontFamily(fontConfigA.family)}`;
    ctxA.textBaseline = 'middle';
    ctxA.textAlign = 'center';
    ctxA.fillStyle = 'black';
    ctxA.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    const fontStyleB = fontConfigB.italic ? 'italic' : 'normal';
    ctxB.font = `${fontStyleB} ${fontConfigB.weight} ${fontSize}px ${formatFontFamily(fontConfigB.family)}`;
    ctxB.textBaseline = 'middle';
    ctxB.textAlign = 'center';
    ctxB.fillStyle = 'black';
    ctxB.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    const dataA = ctxA.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    const dataB = ctxB.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    const outputData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const output = outputData.data;

    for (let i = 0; i < dataA.length; i += 4) {
        const alphaA = dataA[i + 3];
        const alphaB = dataB[i + 3];
        const presenceA = alphaA > 20;
        const presenceB = alphaB > 20;

        if (presenceA && presenceB) {
            output[i] = COLORS.overlap.r;
            output[i + 1] = COLORS.overlap.g;
            output[i + 2] = COLORS.overlap.b;
            output[i + 3] = Math.max(alphaA, alphaB);
        } else if (presenceA) {
            output[i] = COLORS.fontA.r;
            output[i + 1] = COLORS.fontA.g;
            output[i + 2] = COLORS.fontA.b;
            output[i + 3] = alphaA;
        } else if (presenceB) {
            output[i] = COLORS.fontB.r;
            output[i + 1] = COLORS.fontB.g;
            output[i + 2] = COLORS.fontB.b;
            output[i + 3] = alphaB;
        } else {
            output[i] = 0;
            output[i + 1] = 0;
            output[i + 2] = 0;
            output[i + 3] = 0;
        }
    }

    ctx.putImageData(outputData, 0, 0);
    return canvas;
}

function renderCharacterLarge(char, fontConfig, color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);

    const fontSize = size * FONT_SIZE_RATIO;
    const fontStyle = fontConfig.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontConfig.weight} ${fontSize}px ${formatFontFamily(fontConfig.family)}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.fillStyle = 'black';
    ctx.fillText(char, size / 2, size / 2);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
            data[i] = color.r;
            data[i + 1] = color.g;
            data[i + 2] = color.b;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function renderOverlayLarge(char, fontConfigA, fontConfigB, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const canvasA = document.createElement('canvas');
    canvasA.width = size;
    canvasA.height = size;
    const ctxA = canvasA.getContext('2d');

    const canvasB = document.createElement('canvas');
    canvasB.width = size;
    canvasB.height = size;
    const ctxB = canvasB.getContext('2d');

    const fontSize = size * FONT_SIZE_RATIO;

    const fontStyleA = fontConfigA.italic ? 'italic' : 'normal';
    ctxA.font = `${fontStyleA} ${fontConfigA.weight} ${fontSize}px ${formatFontFamily(fontConfigA.family)}`;
    ctxA.textBaseline = 'middle';
    ctxA.textAlign = 'center';
    ctxA.fillStyle = 'black';
    ctxA.fillText(char, size / 2, size / 2);

    const fontStyleB = fontConfigB.italic ? 'italic' : 'normal';
    ctxB.font = `${fontStyleB} ${fontConfigB.weight} ${fontSize}px ${formatFontFamily(fontConfigB.family)}`;
    ctxB.textBaseline = 'middle';
    ctxB.textAlign = 'center';
    ctxB.fillStyle = 'black';
    ctxB.fillText(char, size / 2, size / 2);

    const dataA = ctxA.getImageData(0, 0, size, size).data;
    const dataB = ctxB.getImageData(0, 0, size, size).data;
    const outputData = ctx.createImageData(size, size);
    const output = outputData.data;

    for (let i = 0; i < dataA.length; i += 4) {
        const alphaA = dataA[i + 3];
        const alphaB = dataB[i + 3];
        const presenceA = alphaA > 20;
        const presenceB = alphaB > 20;

        if (presenceA && presenceB) {
            output[i] = COLORS.overlap.r;
            output[i + 1] = COLORS.overlap.g;
            output[i + 2] = COLORS.overlap.b;
            output[i + 3] = Math.max(alphaA, alphaB);
        } else if (presenceA) {
            output[i] = COLORS.fontA.r;
            output[i + 1] = COLORS.fontA.g;
            output[i + 2] = COLORS.fontA.b;
            output[i + 3] = alphaA;
        } else if (presenceB) {
            output[i] = COLORS.fontB.r;
            output[i + 1] = COLORS.fontB.g;
            output[i + 2] = COLORS.fontB.b;
            output[i + 3] = alphaB;
        } else {
            output[i] = 0;
            output[i + 1] = 0;
            output[i + 2] = 0;
            output[i + 3] = 0;
        }
    }

    ctx.putImageData(outputData, 0, 0);
    return canvas;
}

// ============================================
// Character Modal Functions
// ============================================

function openCharModal(char, type) {
    elements.charModalBody.innerHTML = '';

    const scale = 2;
    const size = CANVAS_SIZE * scale;

    if (type === 'overlay') {
        const labels = ['Font A', 'Overlay', 'Font B'];
        const configs = [
            { fontConfig: state.fontA, color: COLORS.fontA },
            null,
            { fontConfig: state.fontB, color: COLORS.fontB }
        ];

        configs.forEach((config, index) => {
            const container = document.createElement('div');
            container.style.textAlign = 'center';

            const label = document.createElement('div');
            label.textContent = labels[index];
            label.style.marginBottom = '8px';
            label.style.fontWeight = '600';
            container.appendChild(label);

            let canvas;
            if (config) {
                canvas = renderCharacterLarge(char, config.fontConfig, config.color, size);
            } else {
                canvas = renderOverlayLarge(char, state.fontA, state.fontB, size);
            }
            container.appendChild(canvas);

            elements.charModalBody.appendChild(container);
        });
    } else {
        const container = document.createElement('div');
        container.style.textAlign = 'center';

        const fontConfig = type === 'a' ? state.fontA : state.fontB;
        const color = type === 'a' ? COLORS.fontA : COLORS.fontB;
        const label = document.createElement('div');
        label.textContent = type === 'a' ? 'Font A' : 'Font B';
        label.style.marginBottom = '8px';
        label.style.fontWeight = '600';
        container.appendChild(label);

        const canvas = renderCharacterLarge(char, fontConfig, color, size);
        container.appendChild(canvas);

        elements.charModalBody.appendChild(container);
    }

    elements.charModal.classList.add('active');
}

function closeCharModal() {
    elements.charModal.classList.remove('active');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Load a font for canvas rendering
 * Canvas requires fonts to be loaded before drawing, unlike CSS which handles this automatically
 */
async function loadFontForCanvas(fontConfig) {
    const fontStyle = fontConfig.italic ? 'italic' : 'normal';
    const fontSpec = `${fontStyle} ${fontConfig.weight} 48px "${fontConfig.family}"`;

    try {
        await document.fonts.load(fontSpec);
    } catch (error) {
        console.warn(`Could not load font: ${fontConfig.family}`, error);
    }
}

function updateAll() {
    updateSampleText();
    updateComparisonTable();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
