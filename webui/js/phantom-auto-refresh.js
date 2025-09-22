/**
 * Phantom Console Auto-Refresh
 * Fallback polling mechanism to ensure charts auto-populate
 */

(function() {
    let lastCheckTime = Date.now();
    let pollInterval = null;
    
    function checkForNewCharts() {
        // Check trigger file for updates
        fetch('/api/workspace_charts')
            .then(response => response.json())
            .then(data => {
                if (data.charts && data.charts.length > 0) {
                    // Check if we have new charts since last check
                    const latestChart = data.charts[0];
                    if (latestChart && latestChart.timestamp) {
                        const chartTime = new Date(latestChart.timestamp).getTime();
                        if (chartTime > lastCheckTime) {
                            console.log('[AutoRefresh] New chart detected, refreshing...');
                            lastCheckTime = Date.now();
                            
                            // Update the workspace tab
                            if (window.phantomConsole && window.phantomConsole.updateWorkspaceTab) {
                                window.phantomConsole.updateWorkspaceTab(data.charts);
                            } else if (window.loadInitialVisualizations) {
                                window.loadInitialVisualizations();
                            }
                        }
                    }
                }
            })
            .catch(error => {
                // Silent fail - this is just a fallback
            });
    }
    
    // Start polling when phantom console is open
    window.startAutoRefresh = function() {
        if (!pollInterval) {
            console.log('[AutoRefresh] Starting auto-refresh polling...');
            pollInterval = setInterval(checkForNewCharts, 3000); // Check every 3 seconds
            checkForNewCharts(); // Check immediately
        }
    };
    
    window.stopAutoRefresh = function() {
        if (pollInterval) {
            console.log('[AutoRefresh] Stopping auto-refresh polling...');
            clearInterval(pollInterval);
            pollInterval = null;
        }
    };
    
    // Auto-start when DOM is ready and phantom console exists
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (window.phantomConsole) {
                // Hook into phantom console open/close
                const originalToggle = window.togglePhantomConsole;
                window.togglePhantomConsole = function() {
                    const result = originalToggle.apply(this, arguments);
                    
                    // Check if panel is open
                    const panel = document.getElementById('phantom-console-panel');
                    if (panel && panel.classList.contains('open')) {
                        window.startAutoRefresh();
                    } else {
                        window.stopAutoRefresh();
                    }
                    
                    return result;
                };
                
                console.log('[AutoRefresh] Auto-refresh mechanism installed');
            }
        }, 3000);
    });
})();