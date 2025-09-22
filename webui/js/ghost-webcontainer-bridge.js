/**
 * Ghost-WebContainer Bridge
 * Connects Ghost's chat output to WebContainer preview system
 */

class GhostWebContainerBridge {
    constructor() {
        this.designFrame = null;
        this.lastDyadOutput = null;
        this.isProcessing = false;
        this.webContainerPrepared = false;
        this.designKeywords = [
            'create.*app', 'build.*app', 'make.*app',
            'create.*website', 'build.*website', 'make.*website',
            'create.*landing', 'build.*landing', 'make.*landing',
            'create.*page', 'build.*page', 'make.*page',
            'create.*component', 'build.*component', 'make.*component',
            'create.*react', 'build.*react', 'make.*react',
            'create.*ui', 'build.*ui', 'make.*ui',
            'create.*interface', 'build.*interface', 'make.*interface',
            'design', 'frontend', 'web.*app', 'user interface',
            'tailwind', 'css', 'html', 'javascript', 'typescript',
            'nextjs', 'next.js', 'vite', 'vue', 'angular', 'svelte'
        ];
    }

    /**
     * Initialize the bridge
     */
    init() {
        // Find design tab iframe
        this.findDesignFrame();
        
        // Listen for Ghost messages
        this.setupGhostListener();
        
        // Listen for design tab messages
        this.setupDesignListener();
        
        console.log('Ghost-WebContainer bridge initialized');
    }

    /**
     * Find the design tab iframe
     */
    findDesignFrame() {
        // Try to find design iframe by various methods
        const possibleSelectors = [
            '#designs-browser-iframe',  // Our actual iframe ID
            '#designFrame',
            'iframe[src*="design-webcontainer"]',
            'iframe[src*="design"]',
            '.design-tab iframe',
            'iframe[name="design"]'
        ];
        
        for (const selector of possibleSelectors) {
            const frame = document.querySelector(selector);
            if (frame) {
                this.designFrame = frame;
                console.log('Found design frame:', selector);
                break;
            }
        }
        
        // If not found, wait and retry
        if (!this.designFrame) {
            setTimeout(() => this.findDesignFrame(), 1000);
        }
    }

    /**
     * Setup listener for Ghost chat messages
     */
    setupGhostListener() {
        // Override or hook into Ghost's message handler
        const originalSendMessage = window.sendMessage || window.sendChatMessage;
        
        if (originalSendMessage) {
            window.sendMessage = window.sendChatMessage = (message) => {
                // Check for design intent BEFORE sending
                this.checkForDesignIntent(message);
                
                // Call original
                if (originalSendMessage) {
                    originalSendMessage.call(window, message);
                }
                
                // Check for Dyad output
                this.checkForDyadOutput(message);
            };
        }
        
        // Also intercept chat input to detect design intent
        this.setupChatInputMonitor();
        
        // Also monitor DOM for Ghost responses
        this.monitorChatResponses();
    }
    
