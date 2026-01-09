/**
 * Font Compare - A single-page app for comparing web fonts
 */

// Application State
const state = {
    fontA: {
        family: 'Inter',
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
    customFonts: new Map()
};

// Color constants
const COLORS = {
    fontA: { r: 0, g: 188, b: 212 },    // Cyan
    fontB: { r: 233, g: 30, b: 99 },     // Pink/Red
    overlap: { r: 0, g: 0, b: 0 }         // Black
};

// Canvas settings
const CANVAS_SIZE = 120;
const FONT_SIZE_RATIO = 0.7; // Character size relative to canvas

// DOM Elements
const elements = {
    // Font A controls
    fontASelect: document.getElementById('font-a-select'),
    fontAName: document.getElementById('font-a-name'),
    fontAUrl: document.getElementById('font-a-url'),
    fontALoad: document.getElementById('font-a-load'),
    fontAWeight: document.getElementById('font-a-weight'),
    fontAWeightValue: document.getElementById('font-a-weight-value'),
    fontASize: document.getElementById('font-a-size'),
    fontASizeValue: document.getElementById('font-a-size-value'),
    fontASpacing: document.getElementById('font-a-spacing'),
    fontASpacingValue: document.getElementById('font-a-spacing-value'),
    fontAItalic: document.getElementById('font-a-italic'),

    // Font B controls
    fontBSelect: document.getElementById('font-b-select'),
    fontBName: document.getElementById('font-b-name'),
    fontBUrl: document.getElementById('font-b-url'),
    fontBLoad: document.getElementById('font-b-load'),
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

    // Modal
    modal: document.getElementById('char-modal'),
    modalClose: document.getElementById('modal-close'),
    modalBody: document.getElementById('modal-body')
};

/**
 * Initialize the application
 */
async function init() {
    setupEventListeners();
    updateSampleText();

    // Wait for fonts to load before rendering comparison table
    try {
        await document.fonts.ready;
        updateComparisonTable();
    } catch (error) {
        console.error('Font loading error:', error);
        updateComparisonTable(); // Render anyway as fallback
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Font A controls
    elements.fontASelect.addEventListener('change', (e) => {
        state.fontA.family = e.target.value;
        updateAll();
    });

    elements.fontALoad.addEventListener('click', () => loadCustomFont('a'));

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
    elements.fontBSelect.addEventListener('change', (e) => {
        state.fontB.family = e.target.value;
        updateAll();
    });

    elements.fontBLoad.addEventListener('click', () => loadCustomFont('b'));

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

    // Modal
    elements.modalClose.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeModal();
        }
    });

    // Keyboard escape to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.classList.contains('active')) {
            closeModal();
        }
    });
}

/**
 * Load a custom font from URL (supports both CSS URLs and direct font file URLs)
 */
async function loadCustomFont(fontSlot) {
    const nameInput = fontSlot === 'a' ? elements.fontAName : elements.fontBName;
    const urlInput = fontSlot === 'a' ? elements.fontAUrl : elements.fontBUrl;
    const loadBtn = fontSlot === 'a' ? elements.fontALoad : elements.fontBLoad;
    const select = fontSlot === 'a' ? elements.fontASelect : elements.fontBSelect;

    const fontName = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!fontName) {
        alert('Please enter a font name');
        return;
    }

    if (!url) {
        alert('Please enter a font URL');
        return;
    }

    // Validate URL
    try {
        new URL(url);
    } catch {
        alert('Please enter a valid URL');
        return;
    }

    loadBtn.disabled = true;
    loadBtn.textContent = '...';

    try {
        // Detect if URL is a CSS file or direct font file
        const isCssUrl = url.includes('/css/') || url.includes('/css?') ||
                         url.endsWith('.css') || url.includes('fonts.googleapis.com');

        if (isCssUrl) {
            // Load CSS file by injecting a <link> element
            await loadFontFromCss(url, fontName);
        } else {
            // Load direct font file using FontFace API
            const fontFace = new FontFace(fontName, `url(${url})`);
            await fontFace.load();
            document.fonts.add(fontFace);
        }

        // Store custom font reference
        state.customFonts.set(fontName, url);

        // Add to select dropdown if not already present
        const existingOption = Array.from(select.options).find(opt => opt.value === fontName);
        if (!existingOption) {
            const option = document.createElement('option');
            option.value = fontName;
            option.textContent = fontName;
            select.appendChild(option);
        }
        select.value = fontName;

        // Update state
        if (fontSlot === 'a') {
            state.fontA.family = fontName;
        } else {
            state.fontB.family = fontName;
        }

        // Clear inputs
        nameInput.value = '';
        urlInput.value = '';

        // Wait a moment for fonts to be ready, then update
        await document.fonts.ready;
        updateAll();
    } catch (error) {
        console.error('Failed to load font:', error);
        alert('Failed to load font. Make sure the font name matches exactly and the URL is correct.');
    } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Load';
    }
}

