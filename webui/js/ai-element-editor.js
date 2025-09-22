/**
 * AI Element Editor - Like Genspark
 * Allows clicking elements in preview and editing via AI
 */

class AIElementEditor {
    constructor() {
        this.selectedElement = null;
        this.previewFrame = null;
        this.elementPath = null;
        this.isSelecting = false;
    }

    init() {
        this.previewFrame = document.getElementById('preview-frame') || 
                           document.getElementById('designs-browser-iframe');
        
        if (this.previewFrame) {
            this.setupElementSelector();
            this.setupUI();
        }
    }

    setupUI() {
        // Create floating editor panel
        const editorPanel = document.createElement('div');
        editorPanel.id = 'ai-editor-panel';
        editorPanel.innerHTML = `
            <div class="editor-header">
                <span>🎯 Element Editor</span>
                <button id="toggle-selector" class="btn-small">Select Element</button>
            </div>
            <div id="selected-info" class="selected-info hidden">
                <div class="element-type">No element selected</div>
                <div class="element-preview"></div>
            </div>
            <div class="editor-input">
                <textarea id="ai-edit-prompt" placeholder="Tell AI how to modify this element..."></textarea>
                <button id="apply-edit" class="btn-primary">✨ Apply AI Edit</button>
            </div>
        `;
        
        editorPanel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 100px;
            width: 320px;
            background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
            border: 1px solid #2a2a3e;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            z-index: 10000;
            color: #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        
        document.body.appendChild(editorPanel);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #ai-editor-panel .editor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                font-weight: 600;
            }
            
            #ai-editor-panel .btn-small {
                padding: 6px 12px;
                background: #2a2a3e;
                border: 1px solid #3a3a4e;
                color: #e0e0e0;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            }
            
