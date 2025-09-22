/**
 * Browser-Use Cloud Integration for Phantom Console
 * Handles embedding cloud browser preview URLs in Operations tab
 */

class BrowserCloudIntegration {
    constructor() {
        this.currentTaskId = null;
        this.previewUrl = null;
        this.isCloudBrowserActive = false;
        
        // Listen for cloud browser events from Ghost
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for SSE messages from Ghost
        if (window.phantomSSE) {
            window.phantomSSE.addEventListener('browser_cloud_start', (data) => {
                this.handleCloudBrowserStart(data);
            });
            
            window.phantomSSE.addEventListener('browser_cloud_preview', (data) => {
                this.handlePreviewUrl(data);
            });
        }
        
        // Also check for preview URLs in regular messages
        document.addEventListener('ghost-message', (event) => {
            this.checkForPreviewUrl(event.detail);
        });
    }
    
    handleCloudBrowserStart(data) {
        console.log('🌐 Browser Cloud task started:', data);
        this.currentTaskId = data.task_id;
        this.isCloudBrowserActive = true;
        
        // Show loading state in Operations tab
        this.showLoadingState();
    }
    
    handlePreviewUrl(data) {
        console.log('📺 Browser Cloud preview URL received:', data);
        
        if (data.preview_url) {
            this.previewUrl = data.preview_url;
            this.embedPreview(data.preview_url);
        }
    }
    
    checkForPreviewUrl(message) {
        // Look for cloud.browser-use.com URLs in messages
        const urlPattern = /https:\/\/cloud\.browser-use\.com\/agent\/[a-zA-Z0-9-]+/g;
        const matches = message.match(urlPattern);
        
        if (matches && matches.length > 0) {
            console.log('🔍 Found Browser Cloud URL in message:', matches[0]);
            this.embedPreview(matches[0]);
        }
    }
    
    embedPreview(url) {
        // Find the Operations tab iframe
        const operationsIframe = document.getElementById('operations-browser-iframe');
        const operationsTab = document.querySelector('[data-tab="operations"]');
        
        if (operationsIframe) {
            // Update iframe source
            operationsIframe.src = url;
            this.isCloudBrowserActive = true;
            
            // Auto-switch to Operations tab
            if (operationsTab && !operationsTab.classList.contains('active')) {
                this.switchToOperationsTab();
            }
            
            // Update UI to show cloud browser is active
            this.updateUIState('active', url);
            
            // Show notification
            this.showNotification('Browser Cloud Active', 'Live preview available in Operations tab');
        }
    }
    
    showLoadingState() {
        const operationsIframe = document.getElementById('operations-browser-iframe');
        if (operationsIframe) {
            // Show loading message
            operationsIframe.srcdoc = `
                <html>
                <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: #00ff00; font-family: monospace;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; animation: pulse 1s infinite;">🌐</div>
                        <h2>Browser Cloud Starting...</h2>
                        <p>Waiting for preview URL from field_agent</p>
                        <div style="margin-top: 20px;">
                            <span style="animation: blink 1s infinite;">█</span>
                        </div>
                    </div>
                    <style>
                        @keyframes pulse { 
                            0%, 100% { transform: scale(1); } 
                            50% { transform: scale(1.1); } 
                        }
                        @keyframes blink { 
                            0%, 50% { opacity: 1; } 
                            51%, 100% { opacity: 0; } 
                        }
                    </style>
                </body>
                </html>
            `;
        }
    }
    
    switchToOperationsTab() {
        // Find and click the Operations tab
        const tabButtons = document.querySelectorAll('.phantom-tab-button');
        tabButtons.forEach(button => {
            if (button.textContent.includes('Operations')) {
                button.click();
            }
        });
    }
    
    updateUIState(state, url = null) {
        // Update Operations tab header
        const operationsHeader = document.querySelector('.operations-header');
        if (operationsHeader) {
            const statusBadge = operationsHeader.querySelector('.cloud-status') || 
                               document.createElement('span');
            statusBadge.className = 'cloud-status';
            
            if (state === 'active') {
                statusBadge.innerHTML = `
                    <span style="color: #00ff00; margin-left: 10px;">
                        ● Cloud Browser Active
                    </span>
                `;
                statusBadge.title = url || 'Browser Cloud session active';
            } else {
                statusBadge.innerHTML = '';
            }
            
            if (!operationsHeader.contains(statusBadge)) {
                operationsHeader.appendChild(statusBadge);
            }
        }
    }
    
    showNotification(title, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'browser-cloud-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid #00ff00;
                border-radius: 8px;
                padding: 15px 20px;
                color: #fff;
                box-shadow: 0 4px 15px rgba(0, 255, 0, 0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 300px;
            ">
                <h4 style="margin: 0 0 5px 0; color: #00ff00;">🌐 ${title}</h4>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">${message}</p>
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    // Method to manually set preview URL (for testing)
    setPreviewUrl(url) {
        this.embedPreview(url);
    }
    
    // Check if cloud browser is active
    isActive() {
        return this.isCloudBrowserActive;
    }
    
    // Get current task info
    getTaskInfo() {
        return {
            taskId: this.currentTaskId,
            previewUrl: this.previewUrl,
            isActive: this.isCloudBrowserActive
        };
    }
}

// Initialize on page load
window.browserCloud = new BrowserCloudIntegration();

// Expose for debugging
console.log('🌐 Browser Cloud Integration loaded. Use window.browserCloud.setPreviewUrl(url) to test.');