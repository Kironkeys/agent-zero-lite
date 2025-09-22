/**
 * CLEAN SSE CLIENT FOR PHANTOM CONSOLE
 * Simple, robust connection to phantom_updates endpoint
 */

class PhantomSSEClient {
    constructor() {
        this.eventSource = null;
        this.reconnectTimer = null;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.isConnecting = false;
    }

    connect() {
        if (this.isConnecting || this.eventSource) {
            console.log('[PhantomSSE] Already connected or connecting');
            return;
        }

        this.isConnecting = true;
        console.log('[PhantomSSE] Connecting to SSE endpoint...');

        try {
            this.eventSource = new EventSource('/phantom_updates');
            
            this.eventSource.onopen = () => {
                console.log('[PhantomSSE] Connected successfully');
                this.isConnecting = false;
                this.reconnectDelay = 1000; // Reset delay on successful connection
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleUpdate(data);
                } catch (e) {
                    console.error('[PhantomSSE] Error parsing message:', e);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('[PhantomSSE] Connection error:', error);
                this.eventSource.close();
                this.eventSource = null;
                this.isConnecting = false;
                this.scheduleReconnect();
            };

        } catch (error) {
            console.error('[PhantomSSE] Failed to create EventSource:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    handleUpdate(data) {
        console.log('[PhantomSSE] Received update:', data);
        
        switch(data.type) {
            case 'connected':
                console.log('[PhantomSSE] Server confirmed connection');
                break;
                
            case 'heartbeat':
                // Silent heartbeat
                break;
                
            case 'chart_created':
                console.log('[PhantomSSE] New chart created:', data.data);
                this.refreshWorkspaceTab();
                break;
                
            case 'design_created':
                console.log('[PhantomSSE] New design created:', data.data);
                this.refreshDesignsTab();
                break;
                
            default:
                console.log('[PhantomSSE] Unknown update type:', data.type);
        }
    }

    refreshWorkspaceTab() {
        console.log('[PhantomSSE] Refreshing workspace tab...');
        
        // Direct fetch and update - FIXED VERSION
        fetch('/workspace_charts')
            .then(response => response.json())
            .then(data => {
                console.log('[PhantomSSE] Fetched workspace data with', 
                    data.workspace ? data.workspace.visualizations.length : 0, 'charts');
                
                if (data && data.workspace) {
                    // Check if phantomConsole exists and has the update function
                    if (window.phantomConsole && typeof window.phantomConsole.updateWorkspaceTab === 'function') {
                        console.log('[PhantomSSE] Updating workspace via phantomConsole.updateWorkspaceTab');
                        window.phantomConsole.updateWorkspaceTab(data.workspace);
                        
                        // Make sure workspace tab is active to see the update
                        setTimeout(() => {
                            const workspaceBtn = Array.from(document.querySelectorAll('button'))
                                .find(b => b.textContent.trim() === 'Workspace');
                            if (workspaceBtn && !workspaceBtn.classList.contains('active')) {
                                console.log('[PhantomSSE] Activating workspace tab');
                                workspaceBtn.click();
                            }
                        }, 500);
                    } else {
                        console.warn('[PhantomSSE] phantomConsole.updateWorkspaceTab not available');
                        // Try again after a short delay (might not be initialized yet)
                        setTimeout(() => this.refreshWorkspaceTab(), 2000);
                    }
                }
            })
            .catch(error => console.error('[PhantomSSE] Error fetching charts:', error));
    }

    refreshDesignsTab() {
        console.log('[PhantomSSE] Refreshing designs tab...');
        
        // Similar approach for designs
        if (window.detectAndShowDesigns) {
            window.detectAndShowDesigns();
        } else if (window.phantomConsole && window.phantomConsole.refreshDesigns) {
            window.phantomConsole.refreshDesigns();
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        console.log(`[PhantomSSE] Reconnecting in ${this.reconnectDelay}ms...`);
        
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        console.log('[PhantomSSE] Disconnected');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for phantom console to initialize first
    setTimeout(() => {
        window.phantomSSE = new PhantomSSEClient();
        window.phantomSSE.connect();
        console.log('[PhantomSSE] Client initialized');
    }, 2000);
});