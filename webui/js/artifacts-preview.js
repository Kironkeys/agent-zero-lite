/**
 * Artifacts-Style Preview System (Like Claude.ai)
 * Pure browser-based preview with no backend execution
 */

class ArtifactsPreview {
    constructor() {
        this.currentCode = null;
        this.previewContainer = null;
    }

    init() {
        this.createPreviewUI();
        this.setupMessageListener();
    }

    createPreviewUI() {
        // Create preview container
        const container = document.createElement('div');
        container.id = 'artifacts-preview';
        container.innerHTML = `
            <div class="preview-header">
                <span class="preview-title">Preview</span>
                <div class="preview-actions">
                    <button id="preview-refresh" class="btn-icon">🔄</button>
                    <button id="preview-fullscreen" class="btn-icon">⛶</button>
                    <button id="preview-publish" class="btn-primary">Publish</button>
                    <button id="preview-deploy" class="btn-success">Deploy to Netlify</button>
                </div>
            </div>
            <div class="preview-frame-container">
                <iframe id="preview-iframe" sandbox="allow-scripts allow-forms"></iframe>
            </div>
        `;
        
        container.style.cssText = `
            position: fixed;
            right: 20px;
            top: 20px;
            bottom: 20px;
            width: 45%;
            background: #1a1a2e;
            border: 1px solid #2a2a3e;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 1000;
        `;
        
        document.body.appendChild(container);
        
        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            #artifacts-preview .preview-header {
                padding: 12px 16px;
                background: #0f0f1e;
                border-bottom: 1px solid #2a2a3e;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 12px 12px 0 0;
            }
            
            #artifacts-preview .preview-title {
                font-weight: 600;
                color: #e0e0e0;
            }
            
            #artifacts-preview .preview-actions {
                display: flex;
                gap: 8px;
            }
            
            #artifacts-preview .btn-icon {
                padding: 6px 10px;
                background: #2a2a3e;
                border: 1px solid #3a3a4e;
                color: #e0e0e0;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
            }
            
            #artifacts-preview .btn-primary {
                padding: 6px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
            }
            
            #artifacts-preview .btn-success {
                padding: 6px 16px;
                background: linear-gradient(135deg, #00d084 0%, #00a368 100%);
                border: none;
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
            }
            
            #artifacts-preview .preview-frame-container {
                flex: 1;
                padding: 16px;
                background: #0a0a0a;
                border-radius: 0 0 12px 12px;
            }
            
            #artifacts-preview #preview-iframe {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 8px;
                background: white;
            }
            
            .fullscreen-preview {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 10000 !important;
                border-radius: 0 !important;
            }
            
            .fullscreen-preview .preview-header {
                border-radius: 0 !important;
            }
            
            .fullscreen-preview .preview-frame-container {
                border-radius: 0 !important;
            }
        `;
        document.head.appendChild(styles);
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Refresh button
        document.getElementById('preview-refresh')?.addEventListener('click', () => {
            this.refreshPreview();
        });
        
        // Fullscreen button
        document.getElementById('preview-fullscreen')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Publish button (like Claude's publish)
        document.getElementById('preview-publish')?.addEventListener('click', () => {
            this.publishPreview();
        });
        
        // Deploy button
        document.getElementById('preview-deploy')?.addEventListener('click', () => {
            this.deployToNetlify();
        });
    }

    setupMessageListener() {
        // Listen for code from Ghost
        window.addEventListener('message', (e) => {
            if (e.data.type === 'preview-code') {
                this.renderCode(e.data.code);
            }
        });
    }

    renderCode(code) {
        this.currentCode = code;
        const iframe = document.getElementById('preview-iframe');
        
        if (!iframe) return;
        
        // If it's a React component or full HTML
        let htmlContent = code;
        
        // If code object with separate HTML/CSS/JS
        if (typeof code === 'object') {
            htmlContent = this.buildHTMLFromParts(code);
        }
        
        // Use srcdoc to render in iframe (like Claude Artifacts)
        iframe.srcdoc = htmlContent;
    }

    buildHTMLFromParts(code) {
        const { html, css, js, react } = code;
        
        // If React code, build a simple preview
        if (react) {
            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${css || ''}</style>
</head>
<body>
    ${this.convertReactToHTML(react)}
    <script>${js || ''}</script>
</body>
</html>`;
        }
        
        // Regular HTML/CSS/JS
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${css || ''}</style>
</head>
<body>
    ${html || '<h1>Preview</h1>'}
    <script>${js || ''}</script>
</body>
</html>`;
    }

    convertReactToHTML(reactCode) {
        // Simple React to HTML conversion for preview
        // In production, you'd use a proper JSX transformer
        let html = reactCode;
        
        // Basic conversions
        html = html.replace(/className=/g, 'class=');
        html = html.replace(/\{[^}]+\}/g, match => {
            // Simple expression evaluation
            if (match.includes('"') || match.includes("'")) {
                return match.slice(1, -1);
            }
            return 'dynamic-content';
        });
        
        return html;
    }

    refreshPreview() {
        if (this.currentCode) {
            this.renderCode(this.currentCode);
        }
    }

    toggleFullscreen() {
        const container = document.getElementById('artifacts-preview');
        container.classList.toggle('fullscreen-preview');
    }

    publishPreview() {
        // Like Claude's publish - opens in new tab/window
        const blob = new Blob([this.currentCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    deployToNetlify() {
        // Guide user through deployment
        const deploymentGuide = `
To deploy this app to Netlify:

1. Create a GitHub repository
2. Push this code to the repository
3. Connect your GitHub to Netlify
4. Select the repository
5. Click "Deploy site"

Your app will be live in seconds!

Would you like Ghost to help you with this process?
        `;
        
        // Send to Ghost chat
        const chatInput = document.querySelector('textarea, input[type="text"]');
        if (chatInput) {
            chatInput.value = "Help me deploy this app to Netlify";
            chatInput.focus();
        }
    }
}

// Initialize when ready
const artifactsPreview = new ArtifactsPreview();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => artifactsPreview.init());
} else {
    artifactsPreview.init();
}

// Export for Ghost to send code
window.showArtifactPreview = (code) => {
    artifactsPreview.renderCode(code);
};