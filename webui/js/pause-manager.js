// Pause/Resume Manager for Heavy Resources
// Stops VNC, iframes, and other heavy processes when not visible

class PauseManager {
    constructor() {
        this.pauseables = new Map();
        this.isHidden = document.hidden;
        this.activeTab = 'chat'; // default tab
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            this.isHidden = document.hidden;
            this.updatePauseStates();
        });
        
        // Listen for tab changes
        document.addEventListener('tab-changed', (e) => {
            this.activeTab = e.detail.tab;
            this.updatePauseStates();
        });
    }
    
    register(id, api) {
        this.pauseables.set(id, {
            pause: api.pause,
            resume: api.resume,
            tab: api.tab || null
        });
        
        // Immediately pause if should be paused
        if (this.shouldPause(id)) {
            api.pause();
        }
    }
    
    unregister(id) {
        this.pauseables.delete(id);
    }
    
    shouldPause(id) {
        const item = this.pauseables.get(id);
        if (!item) return false;
        
        // Pause if document is hidden
        if (this.isHidden) return true;
        
        // Pause if item has a tab and it's not the active tab
        if (item.tab && item.tab !== this.activeTab) return true;
        
        return false;
    }
    
    updatePauseStates() {
        for (const [id, item] of this.pauseables) {
            if (this.shouldPause(id)) {
                console.log(`[PauseManager] Pausing: ${id}`);
                item.pause();
            } else {
                console.log(`[PauseManager] Resuming: ${id}`);
                item.resume();
            }
        }
    }
    
    pauseAll() {
        for (const [id, item] of this.pauseables) {
            console.log(`[PauseManager] Force pausing: ${id}`);
            item.pause();
        }
    }
    
    resumeAll() {
        for (const [id, item] of this.pauseables) {
            if (!this.shouldPause(id)) {
                console.log(`[PauseManager] Force resuming: ${id}`);
                item.resume();
            }
        }
    }
}

// Create global instance
window.pauseManager = new PauseManager();

// Auto-register VNC browsers
document.addEventListener('DOMContentLoaded', () => {
    // Register Chrome VNC browser
    const vncIframe = document.getElementById('operations-browser-iframe');
    if (vncIframe) {
        window.pauseManager.register('vnc-browser', {
            pause: () => {
                vncIframe.style.visibility = 'hidden';
                if (vncIframe.contentWindow && vncIframe.contentWindow.pauseVNC) {
                    vncIframe.contentWindow.pauseVNC();
                }
            },
            resume: () => {
                vncIframe.style.visibility = 'visible';
                if (vncIframe.contentWindow && vncIframe.contentWindow.resumeVNC) {
                    vncIframe.contentWindow.resumeVNC();
                }
            },
            tab: 'operations'
        });
    }
    
    // Register E2B desktop
    const e2bIframe = document.querySelector('.e2b-iframe');
    if (e2bIframe) {
        window.pauseManager.register('e2b-desktop', {
            pause: () => {
                e2bIframe.style.visibility = 'hidden';
            },
            resume: () => {
                e2bIframe.style.visibility = 'visible';
            },
            tab: 'operations'
        });
    }
});

// Pause all heavy resources when window loses focus
window.addEventListener('blur', () => {
    window.pauseManager.pauseAll();
});

// Resume when window gains focus
window.addEventListener('focus', () => {
    window.pauseManager.resumeAll();
});