            #ai-editor-panel .btn-small:hover {
                background: #3a3a4e;
            }
            
            #ai-editor-panel .btn-small.active {
                background: #667eea;
                border-color: #667eea;
            }
            
            #ai-editor-panel .selected-info {
                background: #0a0a0a;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            #ai-editor-panel .selected-info.hidden {
                display: none;
            }
            
            #ai-editor-panel .element-type {
                font-size: 13px;
                color: #888;
                margin-bottom: 8px;
            }
            
            #ai-editor-panel .element-preview {
                font-size: 14px;
                color: #e0e0e0;
                max-height: 60px;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            #ai-editor-panel .editor-input {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            #ai-editor-panel textarea {
                background: #0a0a0a;
                border: 1px solid #2a2a3e;
                border-radius: 8px;
                padding: 10px;
                color: #e0e0e0;
                resize: vertical;
                min-height: 80px;
                font-size: 14px;
            }
            
            #ai-editor-panel .btn-primary {
                padding: 10px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
            }
            
            #ai-editor-panel .btn-primary:hover {
                opacity: 0.9;
            }
            
            .element-highlight {
                outline: 2px solid #667eea !important;
                outline-offset: 2px !important;
                cursor: pointer !important;
                position: relative !important;
            }
            
            .element-highlight::after {
                content: attr(data-element-type);
                position: absolute;
                top: -24px;
                left: 0;
                background: #667eea;
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                z-index: 10000;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        const toggleBtn = document.getElementById('toggle-selector');
        const applyBtn = document.getElementById('apply-edit');
        const promptInput = document.getElementById('ai-edit-prompt');
        
        toggleBtn.addEventListener('click', () => {
            this.isSelecting = !this.isSelecting;
            toggleBtn.classList.toggle('active', this.isSelecting);
            toggleBtn.textContent = this.isSelecting ? 'Stop Selecting' : 'Select Element';
            
            if (this.isSelecting) {
                this.enableElementSelection();
            } else {
                this.disableElementSelection();
            }
        });
        
        applyBtn.addEventListener('click', () => {
            const prompt = promptInput.value.trim();
            if (prompt && this.selectedElement) {
                this.applyAIEdit(prompt);
            }
        });
    }

    setupElementSelector() {
        // Wait for iframe to load
        this.previewFrame.addEventListener('load', () => {
            const doc = this.previewFrame.contentDocument || this.previewFrame.contentWindow.document;
            
            // Inject selector script into iframe
            const script = doc.createElement('script');
            script.textContent = `
                let selectedElement = null;
                let hoveredElement = null;
                
                function enableSelection() {
                    document.addEventListener('mouseover', handleHover);
                    document.addEventListener('click', handleClick);
                    document.body.style.cursor = 'crosshair';
                }
                
                function disableSelection() {
                    document.removeEventListener('mouseover', handleHover);
                    document.removeEventListener('click', handleClick);
                    document.body.style.cursor = 'default';
                    
                    if (hoveredElement) {
                        hoveredElement.classList.remove('element-highlight');
                    }
                }
                
                function handleHover(e) {
                    if (hoveredElement) {
                        hoveredElement.classList.remove('element-highlight');
                    }
                    
                    hoveredElement = e.target;
                    hoveredElement.classList.add('element-highlight');
                    
                    const tagName = hoveredElement.tagName.toLowerCase();
                    const className = hoveredElement.className;
                    const id = hoveredElement.id;
                    
                    let label = tagName;
                    if (id) label += '#' + id;
                    else if (className && typeof className === 'string') {
                        label += '.' + className.split(' ')[0];
                    }
                    
                    hoveredElement.setAttribute('data-element-type', label);
                }
                
                function handleClick(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    selectedElement = e.target;
                    
                    // Get element info
                    const elementInfo = {
                        tagName: selectedElement.tagName,
                        id: selectedElement.id,
                        className: selectedElement.className,
                        text: selectedElement.textContent.substring(0, 100),
                        path: getElementPath(selectedElement),
                        styles: window.getComputedStyle(selectedElement)
                    };
                    
                    // Send to parent frame
                    window.parent.postMessage({
                        type: 'element-selected',
                        element: elementInfo
                    }, '*');
                    
                    disableSelection();
                }
                
                function getElementPath(element) {
                    const path = [];
                    while (element && element.nodeType === Node.ELEMENT_NODE) {
                        let selector = element.tagName.toLowerCase();
                        if (element.id) {
                            selector += '#' + element.id;
                            path.unshift(selector);
                            break;
                        } else if (element.className && typeof element.className === 'string') {
                            selector += '.' + element.className.split(' ').join('.');
                        }
                        path.unshift(selector);
                        element = element.parentNode;
                    }
                    return path.join(' > ');
                }
                
                // Listen for commands from parent
                window.addEventListener('message', (e) => {
                    if (e.data.type === 'enable-selection') {
                        enableSelection();
                    } else if (e.data.type === 'disable-selection') {
                        disableSelection();
                    }
                });
            `;
            doc.head.appendChild(script);
            
            // Inject styles
            const style = doc.createElement('style');
            style.textContent = `
                .element-highlight {
                    outline: 2px solid #667eea !important;
                    outline-offset: 2px !important;
                    cursor: crosshair !important;
                }
            `;
            doc.head.appendChild(style);
        });
        
        // Listen for element selection
        window.addEventListener('message', (e) => {
            if (e.data.type === 'element-selected') {
                this.handleElementSelected(e.data.element);
            }
        });
    }

    enableElementSelection() {
        if (this.previewFrame.contentWindow) {
            this.previewFrame.contentWindow.postMessage({
                type: 'enable-selection'
            }, '*');
        }
    }

    disableElementSelection() {
        if (this.previewFrame.contentWindow) {
            this.previewFrame.contentWindow.postMessage({
                type: 'disable-selection'
            }, '*');
        }
    }

    handleElementSelected(element) {
        this.selectedElement = element;
        this.elementPath = element.path;
        
        // Update UI
        const selectedInfo = document.getElementById('selected-info');
        selectedInfo.classList.remove('hidden');
        
        const elementType = selectedInfo.querySelector('.element-type');
        const elementPreview = selectedInfo.querySelector('.element-preview');
        
        elementType.textContent = `Selected: ${element.tagName}${element.id ? '#' + element.id : ''}`;
        elementPreview.textContent = element.text;
        
        // Reset toggle button
        const toggleBtn = document.getElementById('toggle-selector');
        this.isSelecting = false;
        toggleBtn.classList.remove('active');
        toggleBtn.textContent = 'Select Element';
    }

    applyAIEdit(prompt) {
        if (!this.selectedElement || !this.elementPath) return;
        
        // Create Ghost prompt for editing
        const ghostPrompt = `
Edit the following element in the current app:
- Element: ${this.elementPath}
- Current text: "${this.selectedElement.text}"
- User request: "${prompt}"

Please update the file in /a0/outputs/current-app/ to make this change.
The preview will automatically reload after you save the file.
        `.trim();
        
        // Insert into Ghost's chat input
        const chatInput = document.querySelector('textarea, input[type="text"]');
        if (chatInput) {
            chatInput.value = ghostPrompt;
            
            // Trigger send
            const sendButton = document.querySelector('[type="submit"], .send-button');
            if (sendButton) {
                sendButton.click();
            }
        }
        
        // Clear the edit prompt
        document.getElementById('ai-edit-prompt').value = '';
    }
}

// Initialize when DOM is ready
const aiEditor = new AIElementEditor();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aiEditor.init());
} else {
    aiEditor.init();
}

window.aiElementEditor = aiEditor;