    /**
     * Monitor chat input for design intent
     */
    setupChatInputMonitor() {
        // Find chat input elements
        const chatInputs = document.querySelectorAll('textarea, input[type="text"]');
        
        chatInputs.forEach(input => {
            // Monitor for Enter key or send button click
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    this.checkForDesignIntent(input.value);
                }
            });
        });
        
        // Also monitor send button clicks
        const sendButtons = document.querySelectorAll('[type="submit"], .send-button, button[onclick*="send"]');
        sendButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = document.querySelector('textarea, input[type="text"]');
                if (input && input.value) {
                    this.checkForDesignIntent(input.value);
                }
            });
        });
    }
    
    /**
     * Check if message indicates design intent
     */
    checkForDesignIntent(message) {
        if (!message || typeof message !== 'string') return;
        
        const lowerMessage = message.toLowerCase();
        
        // Check if any design keywords match
        const hasDesignIntent = this.designKeywords.some(keyword => {
            const regex = new RegExp(keyword, 'i');
            return regex.test(lowerMessage);
        });
        
        if (hasDesignIntent && !this.webContainerPrepared) {
            console.log('[Ghost-WebContainer Bridge] Design intent detected! Preloading WebContainer...');
            this.prepareWebContainer();
        }
    }
    
    /**
     * Prepare WebContainer in advance
     */
    prepareWebContainer() {
        if (this.webContainerPrepared) return;
        
        // Find and prepare the design frame
        this.findDesignFrame();
        
        // Show the design tab and load WebContainer
        if (window.showDesignContent) {
            window.showDesignContent();
        }
        
        // Send prepare message to iframe
        if (this.designFrame && this.designFrame.contentWindow) {
            console.log('[Ghost-WebContainer Bridge] Sending prepare message to WebContainer...');
            this.designFrame.contentWindow.postMessage({
                type: 'prepare-webcontainer',
                message: 'User is about to create a web application. Initializing WebContainer...'
            }, '*');
            
            this.webContainerPrepared = true;
            
            // Reset after 5 minutes if no Dyad output received
            setTimeout(() => {
                if (!this.lastDyadOutput) {
                    this.webContainerPrepared = false;
                    console.log('[Ghost-WebContainer Bridge] WebContainer preparation timeout, resetting...');
                }
            }, 300000);
        }
    }

    /**
     * Monitor chat responses for WebContainer files
     */
    monitorChatResponses() {
        // Create mutation observer for chat messages - using Ghost's actual structure
        const chatContainer = document.querySelector('#messages, .chat-messages, .message-container, .messages-container');
        
        if (chatContainer) {
            console.log('[Ghost-WebContainer Bridge] Monitoring chat container:', chatContainer);
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check the entire HTML including innerHTML
                            const html = node.innerHTML || '';
                            const text = node.textContent || '';
                            
                            // Check for WebContainer prepare signals
                            if (html.includes('GHOST_BUILDER_ACTIVE') || 
                                html.includes('Ghost Builder Mode Activated') ||
                                text.includes('Creating') && text.includes('app')) {
                                console.log('[Ghost-WebContainer Bridge] Ghost Builder activated! Preparing WebContainer...');
                                if (!this.webContainerPrepared) {
                                    this.prepareWebContainer();
                                }
                            }
                            
                            // NEW: Check for webcontainer_files in JSON responses
                            try {
                                // Look for JSON blocks in the response
                                const jsonMatch = text.match(/\{[\s\S]*"webcontainer_files"[\s\S]*\}/);
                                if (jsonMatch) {
                                    const jsonStr = jsonMatch[0];
                                    const parsed = JSON.parse(jsonStr);
                                    if (parsed.tool_args && parsed.tool_args.webcontainer_files) {
                                        console.log('[Ghost-WebContainer Bridge] Found webcontainer_files!');
                                        this.loadAppFromFiles(parsed.tool_args.webcontainer_files);
                                    }
                                }
                            } catch (e) {
                                // Not JSON or parsing error, ignore
                            }
                            
                            // Also check for direct webcontainer_files object
                            if (window.lastGhostResponse && window.lastGhostResponse.webcontainer_files) {
                                console.log('[Ghost-WebContainer Bridge] Found webcontainer_files in window!');
                                this.loadAppFromFiles(window.lastGhostResponse.webcontainer_files);
                                window.lastGhostResponse.webcontainer_files = null; // Clear after processing
                            }
                        }
                    });
                });
            });
            
            observer.observe(chatContainer, {
                childList: true,
                subtree: true
            });
            console.log('[Ghost-WebContainer Bridge] Chat monitoring active');
        } else {
            // Retry if chat container not found
            setTimeout(() => this.monitorChatResponses(), 1000);
        }
    }

    /**
     * Check message for Dyad output
     */
    checkForDyadOutput(message) {
        if (typeof message === 'string' && (message.includes('<ghost-write') || message.includes('<dyad-write'))) {
            this.processDyadOutput(message);
        }
    }

    /**
     * Load app from file objects (NEW APPROACH)
     */
    async loadAppFromFiles(files) {
        console.log('[Ghost-WebContainer Bridge] Loading app from file objects');
        
        // Ensure design frame is ready
        this.findDesignFrame();
        
        if (this.designFrame && this.designFrame.contentWindow) {
            // Send files directly to WebContainer
            this.designFrame.contentWindow.postMessage({
                type: 'mount-files',
                files: files
            }, '*');
            
            // Switch to design tab
            this.switchToDesignTab();
            
            console.log('[Ghost-WebContainer Bridge] Sent files to WebContainer');
        } else {
            console.error('[Ghost-WebContainer Bridge] Design frame not found');
            // Try to find frame and retry
            this.findDesignFrame();
            setTimeout(() => this.loadAppFromFiles(files), 1000);
        }
    }
    
    /**
     * Load app from file system path (LEGACY - keeping for backwards compatibility)
     */
    async loadAppFromPath(path, isReload = false) {
        console.log(`[Ghost-WebContainer Bridge] Loading app from: ${path}`);
        
        // Ensure design frame is ready
        this.findDesignFrame();
        
        if (this.designFrame && this.designFrame.contentWindow) {
            // Send message to design frame to load from path
            this.designFrame.contentWindow.postMessage({
                type: 'load-app-from-path',
                path: path,
                isReload: isReload
            }, '*');
            
            // Switch to design tab
            this.switchToDesignTab();
            
            console.log(`[Ghost-WebContainer Bridge] Sent load request for ${path}`);
        } else {
            console.error('[Ghost-WebContainer Bridge] Design frame not found');
            // Try to find frame and retry
            this.findDesignFrame();
            setTimeout(() => this.loadAppFromPath(path, isReload), 1000);
        }
    }
    
    /**
     * Process Dyad output and send to design tab (legacy)
     */
    processDyadOutput(content) {
        if (this.isProcessing) {
            console.log('Already processing Dyad output, skipping...');
            return;
        }
        
        // Check if this is new output
        if (content === this.lastDyadOutput) {
            console.log('Duplicate Dyad output, skipping...');
            return;
        }
        
        this.isProcessing = true;
        this.lastDyadOutput = content;
        
        console.log('Found Dyad output, sending to design tab...');
        
        // Send to design frame
        if (this.designFrame && this.designFrame.contentWindow) {
            this.designFrame.contentWindow.postMessage({
                type: 'load-dyad-output',
                content: content
            }, '*');
            
            // Switch to design tab if possible
            this.switchToDesignTab();
        } else {
            console.error('Design frame not found');
            this.findDesignFrame(); // Try to find it again
        }
        
        setTimeout(() => {
            this.isProcessing = false;
        }, 1000);
    }

    /**
     * Switch to design tab
     */
    switchToDesignTab() {
        // Show WebContainer content and switch to designs tab
        if (window.showDesignContent) {
            window.showDesignContent();
        }
        
        // Try various methods to switch to design tab
        const designTabButton = document.querySelector('[data-tab="designs"], .tab-design, #designTab');
        if (designTabButton) {
            designTabButton.click();
        }
        
        // Or try to show the design container
        const designContainer = document.querySelector('.design-container, #designContainer');
        if (designContainer) {
            designContainer.style.display = 'block';
        }
    }

    /**
     * Setup listener for design tab messages
     */
    setupDesignListener() {
        window.addEventListener('message', (event) => {
            // Handle messages from design tab
            if (event.data.type === 'element-selected-for-editing') {
                this.handleElementSelection(event.data.element);
            } else if (event.data.type === 'preview-ready') {
                this.handlePreviewReady(event.data.url);
            } else if (event.data.type === 'deploy-request') {
                this.handleDeployRequest();
            }
        });
    }

    /**
     * Handle element selection from design tab
     */
    handleElementSelection(element) {
        console.log('Element selected for editing:', element);
        
        // Create Ghost prompt for editing
        const prompt = `The user selected a ${element.tagName} element${element.id ? ' with id="' + element.id + '"' : ''}${element.className ? ' with class="' + element.className + '"' : ''}. The element contains: "${element.text}". What would you like to change about this element?`;
        
        // Insert into chat input
        const chatInput = document.querySelector('textarea, input[type="text"]');
        if (chatInput) {
            chatInput.value = prompt;
            // Focus to show user
            chatInput.focus();
        }
    }

    /**
     * Handle preview ready event
     */
    handlePreviewReady(url) {
        console.log('Preview ready at:', url);
        
        // Show notification or update UI
        this.showNotification('✨ Preview ready! Your app is running.');
    }

    /**
     * Handle deploy request
     */
    handleDeployRequest() {
        console.log('Deploy requested');
        
        // Create Ghost prompt for deployment
        const prompt = 'Deploy the current application to Netlify';
        
        // Insert into chat input
        const chatInput = document.querySelector('textarea, input[type="text"]');
        if (chatInput) {
            chatInput.value = prompt;
            // Auto-send if possible
            const sendButton = document.querySelector('[type="submit"], .send-button');
            if (sendButton) {
                sendButton.click();
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Create and initialize bridge
const ghostWebContainerBridge = new GhostWebContainerBridge();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ghostWebContainerBridge.init();
    });
} else {
    ghostWebContainerBridge.init();
}

// Export for use in other scripts
window.ghostWebContainerBridge = ghostWebContainerBridge;