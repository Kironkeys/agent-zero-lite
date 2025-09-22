/**
 * AG-UI Core Utilities and Event System
 * THIS IS THE MISSING FILE THAT CONNECTS EVERYTHING!
 * Handles communication between Ghost backend and AG-UI frontend
 */

window.AGUI = {
    // Configuration
    config: {
        debug: true,
        container: '#chat-messages',  // Where to append components
        apiEndpoint: '/api/ag-ui',
        wsEndpoint: null  // Will be set dynamically
    },
    
    // Event source for SSE
    eventSource: null,
    
    // Active components
    activeComponents: new Map(),
    
    // Initialize AG-UI system
    init() {
        console.log('🎯 AG-UI Core: Initializing event system...');
        
        // Hook into Ghost's chat system
        this.hookIntoChatSystem();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Connect to API
        this.connectToAPI();
        
        // Monitor for AG-UI log entries
        this.monitorLogs();
        
        console.log('✅ AG-UI Core: Event system ready!');
    },
    
    // Hook into Ghost's chat system to intercept AG-UI messages
    hookIntoChatSystem() {
        // Override the original message handler to intercept AG-UI components
        const originalAddMessage = window.addMessage || window.chat?.addMessage;
        
        if (originalAddMessage) {
            window.addMessage = (message) => {
                // Check if this is an AG-UI component
                if (this.isAGUIMessage(message)) {
                    this.handleAGUIMessage(message);
                }
                
                // Call original handler
                if (typeof originalAddMessage === 'function') {
                    originalAddMessage(message);
                }
            };
        }
        
        // Also monitor the chat container for new messages
        const chatContainer = document.querySelector('#chat-messages');
        if (chatContainer) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {  // Element node
                            this.checkForAGUIContent(node);
                        }
                    });
                });
            });
            
            observer.observe(chatContainer, {
                childList: true,
                subtree: true
            });
        }
    },
    
    // Check if a message contains AG-UI content
    isAGUIMessage(message) {
        if (typeof message === 'string') {
            return message.includes('ag_ui') || 
                   message.includes('AG-UI') || 
                   message.includes('"type":"ag_ui"');
        }
        
        if (typeof message === 'object') {
            return message.type === 'ag_ui' || 
                   message.log_type === 'ag_ui' ||
                   (message.content && message.content.includes('ag_ui'));
        }
        
        return false;
    },
    
    // Handle AG-UI messages
    handleAGUIMessage(message) {
        console.log('🎨 AG-UI: Processing message:', message);
        
        try {
            let spec = null;
            
            // Extract component spec from different message formats
            if (typeof message === 'string') {
                // Try to parse JSON from string
                const jsonMatch = message.match(/\{[\s\S]*"ui_components"[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    spec = parsed.ui_components || parsed;
                }
            } else if (message.content) {
                // Message object with content
                if (typeof message.content === 'string') {
                    const parsed = JSON.parse(message.content);
                    spec = parsed.ui_components || parsed;
                } else {
                    spec = message.content.ui_components || message.content;
                }
            } else if (message.ui_components) {
                spec = message.ui_components;
            }
            
            if (spec) {
                this.renderComponent(spec);
            }
            
        } catch (error) {
            console.error('AG-UI: Error processing message:', error);
        }
    },
    
    // Check DOM nodes for AG-UI content
    checkForAGUIContent(node) {
        // Look for JSON blocks containing AG-UI specs
        const codeBlocks = node.querySelectorAll('pre code, .code-block');
        codeBlocks.forEach(block => {
            const text = block.textContent;
            if (text.includes('"type":"ag_ui"') || text.includes('"ui_components"')) {
                try {
                    const spec = JSON.parse(text);
                    if (spec.ui_components || spec.type === 'ag_ui') {
                        this.renderComponent(spec.ui_components || spec);
                        
                        // Replace the code block with a placeholder
                        const placeholder = document.createElement('div');
                        placeholder.className = 'agui-rendered-placeholder';
                        placeholder.innerHTML = '✅ AG-UI Component Rendered Above';
                        block.parentNode.replaceChild(placeholder, block);
                    }
                } catch (e) {
                    // Not valid JSON, ignore
                }
            }
        });
        
        // Also check for log entries
        const logEntries = node.querySelectorAll('.log-entry[data-type="ag_ui"]');
        logEntries.forEach(entry => {
            const content = entry.querySelector('.log-content');
            if (content) {
                try {
                    const spec = JSON.parse(content.textContent);
                    this.renderComponent(spec.ui_components || spec);
                } catch (e) {
                    console.error('AG-UI: Error parsing log entry:', e);
                }
            }
        });
    },
    
    // Render a component from specification
    renderComponent(spec) {
        console.log('🔧 AG-UI: Rendering component:', spec);
        
        if (!window.AGUIComponents) {
            console.error('AG-UI: Components system not loaded!');
            return;
        }
        
        try {
            // Create the component
            const component = AGUIComponents.createComponent(spec);
            
            // Find or create container
            let container = document.querySelector('#agui-container');
            if (!container) {
                // Create container in chat area
                const chatMessages = document.querySelector('#chat-messages');
                if (chatMessages) {
                    container = document.createElement('div');
                    container.id = 'agui-container';
                    container.className = 'agui-container';
                    
                    // Insert at the end of chat messages
                    chatMessages.appendChild(container);
                } else {
                    // Fallback: append to body
                    container = document.createElement('div');
                    container.id = 'agui-container';
                    container.className = 'agui-container';
                    document.body.appendChild(container);
                }
            }
            
            // Add component to container
            container.appendChild(component);
            
            // Store reference
            const id = spec.id || this.generateId();
            this.activeComponents.set(id, {
                element: component,
                spec: spec,
                created: Date.now()
            });
            
            // Initialize Alpine.js on the new component
            if (window.Alpine) {
                Alpine.initTree(component);
            }
            
            console.log('✅ AG-UI: Component rendered successfully!', id);
            
            // Animate entry
            this.animateEntry(component);
            
        } catch (error) {
            console.error('AG-UI: Error rendering component:', error);
        }
    },
    
    // Animate component entry
    animateEntry(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 10);
    },
    
    // Monitor for log entries
    monitorLogs() {
        // Watch for Ghost's log entries
        setInterval(() => {
            const logs = document.querySelectorAll('.log-entry:not([data-agui-processed])');
            logs.forEach(log => {
                const type = log.getAttribute('data-type');
                if (type === 'ag_ui') {
                    log.setAttribute('data-agui-processed', 'true');
                    
                    const content = log.querySelector('.log-content');
                    if (content) {
                        try {
                            const data = JSON.parse(content.textContent);
                            this.handleAGUIMessage(data);
                        } catch (e) {
                            console.error('AG-UI: Error processing log:', e);
                        }
                    }
                }
            });
        }, 500);
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for custom AG-UI events
        document.addEventListener('agui:create', (event) => {
            this.renderComponent(event.detail);
        });
        
        document.addEventListener('agui:update', (event) => {
            this.updateComponent(event.detail.id, event.detail.updates);
        });
        
        document.addEventListener('agui:delete', (event) => {
            this.deleteComponent(event.detail.id);
        });
        
        // Listen for messages from Ghost
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'ag_ui') {
                this.handleAGUIMessage(event.data);
            }
        });
    },
    
    // Connect to API endpoint
    connectToAPI() {
        // API endpoint not available in this Ghost installation
        console.log('🔌 AG-UI: Skipping API connection (not configured)');
        return;
        
        // Disabled - causes 404 errors
        /*
        try {
            this.eventSource = new EventSource(this.config.apiEndpoint);
            this.eventSource.onopen = () => console.log('🔌 AG-UI: Connected to API');
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleAPIEvent(data);
                } catch (e) {
                    console.error('AG-UI: Error parsing API event:', e);
                }
            };
            this.eventSource.onerror = (error) => console.warn('AG-UI: API connection error:', error);
        } catch (error) {
            console.warn('AG-UI: Could not connect to API:', error);
        }
        */
    },
    
    // Handle API events
    handleAPIEvent(data) {
        switch (data.type) {
            case 'component:create':
                this.renderComponent(data.spec);
                break;
                
            case 'component:update':
                this.updateComponent(data.id, data.updates);
                break;
                
            case 'component:delete':
                this.deleteComponent(data.id);
                break;
                
            default:
                console.log('AG-UI: Unknown API event:', data);
        }
    },
    
    // Update a component
    updateComponent(id, updates) {
        const component = this.activeComponents.get(id);
        if (component) {
            // Update spec
            Object.assign(component.spec, updates);
            
            // Re-render if needed
            if (updates.rerender) {
                const newElement = AGUIComponents.createComponent(component.spec);
                component.element.parentNode.replaceChild(newElement, component.element);
                component.element = newElement;
            }
            
            // Update state
            if (window.AGUIState) {
                AGUIState.updateComponent({ id, ...updates });
            }
        }
    },
    
    // Delete a component
    deleteComponent(id) {
        const component = this.activeComponents.get(id);
        if (component) {
            // Animate out
            component.element.style.opacity = '0';
            component.element.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                component.element.remove();
                this.activeComponents.delete(id);
            }, 300);
            
            // Update state
            if (window.AGUIState) {
                AGUIState.deleteComponent(id);
            }
        }
    },
    
    // Generate unique ID
    generateId() {
        return 'agui-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },
    
    // Manual component creation (for testing)
    create(spec) {
        this.renderComponent(spec);
    },
    
    // Clear all components
    clear() {
        this.activeComponents.forEach(component => {
            component.element.remove();
        });
        this.activeComponents.clear();
        
        const container = document.querySelector('#agui-container');
        if (container) {
            container.innerHTML = '';
        }
    },
    
    // Get component by ID
    getComponent(id) {
        return this.activeComponents.get(id);
    },
    
    // Get all components
    getAllComponents() {
        return Array.from(this.activeComponents.values());
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other systems to initialize
    setTimeout(() => {
        AGUI.init();
        console.log('🚀 AG-UI Core: System fully initialized!');
        
        // Expose for debugging
        window.AGUI = AGUI;
    }, 1000);
});

// Also expose immediately for early access
window.AGUI = AGUI;