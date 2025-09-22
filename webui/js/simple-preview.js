/**
 * Simple Preview System - Like Genspark
 * No WebContainer needed - just iframe to local dev server
 */

class SimplePreview {
    constructor() {
        this.currentPort = 3000;
        this.previewFrame = null;
    }

    init() {
        // Find or create preview iframe
        this.previewFrame = document.getElementById('preview-frame');
        if (!this.previewFrame) {
            this.createPreviewFrame();
        }
        
        // Listen for preview triggers
        this.setupListeners();
    }

    createPreviewFrame() {
        const container = document.getElementById('designs-browser-iframe');
        if (container) {
            // Replace WebContainer iframe with simple preview
            container.src = 'about:blank';
            this.previewFrame = container;
        }
    }

    setupListeners() {
        // Listen for Ghost messages about app creation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.textContent && node.textContent.includes('npm run dev')) {
                        // Ghost started a dev server
                        setTimeout(() => {
                            this.loadPreview();
                        }, 3000); // Wait for server to start
                    }
                });
            });
        });

        const messages = document.querySelector('#messages');
        if (messages) {
            observer.observe(messages, { childList: true, subtree: true });
        }
    }

    loadPreview() {
        if (this.previewFrame) {
            // Simply point iframe to local dev server
            // Ghost's container should proxy this
            this.previewFrame.src = `http://localhost:${this.currentPort}`;
            console.log('Loading preview from local dev server');
            
            // Show in Design tab
            if (window.showDesignContent) {
                window.showDesignContent();
            }
        }
    }

    // Check if dev server is running
    async checkServer() {
        try {
            const response = await fetch(`http://localhost:${this.currentPort}`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Initialize
const simplePreview = new SimplePreview();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => simplePreview.init());
} else {
    simplePreview.init();
}

window.simplePreview = simplePreview;