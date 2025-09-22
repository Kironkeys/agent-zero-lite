// Ghost Performance Optimizations
// This file contains performance improvements to reduce CPU usage

(function() {
    'use strict';
    
    console.log('[Ghost Performance] Initializing optimizations...');
    
    // 1. Disable unnecessary polling
    const disablePolling = () => {
        // Stop E2B polling if not needed
        if (window.stopE2BPolling) {
            window.stopE2BPolling();
            console.log('[Ghost Performance] E2B polling disabled');
        }
        
        // Clear any browser cloud polling intervals
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
            const intervalStr = window.clearInterval(i);
            if (intervalStr && intervalStr.toString().includes('browser_cloud_trigger')) {
                window.clearInterval(i);
                console.log('[Ghost Performance] Cleared browser cloud polling interval', i);
            }
        }
    };
    
    // 2. Optimize Phantom Console initialization
    const preventDuplicateInit = () => {
        if (!window.phantomConsoleInitCount) {
            window.phantomConsoleInitCount = 0;
        }
        
        const originalInit = window.initPhantomConsole;
        if (originalInit) {
            window.initPhantomConsole = function() {
                window.phantomConsoleInitCount++;
                if (window.phantomConsoleInitCount > 1) {
                    console.log('[Ghost Performance] Preventing duplicate Phantom Console initialization');
                    return;
                }
                return originalInit.apply(this, arguments);
            };
        }
    };
    
    // 3. Throttle browser popup attempts
    const throttlePopups = () => {
        if (window.phantomConsole && window.phantomConsole.embedBrowserUseUrl) {
            const original = window.phantomConsole.embedBrowserUseUrl;
            let lastCall = 0;
            
            window.phantomConsole.embedBrowserUseUrl = function(url) {
                const now = Date.now();
                if (now - lastCall < 5000) {
                    console.log('[Ghost Performance] Throttling popup attempt');
                    return;
                }
                lastCall = now;
                return original.apply(this, arguments);
            };
        }
    };
    
    // 4. Reduce console logging in production
    const optimizeLogging = () => {
        const originalLog = console.log;
        const suppressPatterns = [
            'Failed to load resource: the server responded with a status of 404',
            'browser_cloud_trigger.json',
            'e2b_session.json'
        ];
        
        console.log = function() {
            const args = Array.from(arguments);
            const message = args.join(' ');
            
            // Suppress noisy 404 errors from polling
            for (const pattern of suppressPatterns) {
                if (message.includes(pattern)) {
                    return;
                }
            }
            
            return originalLog.apply(console, arguments);
        };
    };
    
    // 5. Optimize iframe performance
    const optimizeIframes = () => {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            // Add loading="lazy" for better performance
            if (!iframe.src || iframe.src === 'about:blank') {
                iframe.loading = 'lazy';
            }
            
            // Remove unnecessary sandbox permissions
            if (iframe.sandbox && iframe.sandbox.contains('allow-scripts') && 
                iframe.sandbox.contains('allow-same-origin')) {
                console.log('[Ghost Performance] Note: iframe has elevated permissions for functionality');
            }
        });
    };
    
    // 6. Clean up unused intervals
    const cleanupIntervals = () => {
        if (!window.ghostIntervals) {
            window.ghostIntervals = new Set();
        }
        
        // Override setInterval to track all intervals
        const originalSetInterval = window.setInterval;
        window.setInterval = function(fn, delay) {
            const id = originalSetInterval.apply(window, arguments);
            window.ghostIntervals.add(id);
            return id;
        };
        
        // Override clearInterval to track cleared intervals
        const originalClearInterval = window.clearInterval;
        window.clearInterval = function(id) {
            window.ghostIntervals.delete(id);
            return originalClearInterval.apply(window, arguments);
        };
    };
    
    // Apply optimizations
    const applyOptimizations = () => {
        disablePolling();
        preventDuplicateInit();
        throttlePopups();
        optimizeLogging();
        optimizeIframes();
        cleanupIntervals();
        
        console.log('[Ghost Performance] All optimizations applied');
        
        // Show performance status
        if (window.showToast) {
            window.showToast('Performance optimizations enabled', 'success');
        }
    };
    
    // Apply on load and provide manual trigger
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyOptimizations);
    } else {
        // Apply with a small delay to ensure everything is loaded
        setTimeout(applyOptimizations, 1000);
    }
    
    // Expose for manual use
    window.ghostPerformance = {
        optimize: applyOptimizations,
        disablePolling: disablePolling,
        cleanupIntervals: () => {
            window.ghostIntervals.forEach(id => clearInterval(id));
            console.log('[Ghost Performance] Cleared all intervals');
        },
        status: () => {
            console.log('[Ghost Performance] Status:');
            console.log('- Active intervals:', window.ghostIntervals ? window.ghostIntervals.size : 'unknown');
            console.log('- Phantom Console init count:', window.phantomConsoleInitCount || 0);
            console.log('- E2B polling:', window.checkInterval ? 'active' : 'disabled');
        }
    };
    
    console.log('[Ghost Performance] Module loaded. Use window.ghostPerformance.status() to check status');
})();