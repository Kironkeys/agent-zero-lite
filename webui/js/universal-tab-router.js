/**
 * Universal Tab Router
 * Smart routing system that sends Ghost outputs to the right tab
 */

class UniversalTabRouter {
    constructor() {
        this.tabs = {
            workspace: {
                iframe: 'workspace-browser-iframe',
                triggers: ['chart', 'graph', 'plot', 'data', 'csv', 'excel', 'analyze', 'visualize'],
                messageTypes: ['chart-data', 'visualization', 'data-analysis']
            },
            operations: {
                iframe: 'operations-browser-iframe', 
                triggers: ['browse', 'e2b', 'puppeteer', 'selenium', 'scrape', 'automate', 'click', 'navigate'],
                messageTypes: ['browser-action', 'e2b-command', 'automation']
            },
            slides: {
                iframe: 'slides-browser-iframe',
                triggers: ['presentation', 'slides', 'powerpoint', 'keynote', 'deck', 'pitch'],
                messageTypes: ['presentation-content', 'slide-data']
            },
            designs: {
                iframe: 'designs-browser-iframe',
                triggers: ['design', 'website', 'app', 'react', 'frontend', 'ui', 'ux', 'landing', 'webpage', 'tailwind', 'css', 'html'],
                messageTypes: ['preview-code', 'design-update', 'element-edit']
            }
        };
        
        this.activeTab = null;
        this.messageQueue = [];
        this.init();
    }

    init() {
        // Listen for Ghost messages
        this.setupGhostListener();
        
        // Listen for tab switches
        this.setupTabListener();
        
        // Monitor chat for context
        this.monitorChat();
        
        // Also periodically scan for markers (backup method)
        this.startPeriodicScan();
        
        console.log('[Universal Router] Initialized');
    }
    
    startPeriodicScan() {
        setInterval(() => {
            // Look for any text containing the markers
            const allText = document.body.innerText || document.body.textContent || '';
            
            if (allText.includes('[STATIC_PREVIEW_START]') && allText.includes('[STATIC_PREVIEW_END]')) {
                const match = allText.match(/\[STATIC_PREVIEW_START\]([\s\S]*?)\[STATIC_PREVIEW_END\]/);
                if (match && !this.lastProcessedHTML) {
                    const htmlCode = match[1].trim();
                    this.lastProcessedHTML = htmlCode.substring(0, 100); // Store first 100 chars as signature
                    console.log('[Universal Router] Periodic scan found preview!');
                    
                    // Directly set srcdoc for instant HTML rendering
                    const iframe = document.getElementById('designs-browser-iframe');
                    if (iframe) {
                        iframe.srcdoc = htmlCode;
                    }
                    this.switchToTab('designs');
                    
                    // Clear after 5 seconds to allow re-processing
                    setTimeout(() => {
                        this.lastProcessedHTML = null;
                    }, 5000);
                }
            }
        }, 2000); // Check every 2 seconds
    }

    /**
     * Analyze message and determine target tab
     */
    analyzeMessage(message) {
        if (!message) return null;
        
        const lowerMessage = typeof message === 'string' ? message.toLowerCase() : JSON.stringify(message).toLowerCase();
        
        // Check each tab's triggers
        for (const [tabName, config] of Object.entries(this.tabs)) {
            // Check keyword triggers
            const hasKeyword = config.triggers.some(trigger => 
                lowerMessage.includes(trigger)
            );
            
            if (hasKeyword) {
                console.log(`[Universal Router] Detected ${tabName} content`);
                return tabName;
            }
        }
        
        // Default routing based on content type
        if (lowerMessage.includes('<!doctype') || lowerMessage.includes('<html')) {
            return 'designs';
        }
        if (lowerMessage.includes('data:') || lowerMessage.includes('chart')) {
            return 'workspace';
        }
        if (lowerMessage.includes('slide') || lowerMessage.includes('## slide')) {
            return 'slides';
        }
        
        return null;
    }

