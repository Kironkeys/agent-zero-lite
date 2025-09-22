/**
 * Ghost Browser Use Auto-Embedder
 * Automatically detects and embeds Browser Use URLs from Ghost responses
 * No polling, no SSE, no WebSockets - just smart detection
 */

class GhostBrowserEmbed {
    constructor() {
        this.currentUrl = null;
        this.container = null;
        this.initialized = false;
    }
    
    init(containerId = 'ghost-browser-embed') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Ghost Browser Embed: Container not found');
            return;
        }
        
        this.setupContainer();
        this.setupListeners();
        this.initialized = true;
        console.log('👻 Ghost Browser Embed initialized');
    }
    
    setupContainer() {
        this.container.innerHTML = `
            <div style="width: 100%; height: 100%; position: relative; background: #111;">
                <div id="ghost-browser-placeholder" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: #666;
                ">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;">👻</div>
                    <h3 style="color: #00ff00;">Browser Use Preview</h3>
                    <p>Waiting for Browser Use URL...</p>
                </div>
                <iframe id="ghost-browser-frame" 
                        style="width: 100%; height: 100%; border: none; display: none;"
                        allow="clipboard-read; clipboard-write">
                </iframe>
            </div>
        `;
    }
    
    setupListeners() {
        // Listen for Ghost message events
        document.addEventListener('ghost-message-received', (event) => {
            if (event.detail && event.detail.message) {
                this.checkForBrowserUrl(event.detail.message);
            }
        });
        
        // Listen for postMessage from parent/Ghost
        window.addEventListener('message', (event) => {
            if (event.data && typeof event.data === 'string') {
                this.checkForBrowserUrl(event.data);
            } else if (event.data && event.data.message) {
                this.checkForBrowserUrl(event.data.message);
            }
        });
        
        // Watch for DOM updates in message containers
        this.observeMessages();
    }
    
    observeMessages() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent || node.innerText;
                            if (text) {
                                this.checkForBrowserUrl(text);
                            }
                        }
                    });
                }
            });
        });
        
        // Find message containers to observe
        const containers = [
            '.message-content',
            '.ghost-message',
            '.assistant-message',
            '#messages',
            '.chat-messages'
        ];
        
        containers.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                observer.observe(el, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            });
        });
        
        // Also observe body as fallback
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false
        });
    }
    
    checkForBrowserUrl(text) {
        if (!text || typeof text !== 'string') return;
        
        // Patterns for Browser Use URLs
        const patterns = [
            /https:\/\/cloud\.browser-use\.com\/[^\s<>"]+/g,
            /https:\/\/browser-use\.com\/[^\s<>"]+/g,
            /https:\/\/[^\/]+\.browser-use\.com\/[^\s<>"]+/g
        ];
        
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                const url = matches[0];
                // Clean URL from any trailing characters
                const cleanUrl = url.replace(/[.,;:!?)}\]'"]+$/, '');
                
                if (this.isValidBrowserUrl(cleanUrl) && cleanUrl !== this.currentUrl) {
                    this.embedUrl(cleanUrl);
                    return;
                }
            }
        }
    }
    
    isValidBrowserUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.hostname.includes('browser-use.com');
        } catch {
            return false;
        }
    }
    
    embedUrl(url) {
        if (!this.initialized) {
            console.warn('Ghost Browser Embed not initialized');
            return;
        }
        
        this.currentUrl = url;
        
        const frame = document.getElementById('ghost-browser-frame');
        const placeholder = document.getElementById('ghost-browser-placeholder');
        
        if (frame && placeholder) {
            frame.src = url;
            frame.style.display = 'block';
            placeholder.style.display = 'none';
            
            console.log('✅ Browser Use embedded:', url);
            
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('ghost-browser-embedded', {
                detail: { url: url }
            }));
        }
    }
    
    clear() {
        const frame = document.getElementById('ghost-browser-frame');
        const placeholder = document.getElementById('ghost-browser-placeholder');
        
        if (frame && placeholder) {
            frame.src = '';
            frame.style.display = 'none';
            placeholder.style.display = 'block';
            this.currentUrl = null;
        }
    }
    
    refresh() {
        const frame = document.getElementById('ghost-browser-frame');
        if (frame && frame.src) {
            frame.src = frame.src;
        }
    }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ghostBrowserEmbed = new GhostBrowserEmbed();
    });
} else {
    window.ghostBrowserEmbed = new GhostBrowserEmbed();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GhostBrowserEmbed;
}