/**
 * Load a font by injecting a CSS stylesheet link
 */
function loadFontFromCss(url, fontName) {
    return new Promise((resolve, reject) => {
        // Check if stylesheet already exists
        const existingLink = document.querySelector(`link[href="${url}"]`);
        if (existingLink) {
            resolve();
            return;
        }

        // Create and inject link element
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;

        link.onload = () => {
            // Wait for fonts to be ready
            document.fonts.ready.then(() => {
                // Check if the font is now available
                const testFont = `12px "${fontName}"`;
                if (document.fonts.check(testFont)) {
                    resolve();
                } else {
                    // Font might still be loading, wait a bit more
                    setTimeout(() => {
                        document.fonts.ready.then(resolve);
                    }, 500);
                }
            });
        };

        link.onerror = () => {
            reject(new Error('Failed to load CSS file'));
        };

        document.head.appendChild(link);
    });
}

/**
 * Parse the character set input
 */
function parseCharacterSet(input) {
    // Split by comma, or treat as individual characters if no commas
    if (input.includes(',')) {
        state.characters = input.split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0);
    } else {
        state.characters = input.split('').filter(c => c.trim().length > 0);
    }
}

/**
 * Update the sample text display
 */
function updateSampleText() {
    const fontAStyle = buildFontStyle(state.fontA);
    const fontBStyle = buildFontStyle(state.fontB);

    elements.sampleLineA.style.cssText = fontAStyle;
    elements.sampleLineA.textContent = state.sampleText;

    elements.sampleLineB.style.cssText = fontBStyle;
    elements.sampleLineB.textContent = state.sampleText;
}

/**
 * Build CSS font style string
 */
function buildFontStyle(fontConfig) {
    return `
        font-family: "${fontConfig.family}", sans-serif;
        font-weight: ${fontConfig.weight};
        font-size: ${fontConfig.size}px;
        font-style: ${fontConfig.italic ? 'italic' : 'normal'};
        letter-spacing: ${fontConfig.letterSpacing}px;
    `;
}

/**
 * Update the comparison table
 */
function updateComparisonTable() {
    elements.comparisonTbody.innerHTML = '';

    state.characters.forEach(char => {
        const row = createComparisonRow(char);
        elements.comparisonTbody.appendChild(row);
    });
}

/**
 * Create a comparison row for a character
 */
function createComparisonRow(char) {
    const row = document.createElement('tr');

    // Font A canvas
    const fontACanvas = renderCharacter(char, state.fontA, COLORS.fontA);
    const tdA = document.createElement('td');
    tdA.appendChild(fontACanvas);
    fontACanvas.addEventListener('click', () => openModal(char, 'a'));

    // Overlay canvas
    const overlayCanvas = renderOverlay(char, state.fontA, state.fontB);
    const tdOverlay = document.createElement('td');
    tdOverlay.appendChild(overlayCanvas);
    overlayCanvas.addEventListener('click', () => openModal(char, 'overlay'));

    // Font B canvas
    const fontBCanvas = renderCharacter(char, state.fontB, COLORS.fontB);
    const tdB = document.createElement('td');
    tdB.appendChild(fontBCanvas);
    fontBCanvas.addEventListener('click', () => openModal(char, 'b'));

    row.appendChild(tdA);
    row.appendChild(tdOverlay);
    row.appendChild(tdB);

    return row;
}

/**
 * Render a character on a canvas with the specified color
 */