    /**
     * Route message to appropriate tab
     */
    routeMessage(message, messageType = null) {
        // Determine target tab
        let targetTab = null;
        
        // First check explicit message type
        if (messageType) {
            for (const [tabName, config] of Object.entries(this.tabs)) {
                if (config.messageTypes.includes(messageType)) {
                    targetTab = tabName;
                    break;
                }
            }
        }
        
        // If no explicit type, analyze content
        if (!targetTab) {
            targetTab = this.analyzeMessage(message);
        }
        
        // If still no target, use active tab or default
        if (!targetTab) {
            targetTab = this.activeTab || 'workspace';
        }
        
        // Route to target tab
        this.sendToTab(targetTab, message, messageType);
        
        // Switch to that tab if significant content
        if (this.isSignificantContent(message)) {
            this.switchToTab(targetTab);
        }
    }

    /**
     * Send message to specific tab
     */
    sendToTab(tabName, message, messageType) {
        const config = this.tabs[tabName];
        if (!config) return;
        
        const iframe = document.getElementById(config.iframe);
        if (!iframe || !iframe.contentWindow) {
            console.warn(`[Universal Router] ${tabName} iframe not ready, queuing message`);
            this.messageQueue.push({ tab: tabName, message, messageType });
            return;
        }
        
        console.log(`[Universal Router] Routing to ${tabName}:`, messageType || 'content');
        
        // Send appropriate message format for each tab
        switch (tabName) {
            case 'designs':
                // For designs, directly set the srcdoc to render HTML
                if (message && message.includes('<!DOCTYPE') || message.includes('<html')) {
                    console.log('[Universal Router] Setting iframe srcdoc for HTML preview');
                    iframe.srcdoc = message;
                } else {
                    iframe.contentWindow.postMessage({
                        type: messageType || 'preview-code',
                        code: message
                    }, '*');
                }
                break;
                
            case 'workspace':
                iframe.contentWindow.postMessage({
                    type: messageType || 'chart-data',
                    data: message
                }, '*');
                break;
                
            case 'operations':
                iframe.contentWindow.postMessage({
                    type: messageType || 'browser-action',
                    action: message
                }, '*');
                break;
                
            case 'slides':
                iframe.contentWindow.postMessage({
                    type: messageType || 'slide-content',
                    content: message
                }, '*');
                break;
        }
    }

    /**
     * Switch to specific tab
     */
    switchToTab(tabName) {
        this.activeTab = tabName;
        
        // Find and click the tab button
        const tabButtons = {
            workspace: 'showWorkspaceContent',
            operations: 'showOperationsContent',
            slides: 'showSlidesContent',
            designs: 'showDesignContent'
        };
        
        const showFunction = window[tabButtons[tabName]];
        if (showFunction) {
            console.log(`[Universal Router] Switching to ${tabName} tab`);
            showFunction();
        }
    }

    /**
     * Check if content is significant enough to switch tabs
     */
    isSignificantContent(message) {
        if (!message) return false;
        
        // Check if it's substantial content
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        
        // Significant if:
        // - HTML page
        // - Chart data
        // - Presentation content
        // - Long content
        return messageStr.length > 100 || 
               messageStr.includes('<!doctype') ||
               messageStr.includes('data:') ||
               messageStr.includes('## slide');
    }

    /**
     * Monitor chat for context clues
     */
    monitorChat() {
        console.log('[Universal Router] Starting chat monitor...');
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Check the node and all its descendants
                        const checkNode = (element) => {
                            const text = element.textContent || '';
                            
                            // Look for static preview markers
                            if (text.includes('[STATIC_PREVIEW_START]') && text.includes('[STATIC_PREVIEW_END]')) {
                                console.log('[Universal Router] Found static preview markers!');
                                const match = text.match(/\[STATIC_PREVIEW_START\]([\s\S]*?)\[STATIC_PREVIEW_END\]/);
                                if (match) {
                                    const htmlCode = match[1].trim();
                                    console.log('[Universal Router] Extracting HTML, length:', htmlCode.length);
                                    this.sendToTab('designs', htmlCode, 'preview-code');
                                    this.switchToTab('designs');
                                    return true;
                                }
                            }
                            
                            // Check children
                            if (element.children) {
                                for (let child of element.children) {
                                    if (checkNode(child)) return true;
                                }
                            }
                            return false;
                        };
                        
                        checkNode(node);
                    }
                        
                        // Look for Ghost responses with specific patterns
                        
