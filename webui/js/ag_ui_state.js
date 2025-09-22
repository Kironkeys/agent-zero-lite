/**
 * AG-UI State Management System
 * Real-time bidirectional state synchronization
 */

window.AGUIState = {
    // Component states
    components: {},
    
    // Global state
    global: {
        theme: 'dark',
        notifications: [],
        modals: {}
    },
    
    // WebSocket connection for real-time updates
    ws: null,
    
    // Initialize state system
    init() {
        console.log('🔄 AG-UI State: Initializing state management...');
        
        // Set up Alpine.js reactive data
        this.setupAlpineData();
        
        // Connect to WebSocket for real-time updates
        this.connectWebSocket();
        
        // Set up localStorage sync
        this.setupLocalStorage();
        
        // Cross-tab synchronization
        this.setupCrossTab();
        
        console.log('✅ AG-UI State: Ready for bidirectional sync');
    },
    
    // Set up Alpine.js reactive data
    setupAlpineData() {
        // Make state reactive with Alpine.js
        Alpine.store('agui', this.global);
        Alpine.store('components', this.components);
    },
    
    // Connect to WebSocket for real-time updates
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/agui`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🔌 AG-UI: WebSocket connected');
                this.sendMessage('SYNC_REQUEST', {});
            };
            
            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            };
            
            this.ws.onerror = (error) => {
                console.warn('AG-UI: WebSocket error:', error);
            };
            
            this.ws.onclose = () => {
                console.log('AG-UI: WebSocket disconnected (not reconnecting - server unavailable)');
                // Disabled reconnection to prevent console spam
            };
        } catch (error) {
            console.warn('AG-UI: WebSocket not available:', error);
        }
    },
    
    // Handle incoming WebSocket messages
    handleMessage(message) {
        switch (message.type) {
            case 'STATE_UPDATE':
                this.updateState(message.data);
                break;
                
            case 'COMPONENT_CREATE':
                this.createComponent(message.data);
                break;
                
            case 'COMPONENT_UPDATE':
                this.updateComponent(message.data);
                break;
                
            case 'COMPONENT_DELETE':
                this.deleteComponent(message.data.id);
                break;
                
            case 'NOTIFICATION':
                this.showNotification(message.data);
                break;
                
            case 'MODAL':
                this.handleModal(message.data);
                break;
                
            default:
                console.log('AG-UI: Unknown message type:', message.type);
        }
    },
    
    // Send message to backend
    sendMessage(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
        }
    },
    
    // Update global state
    updateState(updates) {
        Object.assign(this.global, updates);
        this.saveToLocalStorage();
    },
    
    // Create component state
    createComponent(spec) {
        const id = spec.id || this.generateId();
        
        // Create reactive state for component
        this.components[id] = Alpine.reactive({
            ...spec,
            id,
            created: Date.now(),
            updated: Date.now()
        });
        
        // Create DOM element if container specified
        if (spec.container) {
            const container = document.querySelector(spec.container);
            if (container && window.AGUIComponents) {
                const element = AGUIComponents.createComponent(spec);
                container.appendChild(element);
            }
        }
        
        return id;
    },
    
    // Update component state
    updateComponent(updates) {
        const component = this.components[updates.id];
        if (component) {
            Object.assign(component, updates);
            component.updated = Date.now();
            this.saveToLocalStorage();
        }
    },
    
    // Delete component
    deleteComponent(id) {
        delete this.components[id];
        
        // Remove from DOM
        const element = document.querySelector(`[data-agui-id="${id}"]`);
        if (element) {
            element.remove();
        }
        
        this.saveToLocalStorage();
    },
    
    // Show notification
    showNotification(data) {
        const notification = {
            id: this.generateId(),
            ...data,
            timestamp: Date.now()
        };
        
        this.global.notifications.push(notification);
        
        // Auto-remove after duration
        if (data.duration) {
            setTimeout(() => {
                const index = this.global.notifications.findIndex(n => n.id === notification.id);
                if (index > -1) {
                    this.global.notifications.splice(index, 1);
                }
            }, data.duration);
        }
        
        // Create notification element
        if (window.AGUIComponents) {
            const container = document.querySelector('#agui-notifications') || this.createNotificationContainer();
            const element = AGUIComponents.createNotification(notification);
            container.appendChild(element);
        }
    },
    
    // Handle modal
    handleModal(data) {
        if (data.action === 'open') {
            this.global.modals[data.id] = data;
            
            // Create modal element
            if (window.AGUIComponents) {
                const element = AGUIComponents.createModal(data);
                document.body.appendChild(element);
            }
        } else if (data.action === 'close') {
            delete this.global.modals[data.id];
            
            // Remove modal element
            const element = document.querySelector(`[data-agui-modal-id="${data.id}"]`);
            if (element) {
                element.remove();
            }
        }
    },
    
    // Create notification container
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'agui-notifications';
        container.className = 'agui-notifications-container';
        document.body.appendChild(container);
        return container;
    },
    
    // Setup localStorage sync
    setupLocalStorage() {
        // Load saved state
        const saved = localStorage.getItem('agui-state');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(this.global, data.global || {});
                Object.assign(this.components, data.components || {});
            } catch (e) {
                console.error('AG-UI: Failed to load saved state:', e);
            }
        }
        
        // Save state changes
        setInterval(() => this.saveToLocalStorage(), 1000);
    },
    
    // Save to localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('agui-state', JSON.stringify({
                global: this.global,
                components: this.components,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('AG-UI: Failed to save state:', e);
        }
    },
    
    // Setup cross-tab synchronization
    setupCrossTab() {
        window.addEventListener('storage', (event) => {
            if (event.key === 'agui-state' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    
                    // Update state from other tab
                    Object.assign(this.global, data.global || {});
                    Object.assign(this.components, data.components || {});
                    
                    console.log('AG-UI: State synced from other tab');
                } catch (e) {
                    console.error('AG-UI: Cross-tab sync error:', e);
                }
            }
        });
    },
    
    // Generate unique ID
    generateId() {
        return 'agui-' + Math.random().toString(36).substr(2, 9);
    },
    
    // Get component by ID
    getComponent(id) {
        return this.components[id];
    },
    
    // Get all components of type
    getComponentsByType(type) {
        return Object.values(this.components).filter(c => c.type === type);
    },
    
    // Clear all state
    clear() {
        this.components = {};
        this.global.notifications = [];
        this.global.modals = {};
        this.saveToLocalStorage();
    },
    
    // Export state
    export() {
        return {
            global: this.global,
            components: this.components,
            timestamp: Date.now()
        };
    },
    
    // Import state
    import(data) {
        if (data.global) Object.assign(this.global, data.global);
        if (data.components) Object.assign(this.components, data.components);
        this.saveToLocalStorage();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    AGUIState.init();
});

// Make globally available
window.AGUIState = AGUIState;