function renderCharacter(char, fontConfig, color) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Set font
    const fontSize = CANVAS_SIZE * FONT_SIZE_RATIO;
    const fontStyle = fontConfig.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontConfig.weight} ${fontSize}px "${fontConfig.family}"`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Draw character in black first
    ctx.fillStyle = 'black';
    ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    // Get pixel data and colorize
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
            data[i] = color.r;
            data[i + 1] = color.g;
            data[i + 2] = color.b;
            // Keep alpha as is
        }
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
}

/**
 * Render an overlay comparison of two fonts
 */
function renderOverlay(char, fontConfigA, fontConfigB) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    // Create temporary canvases for each font
    const canvasA = document.createElement('canvas');
    canvasA.width = CANVAS_SIZE;
    canvasA.height = CANVAS_SIZE;
    const ctxA = canvasA.getContext('2d');

    const canvasB = document.createElement('canvas');
    canvasB.width = CANVAS_SIZE;
    canvasB.height = CANVAS_SIZE;
    const ctxB = canvasB.getContext('2d');

    // Render both characters
    const fontSize = CANVAS_SIZE * FONT_SIZE_RATIO;

    // Font A
    const fontStyleA = fontConfigA.italic ? 'italic' : 'normal';
    ctxA.font = `${fontStyleA} ${fontConfigA.weight} ${fontSize}px "${fontConfigA.family}"`;
    ctxA.textBaseline = 'middle';
    ctxA.textAlign = 'center';
    ctxA.fillStyle = 'black';
    ctxA.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    // Font B
    const fontStyleB = fontConfigB.italic ? 'italic' : 'normal';
    ctxB.font = `${fontStyleB} ${fontConfigB.weight} ${fontSize}px "${fontConfigB.family}"`;
    ctxB.textBaseline = 'middle';
    ctxB.textAlign = 'center';
    ctxB.fillStyle = 'black';
    ctxB.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    // Get pixel data
    const dataA = ctxA.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    const dataB = ctxB.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    const outputData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const output = outputData.data;

    // Process pixels
    for (let i = 0; i < dataA.length; i += 4) {
        const alphaA = dataA[i + 3];
        const alphaB = dataB[i + 3];

        // Threshold for pixel presence
        const presenceA = alphaA > 20;
        const presenceB = alphaB > 20;

        if (presenceA && presenceB) {
            // Both fonts have pixels here - show black (overlap)
            output[i] = COLORS.overlap.r;
            output[i + 1] = COLORS.overlap.g;
            output[i + 2] = COLORS.overlap.b;
            output[i + 3] = Math.max(alphaA, alphaB);
        } else if (presenceA) {
            // Only Font A - show cyan
            output[i] = COLORS.fontA.r;
            output[i + 1] = COLORS.fontA.g;
            output[i + 2] = COLORS.fontA.b;
            output[i + 3] = alphaA;
        } else if (presenceB) {
            // Only Font B - show pink/red
            output[i] = COLORS.fontB.r;
            output[i + 1] = COLORS.fontB.g;
            output[i + 2] = COLORS.fontB.b;
            output[i + 3] = alphaB;
        } else {
            // No pixels - transparent
            output[i] = 0;
            output[i + 1] = 0;
            output[i + 2] = 0;
            output[i + 3] = 0;
        }
    }

    ctx.putImageData(outputData, 0, 0);

    return canvas;
}

/**
 * Open the modal with enlarged character view
 */
function openModal(char, type) {
    elements.modalBody.innerHTML = '';

    const scale = 2; // Enlarge factor
    const size = CANVAS_SIZE * scale;

    if (type === 'overlay') {
        // Show all three views in modal
        const labels = ['Font A', 'Overlay', 'Font B'];
        const configs = [
            { fontConfig: state.fontA, color: COLORS.fontA },
            null, // Overlay
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

            elements.modalBody.appendChild(container);
        });
    } else {
        // Show single enlarged view
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

        elements.modalBody.appendChild(container);
    }

    elements.modal.classList.add('active');
}

/**
 * Close the modal
 */
function closeModal() {
    elements.modal.classList.remove('active');
}

/**
 * Render a character at a larger size
 */
function renderCharacterLarge(char, fontConfig, color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);

    const fontSize = size * FONT_SIZE_RATIO;
    const fontStyle = fontConfig.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontConfig.weight} ${fontSize}px "${fontConfig.family}"`;
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

/**
 * Render overlay at a larger size
 */
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
    ctxA.font = `${fontStyleA} ${fontConfigA.weight} ${fontSize}px "${fontConfigA.family}"`;
    ctxA.textBaseline = 'middle';
    ctxA.textAlign = 'center';
    ctxA.fillStyle = 'black';
    ctxA.fillText(char, size / 2, size / 2);

    const fontStyleB = fontConfigB.italic ? 'italic' : 'normal';
    ctxB.font = `${fontStyleB} ${fontConfigB.weight} ${fontSize}px "${fontConfigB.family}"`;
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

/**
 * Update all displays
 */
function updateAll() {
    updateSampleText();
    updateComparisonTable();
}

/**
 * Debounce utility function
 */
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