                        // Design patterns
                        if (text.includes('Created') && text.includes('app') ||
                            text.includes('Here\'s your') && text.includes('website') ||
                            text.includes('preview') && text.includes('design')) {
                            this.activeTab = 'designs';
                        }
                        
                        // Chart patterns
                        if (text.includes('chart') || text.includes('visualization') ||
                            text.includes('graph') || text.includes('data')) {
                            this.activeTab = 'workspace';
                        }
                        
                        // Browser automation patterns
                        if (text.includes('browser') || text.includes('navigating') ||
                            text.includes('clicking') || text.includes('scraping')) {
                            this.activeTab = 'operations';
                        }
                        
                        // Presentation patterns
                        if (text.includes('presentation') || text.includes('slides') ||
                            text.includes('deck')) {
                            this.activeTab = 'slides';
                        }
                        
                        // Check for actual code/content blocks
                        if (node.querySelector('pre code')) {
                            const codeContent = node.querySelector('pre code').textContent;
                            this.routeMessage(codeContent);
                        }
                    }
                });
            });
        });

        // Try multiple possible containers
        const possibleContainers = [
            document.querySelector('#messages'),
            document.querySelector('.chat-messages'), 
            document.querySelector('.message-container'),
            document.querySelector('[x-data]'), // Alpine.js component
            document.body // Fallback to entire body
        ].filter(Boolean);
        
        const containerToObserve = possibleContainers[0] || document.body;
        
        console.log('[Universal Router] Observing container:', containerToObserve.tagName, containerToObserve.className || containerToObserve.id);
        
        observer.observe(containerToObserve, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Setup Ghost message listener
     */
    setupGhostListener() {
        // Listen for direct messages from Ghost
        window.addEventListener('message', (event) => {
            // Route based on message type
            if (event.data.type) {
                this.routeMessage(event.data.content || event.data, event.data.type);
            }
        });
        
        // Process queued messages when iframes load
        setInterval(() => {
            if (this.messageQueue.length > 0) {
                const queue = [...this.messageQueue];
                this.messageQueue = [];
                
                queue.forEach(item => {
                    this.sendToTab(item.tab, item.message, item.messageType);
                });
            }
        }, 1000);
    }

    /**
     * Setup tab change listener
     */
    setupTabListener() {
        // Listen for tab changes to track active tab
        ['showWorkspaceContent', 'showOperationsContent', 'showSlidesContent', 'showDesignContent'].forEach(funcName => {
            const originalFunc = window[funcName];
            if (originalFunc) {
                window[funcName] = (...args) => {
                    const tabMap = {
                        showWorkspaceContent: 'workspace',
                        showOperationsContent: 'operations',
                        showSlidesContent: 'slides',
                        showDesignContent: 'designs'
                    };
                    this.activeTab = tabMap[funcName];
                    console.log(`[Universal Router] Active tab: ${this.activeTab}`);
                    return originalFunc.apply(window, args);
                };
            }
        });
    }

    /**
     * Manual route function for external calls
     */
    route(content, targetTab = null, messageType = null) {
        if (targetTab) {
            this.sendToTab(targetTab, content, messageType);
        } else {
            this.routeMessage(content, messageType);
        }
    }
}

// Initialize router
const universalRouter = new UniversalTabRouter();

// Make it globally available
window.universalRouter = universalRouter;

// Add a manual test function
window.testDesignPreview = function(html) {
    console.log('[Universal Router] Manual test triggered');
    if (!html) {
        html = `<!DOCTYPE html>
<html>
<head>
    <title>Test Design Tab</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-600 to-blue-600 min-h-screen flex items-center justify-center">
    <div class="text-center text-white">
        <h1 class="text-6xl font-bold mb-4">🎉 Design Tab Test!</h1>
        <p class="text-2xl mb-8">If you see this, it's working!</p>
        <button onclick="alert('Click works!')" class="bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold">
            Test Button
        </button>
    </div>
</body>
</html>`;
    }
    
    // Directly set the iframe srcdoc for instant rendering
    const iframe = document.getElementById('designs-browser-iframe');
    if (iframe) {
        iframe.srcdoc = html;
        universalRouter.switchToTab('designs');
        return 'HTML rendered in Design tab';
    }
    return 'Design iframe not found';
};

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalTabRouter;
}

console.log('[Universal Router] Ready to route messages to appropriate tabs');