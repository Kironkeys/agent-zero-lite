// Phantom Console - Enhanced Agent Control Interface
console.log('Phantom Console initializing...');

// Robust initialization that works regardless of DOM timing
let initRetryCount = 0;
const MAX_RETRY_COUNT = 10; // Maximum 5 seconds of retries

function initializePhantomConsole() {
    console.log('[Phantom Console] Starting initialization... (attempt ' + (initRetryCount + 1) + ')');
    
    const ghostTab = document.getElementById('ghost-tab');
    const mainContent = document.querySelector('.container');
    
    if (!ghostTab) {
        initRetryCount++;
        if (initRetryCount < MAX_RETRY_COUNT) {
            console.warn('[Phantom Console] Ghost tab not found, retrying in 500ms... (' + initRetryCount + '/' + MAX_RETRY_COUNT + ')');
            setTimeout(initializePhantomConsole, 500);
        } else {
            console.error('[Phantom Console] Failed to find ghost-tab after ' + MAX_RETRY_COUNT + ' attempts. Please check if the element exists in the DOM.');
        }
        return;
    }
    
    console.log('[Phantom Console] Ghost tab found, proceeding with initialization...');
    
    // Set up mutation observer to detect Browser Use URLs in Ghost messages
    const setupBrowserUseDetection = () => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                            // Get text content
                            const text = node.textContent || node.innerText || '';
                            
                            // Also check for links in the node
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const links = node.querySelectorAll ? node.querySelectorAll('a') : [];
                                links.forEach(link => {
                                    const href = link.href || link.getAttribute('href');
                                    if (href && href.includes('browser-use.com')) {
                                        console.log('[Phantom Console] Found Browser Use link:', href);
                                        if (window.phantomConsole && window.phantomConsole.embedBrowserUseUrl) {
                                            window.phantomConsole.embedBrowserUseUrl(href);
                                            // Prevent default link behavior
                                            link.onclick = (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                return false;
                                            };
                                        }
                                    }
                                });
                            }
                            
                            // Check text content as well
                            if (text && window.phantomConsole && window.phantomConsole.detectBrowserUseUrl) {
                                window.phantomConsole.detectBrowserUseUrl(text);
                            }
                        }
                    });
                }
            });
        });
        
        // Observe multiple containers where messages might appear
        const containers = [
            document.getElementById('messages'),
            document.querySelector('.notifications'),
            document.querySelector('.notification-container'),
            document.querySelector('.assistant-message'),
            document.body // Fallback to observe entire body
        ];
        
        containers.forEach(container => {
            if (container) {
                observer.observe(container, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        });
        
        console.log('[Phantom Console] Browser Use URL detection activated on multiple containers');
    };
    
    // Initialize after a short delay to ensure everything is loaded
    setTimeout(setupBrowserUseDetection, 1000);
    
    // WebContainer integration for Designs tab
    window.showDesignContent = function(url) {
        console.log('[Phantom Console] Showing WebContainer content in Designs tab:', url);
        
        // Hide the ghost waiting state
        const ghostContainer = document.querySelector('#designs-browser-container > div');
        if (ghostContainer && ghostContainer.style.display !== 'none') {
            ghostContainer.style.display = 'none';
        }
        
        // Show the WebContainer iframe
        const iframe = document.getElementById('designs-browser-iframe');
        if (iframe) {
            // Update iframe source if URL provided
            if (url && url !== iframe.src) {
                iframe.src = url;
                console.log('[Phantom Console] Updated iframe source to:', url);
            }
            iframe.style.display = 'block';
            
            // Switch to Designs tab if not already active
            if (window.phantomConsole && window.phantomConsole.switchToTab) {
                window.phantomConsole.switchToTab('designs');
            }
        }
    };
    
    // Dynamic design detection system
    window.detectAndShowDesigns = function() {
        // Check for newly created HTML files in outputs/designs
        fetch('/workspace_designs')
            .then(response => response.json())
            .then(data => {
                if (data && data.workspace && data.workspace.designs && data.workspace.designs.length > 0) {
                    // Get the most recent design
                    const latestDesign = data.workspace.designs[0]; // Already sorted newest first
                    const designUrl = latestDesign.path;
                    
                    console.log('[Phantom Console] Found new design:', latestDesign.title);
                    window.showDesignContent(designUrl);
                }
            })
            .catch(error => {
                console.log('[Phantom Console] Design detection error:', error);
            });
    };
    
    // Hide design content and show ghost
    window.hideDesignContent = function() {
        console.log('[Phantom Console] Hiding WebContainer content');
        
        // Show the ghost waiting state
        const ghostContainer = document.querySelector('#designs-browser-container > div');
        if (ghostContainer) {
            ghostContainer.style.display = 'flex';
        }
        
        // Hide the WebContainer iframe
        const iframe = document.getElementById('designs-browser-iframe');
        if (iframe) {
            iframe.style.display = 'none';
        }
    };
    
    // Also scan for existing Browser Use links on the page
    setTimeout(() => {
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach(link => {
            const href = link.href || link.getAttribute('href');
            if (href && href.includes('browser-use.com')) {
                console.log('[Phantom Console] Found existing Browser Use link:', href);
                // Override click behavior
                link.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.phantomConsole && window.phantomConsole.embedBrowserUseUrl) {
                        window.phantomConsole.embedBrowserUseUrl(href);
                    }
                    return false;
                };
                // Auto-embed the first one found
                if (window.phantomConsole && window.phantomConsole.embedBrowserUseUrl) {
                    window.phantomConsole.embedBrowserUseUrl(href);
                }
            }
        });
    }, 2000);
    
    // Listen for messages from iframes
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'request-fullscreen') {
            const container = document.getElementById(e.data.target || 'operations-browser-container');
            if (container) {
                if (!document.fullscreenElement) {
                    container.requestFullscreen().catch(err => {
                        console.error('Fullscreen request failed:', err);
                    });
                } else {
                    document.exitFullscreen();
                }
            }
        }
        
        // Handle Virtual Computer updates
        if (e.data && e.data.type === 'virtual_computer_started') {
            const iframe = document.getElementById('operations-browser-iframe');
            if (iframe && e.data.vnc_url) {
                // Send VNC URL to the iframe
                iframe.contentWindow.postMessage({
                    type: 'e2b-vnc',
                    vncUrl: e.data.vnc_url
                }, '*');
            }
        }
    });
    
    // DISABLED: Old virtual computer polling - not needed with new E2B integration
    /*
    // DISABLED setInterval(async () => {
        try {
            const response = await fetch('/tmp/virtual_computer_update.json?' + Date.now());
            if (response.ok) {
                const data = await response.json();
                if (data.type === 'virtual_computer_started') {
                    const iframe = document.getElementById('operations-browser-iframe');
                    if (iframe && data.vnc_url) {
                        iframe.contentWindow.postMessage({
                            type: 'e2b-vnc',
                            vncUrl: data.vnc_url
                        }, '*');
                    }
                }
            }
        } catch (e) {
            // Ignore - file might not exist
        }
    }, 999999);
    */
    
    // Define fetchPhantomConsoleData function first
    // Guard against overlapping requests
    let __phantomFetchBusy = false;
    window.fetchPhantomConsoleData = async function() {
        if (__phantomFetchBusy) {
            return; // skip overlapping refresh
        }
        __phantomFetchBusy = true;
        try {
            console.log('[Phantom Console] Fetching data from /workspace_charts...');
            const response = await fetch('/workspace_charts?t=' + Date.now(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Call the hoisted function directly; it's declared later in this scope
                updatePhantomConsole(data);
            } else {
                console.log('[Phantom Console] Fetch error:', response.status);
            }
        } catch (error) {
            console.log('[Phantom Console] Fetch error:', error);
        } finally {
            __phantomFetchBusy = false;
        }
    };

    // Auto-refresh polling for phantom console data
    let autoRefreshInterval = null;
    let isAutoRefreshEnabled = true;
    
    function startAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        
        if (isAutoRefreshEnabled) {
            autoRefreshInterval = setInterval(async () => {
                try {
                    // Refresh only when tab is visible to user
                    if (document.visibilityState === 'visible') {
                        console.log('[Phantom Console] Auto-refreshing data...');
                        await window.fetchPhantomConsoleData();
                    }
                } catch (error) {
                    console.log('[Phantom Console] Auto-refresh error:', error);
                }
            }, 5000); // Refresh every 5 seconds
        }
    }
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Add toggle for auto-refresh
    window.toggleAutoRefresh = function(enabled) {
        isAutoRefreshEnabled = enabled;
        if (enabled) {
            startAutoRefresh();
            console.log('[Phantom Console] Auto-refresh enabled');
        } else {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
            console.log('[Phantom Console] Auto-refresh disabled');
        }
    };
    
    // Create the panel (ghostTab is already verified above)
    const panel = document.createElement('div');
    panel.id = 'phantom-console';
    panel.className = 'phantom-console';
    
    // Get saved width from localStorage or use default
    const savedWidth = parseInt(localStorage.getItem('phantom-console-width')) || 600;
    
    panel.style.cssText = `
        position: fixed;
        top: 0;
        right: -${savedWidth}px;
        width: ${savedWidth}px;
        height: 100vh;
        background: rgba(20, 20, 20, 0.98);
        border-left: 1px solid #333;
        z-index: 1000;
        transition: right 0.3s ease-out;
        overflow-y: auto;
    `;
    
    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.id = 'phantom-resize-handle';
    resizeHandle.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 6px;
        height: 100%;
        background: transparent;
        cursor: ew-resize;
        z-index: 1001;
        transition: background 0.2s;
    `;
    
    // Add hover effect
    resizeHandle.addEventListener('mouseenter', () => {
        resizeHandle.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    
    resizeHandle.addEventListener('mouseleave', () => {
        if (!isResizing) {
            resizeHandle.style.background = 'transparent';
        }
    });
    
    // Resize functionality
    let isResizing = false;
    let startX = 0;
    let startWidth = savedWidth;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.pageX;
        startWidth = parseInt(panel.style.width);
        
        // Add resizing class for visual feedback
        panel.classList.add('resizing');
        resizeHandle.style.background = 'rgba(255, 255, 255, 0.3)';
        
        // Disable transitions during resize
        panel.style.transition = 'none';
        const mainContent = document.querySelector('.chat-container') || document.querySelector('main');
        if (mainContent) {
            mainContent.style.transition = 'none';
        }
        
        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaX = startX - e.pageX;
        let newWidth = startWidth + deltaX;
        
        // Enforce min/max constraints
        newWidth = Math.max(300, Math.min(1200, newWidth));
        
        // Update panel width
        panel.style.width = newWidth + 'px';
        
        // Update main content margin if panel is open
        if (panel.style.right === '0px') {
            const mainContent = document.querySelector('.chat-container') || document.querySelector('main');
            if (mainContent) {
                mainContent.style.marginRight = newWidth + 'px';
            }
        }
        
        // Update the right position when closed to match new width
        if (panel.style.right !== '0px') {
            panel.style.right = `-${newWidth}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        
        isResizing = false;
        panel.classList.remove('resizing');
        resizeHandle.style.background = 'transparent';
        
        // Re-enable transitions
        panel.style.transition = 'right 0.3s ease-out';
        const mainContent = document.querySelector('.chat-container') || document.querySelector('main');
        if (mainContent) {
            mainContent.style.transition = 'margin-right 0.3s ease-out';
        }
        
        // Reset cursor
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        // Save the new width to localStorage
        const finalWidth = parseInt(panel.style.width);
        localStorage.setItem('phantom-console-width', finalWidth);
    });
    
    // Create panel content container
    const contentContainer = document.createElement('div');
    contentContainer.innerHTML = `
        <div style="padding: 15px; color: white; height: 100%; display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <h2 style="color: #FFFFFF; margin: 0; font-size: 20px;">Phantom Console</h2>
            </div>
            
            <div style="margin-bottom: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 10px; padding: 4px; display: flex; gap: 4px; width: 100%;">
                <button class="tab-btn active" data-tab="workspace" style="flex: 1 1 0; min-width: 0; padding: 6px 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.3); color: white; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: -0.5px; transition: all 0.3s ease; position: relative; overflow: hidden; white-space: nowrap; text-align: center; display: flex; align-items: center; justify-content: center;">
                    <span style="position: relative; z-index: 1; display: block; width: 100%; text-align: center;">Workspace</span>
                    <div class="shimmer-overlay" style="position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent); animation: shimmer 3s infinite; border-radius: 8px;"></div>
                    <div class="shimmer-line" style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent); animation: shimmer 3s infinite;"></div>
                </button>
                <button class="tab-btn" data-tab="operations" style="flex: 1 1 0; min-width: 0; padding: 6px 8px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); color: #999; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: -0.5px; transition: all 0.3s ease; position: relative; overflow: hidden; white-space: nowrap; text-align: center; display: flex; align-items: center; justify-content: center;">
                    <span style="position: relative; z-index: 1; display: block; width: 100%; text-align: center;">Operations</span>
                </button>
                <button class="tab-btn" data-tab="presentations" style="flex: 1 1 0; min-width: 0; padding: 6px 8px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); color: #999; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: -0.5px; transition: all 0.3s ease; position: relative; overflow: hidden; white-space: nowrap; text-align: center; display: flex; align-items: center; justify-content: center;">
                    <span style="position: relative; z-index: 1; display: block; width: 100%; text-align: center;">Slides</span>
                </button>
                <button class="tab-btn" data-tab="designs" style="flex: 1 1 0; min-width: 0; padding: 6px 8px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); color: #999; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: -0.5px; transition: all 0.3s ease; position: relative; overflow: hidden; white-space: nowrap; text-align: center; display: flex; align-items: center; justify-content: center;">
                    <span style="position: relative; z-index: 1; display: block; width: 100%; text-align: center;">Designs</span>
                </button>
            </div>
            
            <style>
                /* Remove blue focus outline */
                button:focus,
                button:focus-visible,
                .tab-btn:focus,
                .tab-btn:focus-visible,
                .filter-chip:focus,
                .filter-chip:focus-visible {
                    outline: none !important;
                    box-shadow: none !important;
                }
                
                .tab-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .tab-btn.active::before {
                    opacity: 1;
                    animation: shimmer 3s infinite;
                }
                
                .tab-btn:hover:not(.active) {
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #FFFFFF !important;
                }
                
                .tab-btn:focus {
                    outline: none !important;
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
                }
                
                .tab-btn:focus-visible {
                    outline: none !important;
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
                }
                
                button:focus {
                    outline: none !important;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            </style>
            
            <div class="tab-content" data-tab="workspace" style="display: block; height: calc(100% - 60px); overflow: hidden;">
                <div style="height: 100%; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 style="color: white; font-size: 16px; flex-shrink: 0; margin: 0;">📊 Visual Output Studio</h3>
                        <button onclick="window.phantomConsole.deleteAllCharts()" style="padding: 6px 12px; background: #8B0000; border: 1px solid #A52A2A; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.background='#A52A2A'" onmouseout="this.style.background='#8B0000'">
                            🗑️ Delete All
                        </button>
                    </div>
                    
                    <!-- Placeholder for new enhanced filters -->
                    <div id="phantom-filters-container" style="margin-bottom: 12px; flex-shrink: 0; min-height: 80px;">
                        <!-- Enhanced filters will be injected here -->
                    </div>
                    
                    <!-- Visualization Display Area -->
                    <div id="visualization-container" style="flex: 1; overflow: hidden; background: #0a0a0a; border: 1px solid #333; border-radius: 8px; position: relative; display: flex; flex-direction: column; margin-top: 0px;">
                    <!-- Empty State -->
                    <div id="viz-empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                        <div style="color: #666; font-size: 48px; margin-bottom: 15px;">📊</div>
                        <h4 style="color: #888; font-size: 16px; margin-bottom: 8px;">No Visualizations Yet</h4>
                        <p style="color: #666; font-size: 13px; max-width: 300px; line-height: 1.5;">
                            Ask Ghost to create charts, graphs, tables, or presentations. They'll appear here automatically!
                        </p>
                        <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border: 1px solid #333; border-radius: 6px; max-width: 350px;">
                            <p style="color: #FFFFFF; font-size: 12px; margin-bottom: 8px;">💡 Try asking Ghost:</p>
                            <ul style="color: #888; font-size: 11px; text-align: left; list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: 4px;">• "Create a bar chart of sales data"</li>
                                <li style="margin-bottom: 4px;">• "Generate a pie chart showing market share"</li>
                                <li style="margin-bottom: 4px;">• "Build a data table from this CSV"</li>
                                <li>• "Make a slide presentation about X"</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Filtered Empty State -->
                    <div id="viz-filtered-empty" style="display: none; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                        <div style="color: #666; font-size: 48px; margin-bottom: 15px;">
                            <span id="filter-empty-icon">📊</span>
                        </div>
                        <h4 style="color: #888; font-size: 16px; margin-bottom: 8px;">
                            No <span id="filter-empty-type">items</span> Yet
                        </h4>
                        <p style="color: #666; font-size: 13px; max-width: 300px; line-height: 1.5;">
                            <span id="filter-empty-message">Ask Ghost to create content for this category.</span>
                        </p>
                    </div>
                    
                    <!-- Visualization Grid (hidden by default) -->
                    <div id="viz-grid" style="display: none; padding: 15px; overflow-y: auto; height: 100%;">
                        <div id="viz-grid-inner" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; align-content: start;">
                            <!-- Visualizations will be dynamically added here -->
                        </div>
                    </div>
                </div>
            </div>
            </div>
            
            <div class="tab-content" data-tab="operations" style="display: none; height: calc(100% - 120px); overflow: hidden;">
                <!-- Default Operations Display -->
                <div id="operations-default" style="height: 100%; display: flex; flex-direction: column; gap: 8px;">
                    <!-- Browser Display Section -->
                    <div style="flex: 1 1 auto; display: flex; flex-direction: column; overflow: hidden;">
                        <!-- Agent Ghost Title -->
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0;">
                            <style>
                                @keyframes ghostFloat {
                                    0%, 100% { transform: translateY(0); }
                                    50% { transform: translateY(-15px); }
                                }
                                @keyframes pulse {
                                    0%, 100% { opacity: 1; transform: scale(1); }
                                    50% { opacity: 0.5; transform: scale(1.3); }
                                }
                            </style>
                            <div style="color: #FFD700; font-size: 24px; font-weight: 700; text-shadow: 0 0 25px rgba(255, 215, 0, 0.4); letter-spacing: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">AGENT GHOST</div>
                        </div>
                        
                        <div id="operations-browser-container" style="flex: 1; display: flex; min-height: 625px; align-items: center; justify-content: center; padding: 8px; background: #000; border-radius: 36px; position: relative;">
                            <!-- Ghost Image Inside Container -->
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <img src="/ghostvibe.png" alt="Ghost" onerror="this.src='/images/newghost.png'" style="width: 120px; height: 120px; object-fit: contain; animation: ghostFloat 3s ease-in-out infinite;">
                                <div style="color: rgba(255, 255, 255, 0.5); font-size: 13px; margin-top: 20px;">
                                    <span style="width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; display: inline-block; margin-right: 8px;"></span>
                                    <span>Waiting for browser session</span>
                                </div>
                            </div>
                            <!-- E2B Canvas Viewer -->
                            <iframe 
                                id="operations-browser-iframe" 
                                src="/operations-e2b-simple.html"
                                style="width: 100%; height: 100%; border: none; background: #000; border-radius: 36px; position: absolute; top: 0; left: 0; display: none;" 
                                allow="fullscreen; clipboard-read; clipboard-write"
                                allowfullscreen="true"
                                webkitallowfullscreen="true"
                                mozallowfullscreen="true"
                                referrerpolicy="no-referrer-when-downgrade"
                                onload="this.style.display = 'block';">
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" data-tab="presentations" style="display: none; height: calc(100% - 60px); overflow: hidden;">
                <div style="height: 100%; display: flex; flex-direction: column;">
                    <!-- Presentation Header -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <h3 id="presentation-title" style="color: white; margin: 0; font-size: 16px;">🎯 AI Presentations</h3>
                        <div id="presentation-actions" style="display: none; gap: 8px;">
                            <button class="pres-action-btn" onclick="window.phantomConsole.exportPresentation('pdf')" style="padding: 6px 12px; background: #1a1a1a; border: 1px solid #333; color: #888; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                📄 Export PDF
                            </button>
                            <button class="pres-action-btn" onclick="window.phantomConsole.exportPresentation('pptx')" style="padding: 6px 12px; background: #1a1a1a; border: 1px solid #333; color: #888; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                📊 Export PPTX
                            </button>
                        </div>
                    </div>

                    <!-- Progress Bar (shown during generation) -->
                    <div id="presentation-progress" style="display: none; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span id="progress-status" style="color: #888; font-size: 12px;">Generating outline...</span>
                            <span id="progress-count" style="color: #888; font-size: 12px;">0/8</span>
                        </div>
                        <div style="width: 100%; height: 4px; background: #1a1a1a; border-radius: 2px; overflow: hidden;">
                            <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4A90E2, #357ABD); transition: width 0.3s;"></div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div id="presentation-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 12px;">
                        <!-- Sub-tabs at top -->
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <button class="pres-tab active" data-pres-tab="preview" style="padding: 8px 16px; background: #1a1a1a; border: 1px solid #333; color: white; border-radius: 4px; cursor: pointer; font-size: 13px;">
                                Preview
                            </button>
                            <button class="pres-tab" data-pres-tab="edit" style="padding: 8px 16px; background: transparent; border: 1px solid #222; color: #888; border-radius: 4px; cursor: pointer; font-size: 13px;">
                                Edit
                            </button>
                            <button class="pres-tab" data-pres-tab="code" style="padding: 8px 16px; background: transparent; border: 1px solid #222; color: #888; border-radius: 4px; cursor: pointer; font-size: 13px;">
                                Code
                            </button>
                            <button class="pres-tab" data-pres-tab="thinking" style="padding: 8px 16px; background: transparent; border: 1px solid #222; color: #888; border-radius: 4px; cursor: pointer; font-size: 13px;">
                                Thinking
                            </button>
                        </div>

                        <!-- Main presentation area -->
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 12px; overflow: hidden;">
                            <!-- Presentation viewer - takes up most space -->
                            <div id="pres-preview" class="pres-content" style="flex: 1; background: #0a0a0a; border: 1px solid #333; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 20px;">
                                <div id="presentation-wrapper" style="width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center;">
                                    <iframe id="presentation-frame" style="width: 1280px; height: 720px; border: none; transform-origin: center center;" sandbox="allow-scripts allow-same-origin"></iframe>
                                </div>
                            </div>
                            
                            <div id="pres-edit" class="pres-content" style="display: none; flex: 1; background: #0a0a0a; border: 1px solid #333; border-radius: 8px; overflow: hidden; flex-direction: column;">
                                <!-- Editor Toolbar -->
                                <div id="editor-toolbar" style="background: #1a1a1a; border-bottom: 1px solid #333; padding: 6px; display: flex; gap: 6px; align-items: center;">
                                    <button id="add-slide-btn" style="padding: 6px 10px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap;">
                                        ➕ Add Slide
                                    </button>
                                    <button id="delete-slide-btn" style="padding: 6px 10px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                        🗑️ Delete
                                    </button>
                                    <button id="duplicate-slide-btn" style="padding: 6px 10px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                        📋 Duplicate
                                    </button>
                                    <div style="border-left: 1px solid #333; height: 16px;"></div>
                                    <button id="undo-btn" style="padding: 6px 10px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;" disabled>
                                        ↩️ Undo
                                    </button>
                                    <button id="redo-btn" style="padding: 6px 10px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;" disabled>
                                        ↪️ Redo
                                    </button>
                                    <div style="flex: 1;"></div>
                                    <button id="save-presentation-btn" style="padding: 6px 14px; background: #4A90E2; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                        💾 Save
                                    </button>
                                </div>
                                
                                <!-- Rich Text Editor Toolbar -->
                                <div id="text-toolbar" style="background: #151515; border-bottom: 1px solid #333; padding: 6px; display: flex; gap: 3px; align-items: center;">
                                    <button class="text-tool" data-command="bold" title="Bold" style="width: 28px; height: 28px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 11px;">B</button>
                                    <button class="text-tool" data-command="italic" title="Italic" style="width: 28px; height: 28px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 3px; cursor: pointer; font-style: italic; font-size: 11px;">I</button>
                                    <button class="text-tool" data-command="underline" title="Underline" style="width: 28px; height: 28px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 3px; cursor: pointer; text-decoration: underline; font-size: 11px;">U</button>
                                    <div style="border-left: 1px solid #333; height: 14px; margin: 0 3px;"></div>
                                    <select id="heading-select" style="padding: 3px 6px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 3px; font-size: 11px; height: 28px;">
                                        <option value="">Normal</option>
                                        <option value="h1">H1</option>
                                        <option value="h2">H2</option>
                                        <option value="h3">H3</option>
                                    </select>
                                    <div style="border-left: 1px solid #333; height: 14px; margin: 0 3px;"></div>
                                    <button class="text-tool" data-command="insertUnorderedList" title="Bullet List" style="width: 28px; height: 28px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 3px; cursor: pointer; font-size: 11px;">•</button>
                                    <button class="text-tool" data-command="insertOrderedList" title="Numbered List" style="width: 28px; height: 28px; background: #2a2a2a; border: 1px solid #333; color: white; border-radius: 3px; cursor: pointer; font-size: 11px;">1.</button>
                                    <div style="border-left: 1px solid #333; height: 14px; margin: 0 3px;"></div>
                                    <input type="color" id="text-color" title="Text Color" style="width: 28px; height: 28px; padding: 2px; background: #2a2a2a; border: 1px solid #333; border-radius: 3px; cursor: pointer;">
                                    <input type="color" id="bg-color" title="Background Color" style="width: 28px; height: 28px; padding: 2px; background: #2a2a2a; border: 1px solid #333; border-radius: 3px; cursor: pointer;">
                                </div>
                                
                                <!-- Editor Content Area -->
                                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                                    <!-- Slide Editor takes full width -->
                                    <div style="flex: 1; padding: 8px; overflow: hidden; display: flex;">
                                        <div id="slide-editor" contenteditable="true" style="
                                            flex: 1;
                                            background: #1a1a1a;
                                            border: 1px solid #333;
                                            border-radius: 8px;
                                            padding: 12px;
                                            color: white;
                                            font-size: 14px;
                                            line-height: 1.4;
                                            outline: none;
                                            overflow-y: auto;
                                            max-height: 100%;
                                        " data-placeholder="Start typing your slide content..."></div>
                                    </div>
                                    
                                    <!-- Bottom slide navigator with actual previews -->
                                    <div id="slide-editor-nav" style="height: 80px; background: #0a0a0a; border-top: 1px solid #333; overflow-x: auto; overflow-y: hidden; padding: 5px;">
                                        <div id="editor-slide-list" style="display: flex; gap: 5px; height: 100%;"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="pres-code" class="pres-content" style="display: none; flex: 1; background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 15px; overflow: auto;">
                                <pre style="color: #e0e0e0; font-family: 'SF Mono', monospace; font-size: 12px; margin: 0;"><code id="presentation-code"></code></pre>
                            </div>
                            
                            <div id="pres-thinking" class="pres-content" style="display: none; flex: 1; background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 15px; overflow: auto;">
                                <div id="presentation-thinking" style="color: #888; font-size: 13px; line-height: 1.6;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div id="presentation-empty" style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center;">
                        <div>
                            <div style="font-size: 48px; margin-bottom: 12px;">📑</div>
                            <p style="color: #888; font-size: 14px;">No presentation active</p>
                            <p style="color: #666; font-size: 12px; margin-top: 8px;">Ask Ghost to create a presentation to get started</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" data-tab="designs" style="display: none; height: 100%; padding: 0; margin: 0; overflow: hidden;">
                <div style="height: 100%; display: flex; flex-direction: column; padding: 0; margin: 0;">
                    <!-- Clean container for iframe only -->
                    <div id="designs-browser-container" style="flex: 1; display: flex; min-height: 625px; position: relative;">
                        <!-- Design Studio Frame - Visible by default -->
                        <iframe 
                            id="designs-browser-iframe"
                            src="design-complete.html"
                            style="width: 100%; height: 100%; border: none; background: white;"
                            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone"
                        ></iframe>
                    </div>
                </div>
            </div>
            
            <!-- Slides Tab - REMOVED OLD RECURSIVE CONTENT -->
            <div class="tab-content" data-tab="slides" style="display: none; height: calc(100% - 120px); overflow: hidden;">
                <!-- Empty State with Dyad Integration -->
                    <div id="design-empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                        <div style="color: #666; font-size: 48px; margin-bottom: 15px;">🎨</div>
                        <h4 style="color: #888; font-size: 16px; margin-bottom: 8px;">Design Studio</h4>
                        <p style="color: #666; font-size: 13px; max-width: 400px; line-height: 1.5;">
                            Create websites and apps through natural language or use Dyad's visual interface directly.
                        </p>
                        
                        <!-- Dyad Integration Panel -->
                        <div style="margin-top: 25px; display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                            <!-- Ghost AI Creation -->
                            <div style="padding: 20px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; max-width: 200px; text-align: center;">
                                <div style="font-size: 24px; margin-bottom: 10px;">🤖</div>
                                <h5 style="color: #FFFFFF; font-size: 13px; margin-bottom: 8px; font-weight: 600;">AI-Powered</h5>
                                <p style="color: #888; font-size: 11px; line-height: 1.4; margin-bottom: 12px;">Ask Ghost to create websites, apps, and components using natural language.</p>
                                <div style="color: #666; font-size: 10px; text-align: left;">
                                    <div>• "Create a SaaS landing page"</div>
                                    <div>• "Build a task manager app"</div>
                                    <div>• "Design a pricing section"</div>
                                </div>
                            </div>
                            
                            <!-- Dyad Direct Access -->
                            <div style="padding: 20px; background: #1a1a1a; border: 1px solid #4A90E2; border-radius: 8px; max-width: 200px; text-align: center;">
                                <div style="font-size: 24px; margin-bottom: 10px;">🎨</div>
                                <h5 style="color: #FFFFFF; font-size: 13px; margin-bottom: 8px; font-weight: 600;">Dyad Studio</h5>
                                <p style="color: #888; font-size: 11px; line-height: 1.4; margin-bottom: 12px;">Access Dyad's visual interface for hands-on design control.</p>
                                <button id="open-dyad-btn" style="background: #4A90E2; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: 600;">
                                    Launch Dyad Studio
                                </button>
                                <button id="embed-dyad-btn" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: 600; margin-top: 4px;">
                                    Embed Full Dyad
                                </button>
                                <div style="margin-top: 8px; color: #666; font-size: 9px;" id="dyad-status">
                                    Checking connection...
                                </div>
                            </div>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div style="margin-top: 25px; padding: 15px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; max-width: 400px;">
                            <p style="color: #FFFFFF; font-size: 12px; margin-bottom: 10px; font-weight: 600;">Quick Start:</p>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
                                <button class="quick-design-btn" data-prompt="Create a modern SaaS landing page" style="background: transparent; border: 1px solid #333; color: #888; padding: 6px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                    🏢 SaaS Landing Page
                                </button>
                                <button class="quick-design-btn" data-prompt="Build a task management web app" style="background: transparent; border: 1px solid #333; color: #888; padding: 6px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                    📝 Task Manager App
                                </button>
                                <button class="quick-design-btn" data-prompt="Design a pricing table component" style="background: transparent; border: 1px solid #333; color: #888; padding: 6px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                    💰 Pricing Component
                                </button>
                                <button class="quick-design-btn" data-prompt="Create a portfolio website" style="background: transparent; border: 1px solid #333; color: #888; padding: 6px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                    🎨 Portfolio Site
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filtered Empty State -->
                    <div id="design-filtered-empty" style="display: none; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                        <div style="color: #666; font-size: 48px; margin-bottom: 15px;">
                            <span id="design-filter-empty-icon">🎨</span>
                        </div>
                        <h4 style="color: #888; font-size: 16px; margin-bottom: 8px;">
                            No <span id="design-filter-empty-type">items</span> Yet
                        </h4>
                        <p style="color: #666; font-size: 13px; max-width: 300px; line-height: 1.5;">
                            <span id="design-filter-empty-message">Ask Ghost to create content for this category.</span>
                        </p>
                    </div>
                    
                    <!-- Design Grid (hidden by default) -->
                    <div id="design-grid" style="display: none; padding: 15px; overflow-y: auto; height: 100%;">
                        <div id="design-grid-inner" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; align-content: start;">
                            <!-- Designs will be dynamically added here -->
                        </div>
                    </div>
                    
                    <!-- Polished Design Interface -->
                    <div id="polished-design-interface" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0a0a0a; z-index: 10000;">
                        
                        <!-- CSS Animations -->
                        <style>
                            @keyframes pulse {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0.5; }
                            }
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                            .design-tool-btn:hover {
                                transform: translateY(-1px);
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                            }
                            #design-deploy-btn:hover {
                                background: linear-gradient(135deg, #5A9FE7, #4681C4) !important;
                                transform: translateY(-1px);
                                box-shadow: 0 8px 20px rgba(74, 144, 226, 0.3);
                            }
                        </style>
                        
                        <!-- Professional Header Bar -->
                        <div style="height: 60px; background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; padding: 0 24px;">
                            
                            <!-- Left: Logo & Title -->
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 8px; height: 8px; background: linear-gradient(45deg, #4A90E2, #357ABD); border-radius: 50%; animation: pulse 2s infinite;"></div>
                                    <span style="color: #ffffff; font-size: 16px; font-weight: 600; letter-spacing: -0.02em;">Design Studio</span>
                                </div>
                                <div style="height: 20px; width: 1px; background: rgba(255, 255, 255, 0.1);"></div>
                                <div style="color: #888; font-size: 13px;" id="design-project-name">Untitled Project</div>
                            </div>
                            
                            <!-- Center: Design Tools -->
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <button id="design-undo-btn" class="design-tool-btn" style="padding: 8px 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #ccc; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                                    ↶ Undo
                                </button>
                                <button id="design-redo-btn" class="design-tool-btn" style="padding: 8px 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #ccc; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                                    ↷ Redo
                                </button>
                                <div style="height: 20px; width: 1px; background: rgba(255, 255, 255, 0.1);"></div>
                                <button id="design-preview-btn" class="design-tool-btn" style="padding: 8px 12px; background: rgba(74, 144, 226, 0.1); border: 1px solid rgba(74, 144, 226, 0.3); border-radius: 6px; color: #4A90E2; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                                    👁 Preview
                                </button>
                            </div>
                            
                            <!-- Right: Actions -->
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <button id="design-save-btn" style="padding: 8px 16px; background: rgba(74, 144, 226, 0.15); border: 1px solid #4A90E2; border-radius: 6px; color: #4A90E2; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;">
                                    💾 Save
                                </button>
                                <button id="design-deploy-btn" style="padding: 8px 16px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 6px; color: white; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;">
                                    🚀 Deploy
                                </button>
                                <div style="height: 20px; width: 1px; background: rgba(255, 255, 255, 0.1); margin: 0 4px;"></div>
                                <button id="design-close-btn" style="padding: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #999; cursor: pointer; transition: all 0.2s ease;">
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        <!-- Main Design Canvas -->
                        <div style="height: calc(100vh - 60px); display: flex;">
                            
                            <!-- Website Preview Area -->
                            <div id="design-canvas-container" style="flex: 1; background: #111; position: relative; overflow: hidden;">
                                
                                <!-- Canvas Toolbar -->
                                <div style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; align-items: center; gap: 8px; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 6px 12px;">
                                    <button class="viewport-btn active" data-viewport="desktop" style="padding: 4px 8px; background: rgba(74, 144, 226, 0.2); border: 1px solid #4A90E2; border-radius: 4px; color: #4A90E2; font-size: 10px; cursor: pointer;">🖥 Desktop</button>
                                    <button class="viewport-btn" data-viewport="tablet" style="padding: 4px 8px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: #999; font-size: 10px; cursor: pointer;">📱 Tablet</button>
                                    <button class="viewport-btn" data-viewport="mobile" style="padding: 4px 8px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: #999; font-size: 10px; cursor: pointer;">📱 Mobile</button>
                                </div>
                                
                                <!-- Website Iframe -->
                                <div id="design-iframe-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 60px 40px 40px;">
                                    <div style="width: 100%; height: 100%; max-width: 1200px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); transition: all 0.3s ease;" id="design-iframe-container">
                                        <iframe 
                                            id="design-canvas-iframe"
                                            src="about:blank" 
                                            style="width: 100%; height: 100%; border: none;"
                                            allow="fullscreen">
                                        </iframe>
                                    </div>
                                </div>
                                
                                <!-- Element Selector Overlay -->
                                <div id="element-selector-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 200;"></div>
                                
                            </div>
                            
                        </div>
                        
                        <!-- AI Edit Popup (hidden by default) -->
                        <div id="ai-edit-popup" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 480px; background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); z-index: 10001;">
                            
                            <!-- Popup Header -->
                            <div style="padding: 20px 24px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 6px; height: 6px; background: linear-gradient(45deg, #4A90E2, #357ABD); border-radius: 50%;"></div>
                                        <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0;">Edit with AI</h3>
                                    </div>
                                    <button id="ai-popup-close" style="padding: 4px; background: none; border: none; color: #999; cursor: pointer; font-size: 14px;">✕</button>
                                </div>
                                <p style="color: #888; font-size: 13px; margin: 0 0 16px; line-height: 1.4;">Describe how you'd like to modify this element. Ghost will understand and make the changes.</p>
                            </div>
                            
                            <!-- Popup Content -->
                            <div style="padding: 20px 24px;">
                                <textarea id="ai-edit-input" placeholder="e.g. 'Make this heading blue and larger' or 'Add a subtle shadow to this card'" style="width: 100%; height: 80px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 12px; color: white; font-size: 14px; resize: none; font-family: inherit;" spellcheck="false"></textarea>
                                
                                <!-- Action Buttons -->
                                <div style="display: flex; gap: 12px; margin-top: 16px;">
                                    <button id="ai-edit-cancel" style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #ccc; cursor: pointer; font-size: 13px;">Cancel</button>
                                    <button id="ai-edit-apply" style="flex: 2; padding: 10px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px; font-weight: 500;">Apply Changes</button>
                                </div>
                            </div>
                            
                        </div>
                        
                        <!-- Loading States -->
                        <div id="design-loading" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px); z-index: 10002; display: flex; align-items: center; justify-content: center;">
                            <div style="text-align: center;">
                                <div style="width: 40px; height: 40px; border: 2px solid rgba(74, 144, 226, 0.2); border-top: 2px solid #4A90E2; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                                <div style="color: white; font-size: 14px; font-weight: 500;" id="design-loading-text">Processing...</div>
                                <div style="color: #888; font-size: 12px; margin-top: 4px;" id="design-loading-subtitle">Please wait</div>
                            </div>
                        </div>
                        
                    </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Append content to panel (after resize handle)
    panel.appendChild(contentContainer);
    panel.appendChild(resizeHandle);
    
    document.body.appendChild(panel);
    
    // Initialize enhanced filters
    setTimeout(() => {
        if (window.phantomFilters && window.phantomFilters.init) {
            const filterContainer = document.getElementById('phantom-filters-container');
            if (filterContainer) {
                window.phantomFilters.init(filterContainer);
            }
        }
        
        // Initialize design filters
        const designFilterContainer = document.getElementById('design-filters-container');
        if (designFilterContainer) {
            initDesignFilters(designFilterContainer);
        }
    }, 100);
    
    // Add presentation sub-tab handlers
    panel.addEventListener('click', function(e) {
        if (e.target.classList.contains('pres-tab')) {
            const tab = e.target.getAttribute('data-pres-tab');
            
            // Update tab styles
            panel.querySelectorAll('.pres-tab').forEach(t => {
                t.classList.remove('active');
                t.style.background = 'transparent';
                t.style.border = '1px solid #222';
                t.style.color = '#888';
            });
            
            e.target.classList.add('active');
            e.target.style.background = '#1a1a1a';
            e.target.style.border = '1px solid #333';
            e.target.style.color = 'white';
            
            // Update content visibility
            panel.querySelectorAll('.pres-content').forEach(content => {
                content.style.display = 'none';
            });
            
            const contentId = `pres-${tab}`;
            const content = document.getElementById(contentId);
            if (content) {
                content.style.display = 'flex';
                
                // Special handling for edit tab
                if (tab === 'edit' && window.phantomConsole && window.phantomConsole.presentations.active) {
                    // Initialize editor if not already done
                    if (!window.phantomConsole.presentations.active.editorInitialized) {
                        setTimeout(() => {
                            window.phantomConsole.initializePresentationEditor();
                            window.phantomConsole.presentations.active.editorInitialized = true;
                        }, 100);
                    }
                }
            }
        }
    });
    
    // Tab switching
    const tabButtons = panel.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        // Add hover effect - no blue!
        btn.addEventListener('mouseover', function() {
            if (!this.classList.contains('active')) {
                this.style.background = 'rgba(255, 255, 255, 0.08)';
                this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                this.style.color = 'rgba(255, 255, 255, 0.9)';
            }
        });
        btn.addEventListener('mouseout', function() {
            if (!this.classList.contains('active')) {
                this.style.background = 'transparent';
                this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                this.style.color = '#999';
            }
        });
        
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Update buttons with transparent style and enhanced shimmer
            tabButtons.forEach(b => {
                b.style.background = 'transparent';
                b.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                b.style.color = '#999';
                b.style.padding = '8px 10px';
                b.style.fontSize = '12px';
                b.style.display = 'flex';
                b.style.alignItems = 'center';
                b.style.justifyContent = 'center';
                b.classList.remove('active');
                // Remove shimmer overlays from inactive buttons
                const overlays = b.querySelectorAll('.shimmer-overlay, .shimmer-line');
                overlays.forEach(o => o.remove());
            });
            
            // Active button with enhanced shimmer
            this.style.background = 'rgba(255, 255, 255, 0.05)';
            this.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            this.style.color = 'white';
            this.style.padding = '8px 10px';
            this.style.fontSize = '12px';
            this.style.display = 'flex';
            this.style.alignItems = 'center';
            this.style.justifyContent = 'center';
            this.classList.add('active');
            
            // Add shimmer effects to active button
            if (!this.querySelector('.shimmer-overlay')) {
                const shimmerOverlay = document.createElement('div');
                shimmerOverlay.className = 'shimmer-overlay';
                shimmerOverlay.style.cssText = 'position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent); animation: shimmer 3s infinite;';
                this.appendChild(shimmerOverlay);
                
                const shimmerLine = document.createElement('div');
                shimmerLine.className = 'shimmer-line';
                shimmerLine.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent); animation: shimmer 3s infinite;';
                this.appendChild(shimmerLine);
            }
            
            // Update content
            panel.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const targetContent = panel.querySelector(`.tab-content[data-tab="${targetTab}"]`);
            if (targetContent) {
                targetContent.style.display = 'block';
                // Store active tab in memory
                window.phantomActiveTab = targetTab;
                
                // Fix iframe rendering when switching tabs
                // Force refresh iframes after tab switch to fix rendering issues
                setTimeout(() => {
                    targetContent.querySelectorAll('iframe').forEach(iframe => {
                        // Force iframe to re-render by resetting its src
                        const currentSrc = iframe.src;
                        iframe.src = '';
                        iframe.src = currentSrc;
                    });
                }, 100);
            }
        });
    });
    
    // Visualization filter buttons
    const vizFilters = panel.querySelectorAll('.viz-filter');
    vizFilters.forEach(btn => {
        // Add hover effect - no blue!
        btn.addEventListener('mouseover', function() {
            if (!this.classList.contains('active')) {
                this.style.background = 'rgba(255, 255, 255, 0.08)';
                this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                this.style.color = 'rgba(255, 255, 255, 0.9)';
            }
        });
        btn.addEventListener('mouseout', function() {
            if (!this.classList.contains('active')) {
                this.style.background = 'transparent';
                this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                this.style.color = '#999';
            }
        });
        
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update button states
            vizFilters.forEach(b => {
                b.style.background = 'transparent';
                b.style.borderColor = '#333';
                b.style.color = '#888';
                b.style.fontWeight = '600';
                b.classList.remove('active');
            });
            this.style.background = '#FFFFFF';
            this.style.borderColor = '#FFFFFF';
            this.style.color = 'white';
            this.style.fontWeight = '600';
            this.classList.add('active');
            
            // Store active filter
            window.phantomActiveFilter = filter;
            
            // Filter visualizations
            const vizCards = panel.querySelectorAll('.viz-card');
            let visibleCount = 0;
            
            vizCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    // Check if card type matches filter
                    const cardTypes = {
                        'charts': ['chart', 'bar_chart', 'pie_chart', 'line_chart', 'image'], // Added 'image' since charts are images
                        'tables': ['table', 'data'],
                        'diagrams': ['diagram', 'map', 'dashboard'],
                        'slides': ['slide', 'presentation']
                    };
                    
                    const vizType = card.className.match(/viz-type-(\w+)/);
                    if (vizType && cardTypes[filter] && cardTypes[filter].includes(vizType[1])) {
                        card.style.display = 'block';
                        visibleCount++;
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
            
            // Handle empty states for filtered views
            const filteredEmpty = document.getElementById('viz-filtered-empty');
            const vizGrid = document.getElementById('viz-grid');
            
            if (visibleCount === 0 && filter !== 'all' && vizCards.length > 0) {
                // Show filtered empty state
                if (filteredEmpty && vizGrid) {
                    vizGrid.style.display = 'none';
                    filteredEmpty.style.display = 'flex';
                    
                    // Update empty state content based on filter
                    const filterInfo = {
                        'charts': { icon: '📈', type: 'Charts', message: 'Ask Ghost to create bar charts, line graphs, or pie charts.' },
                        'tables': { icon: '📋', type: 'Tables', message: 'Ask Ghost to generate data tables or spreadsheets.' },
                        'diagrams': { icon: '🗺️', type: 'Diagrams', message: 'Ask Ghost to create flowcharts, mind maps, or system diagrams.' },
                        'slides': { icon: '📑', type: 'Slides', message: 'Ask Ghost to build presentations or slide decks.' }
                    };
                    
                    const info = filterInfo[filter];
                    if (info) {
                        const iconEl = document.getElementById('filter-empty-icon');
                        const typeEl = document.getElementById('filter-empty-type');
                        const msgEl = document.getElementById('filter-empty-message');
                        
                        if (iconEl) iconEl.textContent = info.icon;
                        if (typeEl) typeEl.textContent = info.type;
                        if (msgEl) msgEl.textContent = info.message;
                    }
                }
            } else if (vizGrid && filteredEmpty) {
                // Show the grid
                vizGrid.style.display = 'block';
                filteredEmpty.style.display = 'none';
            }
        });
    });
    
    // Panel toggle is now handled by the global togglePhantomConsole function
    // called from Alpine.js in the HTML. No additional event handlers needed here.
    
    // Expose the loadInitialVisualizations function for use by togglePhantomConsole
    window.loadInitialVisualizations = loadInitialVisualizations;
    
    console.log('Phantom Console ready!');
    
    // Function to load initial visualizations when panel opens
    function loadInitialVisualizations() {
        console.log('[Phantom Console] Fetching visualizations from workspace_charts...');
        
        // Ensure phantomConsole is initialized first
        if (!window.phantomConsole) {
            window.phantomConsole = {
                metadata: {
                    charts: {},
                    tags: [],
                    folders: {
                        default: {
                            name: "Default",
                            charts: []
                        }
                    }
                },
                workspace: {}
            };
        }
        
        // Ensure metadata structure exists
        if (!window.phantomConsole.metadata) {
            window.phantomConsole.metadata = {
                charts: {},
                tags: [],
                folders: {
                    default: {
                        name: "Default",
                        charts: []
                    }
                }
            };
        }
        
        if (!window.phantomConsole.workspace) {
            window.phantomConsole.workspace = {};
        }
        
        fetch('/workspace_charts')
            .then(response => response.json())
            .then(data => {
                if (data && data.workspace) {
                    console.log('[Phantom Console] Loaded', data.workspace.visualizations?.length || 0, 'visualizations');
                    
                    // Store the visualizations
                    window.phantomConsole.workspace.visualizations = data.workspace.visualizations || [];
                    
                    // Update the UI
                    if (typeof updateWorkspaceTab === 'function') {
                        updateWorkspaceTab(window.phantomConsole.workspace);
                    }
                }
            })
            .catch(error => {
                console.error('[Phantom Console] Error loading visualizations:', error);
            });
    }
    
    // Add refresh button handler
    const refreshBtn = document.getElementById('phantom-refresh-btn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            console.log('[Phantom Console] Manual refresh triggered');
            
            // Visual feedback
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<span style="font-size: 14px;">⟳</span> Refreshing...';
            refreshBtn.disabled = true;
            
            window.fetchPhantomConsoleData().then(() => {
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.disabled = false;
                }, 500);
            }).catch(() => {
                // Reset button even if refresh fails
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.disabled = false;
                }, 500);
            });
        };
    }
    
    // Tag filter dropdown functionality
    const tagFilterBtn = document.getElementById('tag-filter-btn');
    const tagFilterDropdown = document.getElementById('tag-filter-dropdown');
    const tagList = document.getElementById('tag-list');
    const tagSearch = document.getElementById('tag-search');
    
    if (tagFilterBtn && tagFilterDropdown) {
        // Store active tags
        window.phantomActiveTags = [];
        
        // Toggle dropdown
        tagFilterBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = tagFilterDropdown.style.display === 'block';
            tagFilterDropdown.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                // Populate tag list
                updateTagFilterList();
            }
        };
        
        // Update tag list based on metadata
        function updateTagFilterList() {
            const allTags = window.phantomConsole?.metadata?.tags || [];
            const activeTags = window.phantomActiveTags || [];
            
            tagList.innerHTML = '';
            
            // Add "Clear All" option if tags are selected
            if (activeTags.length > 0) {
                const clearAll = document.createElement('button');
                clearAll.style.cssText = `
                    width: 100%;
                    padding: 6px 8px;
                    background: #333;
                    border: none;
                    color: #f44336;
                    text-align: left;
                    cursor: pointer;
                    font-size: 12px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                `;
                clearAll.textContent = '✕ Clear All Tags';
                clearAll.onclick = () => {
                    window.phantomActiveTags = [];
                    applyTagFilter();
                    updateTagFilterList();
                };
                tagList.appendChild(clearAll);
            }
            
            // Add tags
            allTags.forEach(tag => {
                const tagItem = document.createElement('label');
                tagItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 6px 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                    border-radius: 4px;
                `;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = activeTags.includes(tag);
                checkbox.style.cssText = 'margin-right: 8px;';
                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        if (!window.phantomActiveTags.includes(tag)) {
                            window.phantomActiveTags.push(tag);
                        }
                    } else {
                        window.phantomActiveTags = window.phantomActiveTags.filter(t => t !== tag);
                    }
                    applyTagFilter();
                };
                
                const tagLabel = document.createElement('span');
                tagLabel.style.cssText = 'color: #ccc; font-size: 12px;';
                tagLabel.textContent = tag;
                
                tagItem.appendChild(checkbox);
                tagItem.appendChild(tagLabel);
                
                tagItem.onmouseover = () => {
                    tagItem.style.background = '#333';
                };
                tagItem.onmouseout = () => {
                    tagItem.style.background = 'transparent';
                };
                
                tagList.appendChild(tagItem);
            });
        }
        
        // Apply tag filter
        function applyTagFilter() {
            const activeTags = window.phantomActiveTags || [];
            const vizCards = panel.querySelectorAll('.viz-card');
            
            // Update button state
            if (activeTags.length > 0) {
                tagFilterBtn.classList.add('active');
                tagFilterBtn.style.background = '#FFFFFF';
                tagFilterBtn.style.borderColor = '#FFFFFF';
                tagFilterBtn.style.color = 'white';
                tagFilterBtn.innerHTML = `🏷️ Tags (${activeTags.length}) <span style="font-size: 10px;">▼</span>`;
            } else {
                tagFilterBtn.classList.remove('active');
                tagFilterBtn.style.background = 'transparent';
                tagFilterBtn.style.borderColor = '#333';
                tagFilterBtn.style.color = '#888';
                tagFilterBtn.innerHTML = '🏷️ Tags <span style="font-size: 10px;">▼</span>';
            }
            
            // Filter cards
            vizCards.forEach(card => {
                if (activeTags.length === 0) {
                    // No tag filter active, use existing type filter
                    return;
                }
                
                const cardTags = JSON.parse(card.dataset.tags || '[]');
                const hasMatchingTag = activeTags.some(tag => cardTags.includes(tag));
                
                if (hasMatchingTag) {
                    // Check if it also passes the type filter
                    if (card.style.display !== 'none') {
                        card.style.display = 'block';
                    }
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        // Tag search
        if (tagSearch) {
            tagSearch.oninput = () => {
                const searchTerm = tagSearch.value.toLowerCase();
                const labels = tagList.querySelectorAll('label');
                
                labels.forEach(label => {
                    const tagText = label.querySelector('span')?.textContent.toLowerCase();
                    if (tagText && tagText.includes(searchTerm)) {
                        label.style.display = 'flex';
                    } else {
                        label.style.display = 'none';
                    }
                });
            };
        }
    }
    
    // Global click handler for dropdowns
    document.addEventListener('click', (e) => {
        // Only close dropdowns if we didn't click on a dropdown button or menu
        if (!e.target.closest('.dropdown-container')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
        
        // Close tag filter dropdown
        if (!e.target.closest('#tag-filter-btn') && !e.target.closest('#tag-filter-dropdown')) {
            if (tagFilterDropdown) {
                tagFilterDropdown.style.display = 'none';
            }
        }
    });
    
    // Initialize Design Filters
    function initDesignFilters(container) {
        const filterHTML = `
            <div class="design-filters-modern" style="background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 6px; margin-bottom: 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                <div class="design-filters-container" style="display: flex; flex-direction: column; gap: 6px; padding: 4px 0;">
                    <!-- Compact Design Selector with Actions in same row -->
                    <div class="design-selector-row" style="display: flex; gap: 6px; align-items: center;">
                        <label style="color: #999; font-size: 11px; font-weight: 500; min-width: 60px;">Design:</label>
                        <select id="design-selector" style="flex: 1; background: #2a2a2a; border: 1px solid #444; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; cursor: pointer; height: 24px;">
                            <option value="">No designs yet - Ask Ghost to create one</option>
                        </select>
                        <button class="design-refresh-btn" onclick="if(window.fetchDesignData) { this.classList.add('spinning'); window.fetchDesignData().then(() => this.classList.remove('spinning')); }" style="display: flex; align-items: center; gap: 2px; padding: 4px 8px; background: rgba(42, 42, 42, 0.8); border: 1px solid rgba(68, 68, 68, 0.6); color: #999; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s ease; height: 24px;">
                            <span class="refresh-icon" style="font-size: 12px; display: inline-block;">⟳</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                    
                    <!-- Compact Design Action Buttons in single row -->
                    <div class="design-filter-row" style="display: flex; gap: 4px; background: rgba(0, 0, 0, 0.3); border-radius: 6px; padding: 4px;">
                        <button class="design-action-chip active" data-design-action="preview" style="flex: 1; min-width: 50px; display: flex; align-items: center; justify-content: center; gap: 3px; padding: 4px 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.3); color: white; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease; height: 22px;">
                            <span style="font-size: 11px;">👁️</span>
                            <span>Preview</span>
                        </button>
                        <button class="design-action-chip" data-design-action="code" style="flex: 1; min-width: 50px; display: flex; align-items: center; justify-content: center; gap: 3px; padding: 4px 6px; background: transparent; border: 1px solid #333; color: #999; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease; height: 22px;">
                            <span style="font-size: 11px;">📄</span>
                            <span>Code</span>
                        </button>
                        <button class="design-action-chip" data-design-action="export" style="flex: 1; min-width: 50px; display: flex; align-items: center; justify-content: center; gap: 3px; padding: 4px 6px; background: transparent; border: 1px solid #333; color: #999; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease; height: 22px;">
                            <span style="font-size: 11px;">💾</span>
                            <span>Export</span>
                        </button>
                        <button class="design-action-chip" data-design-action="iterate" style="flex: 1; min-width: 50px; display: flex; align-items: center; justify-content: center; gap: 3px; padding: 4px 6px; background: transparent; border: 1px solid #333; color: #999; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease; height: 22px;">
                            <span style="font-size: 11px;">🔄</span>
                            <span>Iterate</span>
                        </button>
                        <button class="design-action-chip" data-design-action="deploy" style="flex: 1; min-width: 50px; display: flex; align-items: center; justify-content: center; gap: 3px; padding: 4px 6px; background: transparent; border: 1px solid #333; color: #999; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: all 0.2s ease; height: 22px;">
                            <span style="font-size: 11px;">🌐</span>
                            <span>Open</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
                .design-action-chip:focus,
                .design-action-chip:focus-visible {
                    outline: none !important;
                }
                
                .design-action-chip:hover {
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #FFFFFF !important;
                }
                
                .design-action-chip.active {
                    background: rgba(255, 255, 255, 0.05) !important;
                    color: #FFFFFF !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
                }
                
                .design-action-chip.active::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
                    animation: shimmer 3s infinite;
                }
                
                #design-selector:focus {
                    outline: none !important;
                    border-color: #666;
                }
                
                .design-refresh-btn:hover {
                    background: rgba(51, 51, 51, 0.9) !important;
                    border-color: rgba(255, 255, 255, 0.5) !important;
                    color: #FFFFFF !important;
                }
                
                .design-refresh-btn.spinning .refresh-icon {
                    animation: spin 1s linear infinite;
                }
            </style>
        `;
        
        container.innerHTML = filterHTML;
        
        // Fetch initial design data
        if (window.fetchDesignData) {
            window.fetchDesignData();
        }
        
        // Set up design action handlers
        const actionChips = container.querySelectorAll('.design-action-chip');
        actionChips.forEach(chip => {
            chip.addEventListener('click', function() {
                // Update active state
                actionChips.forEach(c => {
                    c.classList.remove('active');
                    c.style.background = 'transparent';
                    c.style.border = 'none';
                    c.style.color = '#999';
                });
                this.classList.add('active');
                this.style.background = 'rgba(255, 255, 255, 0.05)';
                this.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                this.style.color = 'white';
                
                const action = this.getAttribute('data-design-action');
                const selectedDesign = document.getElementById('design-selector').value;
                
                if (!selectedDesign && action !== 'preview') {
                    alert('Please select a design first');
                    return;
                }
                
                handleDesignAction(action, selectedDesign);
            });
        });
        
        // Set up design selector handler
        const designSelector = document.getElementById('design-selector');
        if (designSelector) {
            designSelector.addEventListener('change', function() {
                const selectedDesign = this.value;
                if (selectedDesign) {
                    // Load the selected design
                    loadDesign(selectedDesign);
                }
            });
        }
    }
    
    // Handle design actions
    function handleDesignAction(action, designId) {
        switch(action) {
            case 'preview':
                // Show preview in the main area
                console.log('[Design Action] Preview:', designId);
                break;
            case 'code':
                // Show code view
                console.log('[Design Action] View Code:', designId);
                showDesignCode(designId);
                break;
            case 'export':
                // Export design
                console.log('[Design Action] Export:', designId);
                exportDesign(designId);
                break;
            case 'iterate':
                // Request iteration from Ghost
                console.log('[Design Action] Iterate:', designId);
                requestDesignIteration(designId);
                break;
            case 'deploy':
                // Deploy design
                console.log('[Design Action] Deploy:', designId);
                deployDesign(designId);
                break;
        }
    }
    
    // Load a specific design
    function loadDesign(designId) {
        console.log('[Design] Loading design:', designId);
        // Find the design in the current designs
        if (window.phantomConsole && window.phantomConsole.designs) {
            const design = window.phantomConsole.designs.designs.find(d => d.id === designId);
            if (design) {
                // Display the design in the preview area
                displayDesignPreview(design);
            }
        }
    }
    
    // Apply design filter
    function applyDesignFilter(filterType) {
        const designCards = document.querySelectorAll('.design-card');
        let visibleCount = 0;
        
        designCards.forEach(card => {
            if (filterType === 'all') {
                card.style.display = 'block';
                visibleCount++;
            } else {
                const cardType = card.getAttribute('data-design-type');
                if (cardType === filterType) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }
        });
        
        // Handle empty states
        const emptyState = document.getElementById('design-empty-state');
        const filteredEmpty = document.getElementById('design-filtered-empty');
        const designGrid = document.getElementById('design-grid');
        
        if (visibleCount === 0 && filterType !== 'all' && designCards.length > 0) {
            // Show filtered empty state
            if (designGrid) designGrid.style.display = 'none';
            if (filteredEmpty) {
                filteredEmpty.style.display = 'flex';
                
                // Update empty state content based on filter
                const filterInfo = {
                    'components': { icon: '🧩', type: 'Components', message: 'Ask Ghost to design UI components like buttons, forms, or cards.' },
                    'mockups': { icon: '📱', type: 'Mockups', message: 'Ask Ghost to create app or website mockups.' },
                    'wireframes': { icon: '🗺️', type: 'Wireframes', message: 'Ask Ghost to build wireframes for your projects.' },
                    'animations': { icon: '✨', type: 'Animations', message: 'Ask Ghost to create loading animations or transitions.' }
                };
                
                const info = filterInfo[filterType];
                if (info) {
                    const iconEl = document.getElementById('design-filter-empty-icon');
                    const typeEl = document.getElementById('design-filter-empty-type');
                    const messageEl = document.getElementById('design-filter-empty-message');
                    
                    if (iconEl) iconEl.textContent = info.icon;
                    if (typeEl) typeEl.textContent = info.type;
                    if (messageEl) messageEl.textContent = info.message;
                }
            }
        }
    }
    
    // Phantom Console Data Fetching and Display
    let lastFetchTime = 0;
    let lastBrowserHash = '';
    
    function updatePhantomConsole(data) {
        console.log('[Phantom Console] Updating console with data...');
        
        // Preserve active tab state
        const activeTab = window.phantomActiveTab || 'workspace';
        
        // Preserve active filter state
        const activeFilter = window.phantomActiveFilter || 'all';
        
        // Update Workspace Tab
        if (data.workspace) {
            console.log('[Phantom Console] Updating workspace tab with visualizations:', data.workspace.visualizations?.length || 0);
            if (typeof updateWorkspaceTab === 'function') {
                updateWorkspaceTab(data.workspace);
            } else if (window.phantomConsole && typeof window.phantomConsole.updateWorkspaceTab === 'function') {
                window.phantomConsole.updateWorkspaceTab(data.workspace);
            } else {
                console.error('[Phantom Console] updateWorkspaceTab function not found!');
            }
        }
        
        // Update Operations Tab
        if (data.operations) {
            console.log('[Phantom Console] Updating operations tab...');
            // Preserve current browser session if it exists
            if (window.phantomConsole.currentBrowserSession && window.phantomConsole.currentBrowserSession.session_id) {
                data.operations.browser_session = window.phantomConsole.currentBrowserSession;
            }
            updateOperationsTab(data.operations);
        }
        
        // Update Artifacts Tab
        if (data.artifacts) {
            console.log('[Phantom Console] Updating artifacts tab...');
            updateArtifactsTab(data.artifacts);
        }
        
        // Restore active tab visibility
        panel.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        const activeContent = panel.querySelector(`.tab-content[data-tab="${activeTab}"]`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }
        
        // Ensure active button state is preserved with transparent style and shimmer
        panel.querySelectorAll('.tab-btn').forEach(btn => {
            const tab = btn.getAttribute('data-tab');
            if (tab === activeTab) {
                btn.classList.add('active');
                btn.style.background = 'rgba(255, 255, 255, 0.05)';
                btn.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                btn.style.color = 'white';
                
                // Add shimmer effects if not present
                if (!btn.querySelector('.shimmer-overlay')) {
                    const shimmerOverlay = document.createElement('div');
                    shimmerOverlay.className = 'shimmer-overlay';
                    shimmerOverlay.style.cssText = 'position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent); animation: shimmer 3s infinite;';
                    btn.appendChild(shimmerOverlay);
                    
                    const shimmerLine = document.createElement('div');
                    shimmerLine.className = 'shimmer-line';
                    shimmerLine.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent); animation: shimmer 3s infinite;';
                    btn.appendChild(shimmerLine);
                }
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                btn.style.color = '#999';
                
                // Remove shimmer overlays
                const overlays = btn.querySelectorAll('.shimmer-overlay, .shimmer-line');
                overlays.forEach(o => o.remove());
            }
        });
        
        // Restore filter state and apply filters
        if (activeTab === 'workspace' && activeFilter !== 'all') {
            // Reapply the filter
            const vizFilters = panel.querySelectorAll('.viz-filter');
            vizFilters.forEach(btn => {
                if (btn.getAttribute('data-filter') === activeFilter) {
                    btn.click(); // This will trigger the filter logic
                }
            });
        }
        
        // Check if we need to switch to Operations tab after data load
        if (window.phantomConsole._pendingOperationsSwitch) {
            console.log('[Phantom Console] Executing pending switch to Operations tab');
            window.phantomConsole._pendingOperationsSwitch = false;
            
            // Now that data is loaded, switch to Operations tab
            setTimeout(() => {
                if (window.phantomConsole && window.phantomConsole.switchToTab) {
                    window.phantomConsole.switchToTab('operations');
                    console.log('[Phantom Console] Switched to Operations tab for browser');
                }
            }, 100); // Small delay to ensure DOM is ready
        }
    }
    
    function updateWorkspaceTab(workspaceData) {
        console.log('[updateWorkspaceTab] Called with data:', workspaceData);
        const container = document.getElementById('visualization-container');
        if (!container) {
            console.error('[updateWorkspaceTab] No visualization-container found!');
            return;
        }
        
        // Check if we have visualizations
        const hasContent = (workspaceData.visualizations && workspaceData.visualizations.length > 0);
        
        if (hasContent) {
            console.log('[updateWorkspaceTab] Found content:', {
                visualizations: workspaceData.visualizations?.length || 0
            });
            
            // Hide empty states, show grid
            const emptyState = document.getElementById('viz-empty-state');
            const filteredEmpty = document.getElementById('viz-filtered-empty');
            const grid = document.getElementById('viz-grid');
            const gridInner = document.getElementById('viz-grid-inner');
            
            console.log('[updateWorkspaceTab] Elements:', {
                emptyState: !!emptyState,
                filteredEmpty: !!filteredEmpty,
                grid: !!grid,
                gridInner: !!gridInner
            });
            
            if (emptyState) emptyState.style.display = 'none';
            if (filteredEmpty) filteredEmpty.style.display = 'none';
            if (grid) {
                grid.style.display = 'block';
                
                // Clear existing content
                if (gridInner) {
                    gridInner.innerHTML = '';
                    // Add visualization cards
                    if (workspaceData.visualizations) {
                        workspaceData.visualizations.forEach(viz => {
                            const vizCard = createVisualizationCard(viz);
                            console.log('[updateWorkspaceTab] Created card:', vizCard);
                            if (vizCard) {  // Only append if not deleted
                                gridInner.appendChild(vizCard);
                                console.log('[updateWorkspaceTab] Appended card to grid');
                            } else {
                                console.log('[updateWorkspaceTab] Card was null, skipping');
                            }
                        });
                    }
                }
            }
        } else {
            // Show empty state
            const emptyState = document.getElementById('viz-empty-state');
            const filteredEmpty = document.getElementById('viz-filtered-empty');
            const grid = document.getElementById('viz-grid');
            
            if (emptyState) emptyState.style.display = 'flex';
            if (filteredEmpty) filteredEmpty.style.display = 'none';
            if (grid) grid.style.display = 'none';
        }
    }
    
    function createBrowserCard(browser) {
        console.log('[createBrowserCard] Creating browser card:', browser);
        
        const card = document.createElement('div');
        card.className = 'viz-card viz-type-browser';
        card.dataset.sessionId = browser.session_id;
        
        card.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            cursor: pointer;
            transition: all 0.2s;
            height: 340px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        `;
        
        // Header with icon and title
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px;';
        
        const icon = document.createElement('span');
        icon.style.cssText = 'font-size: 18px; margin-right: 8px;';
        icon.textContent = '🌐';
        
        const title = document.createElement('h5');
        title.style.cssText = 'color: white; font-size: 14px; margin: 0; flex: 1;';
        title.textContent = browser.title || 'Browser Session';
        
        const liveIndicator = document.createElement('span');
        liveIndicator.style.cssText = `
            background: #ef4444;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        `;
        liveIndicator.textContent = 'LIVE';
        
        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(liveIndicator);
        
        // Browser iframe container
        const browserContainer = document.createElement('div');
        browserContainer.style.cssText = `
            flex: 1;
            background: #0a0a0a;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        `;
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = browser.live_view_url;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        `;
        iframe.allow = 'clipboard-read; clipboard-write';
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        
        browserContainer.appendChild(iframe);
        
        // Footer with URL
        const footer = document.createElement('div');
        footer.style.cssText = `
            color: #888;
            font-size: 11px;
            margin-top: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        footer.textContent = browser.current_url || browser.url || '';
        
        // Action buttons
        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 8px;
            margin-top: 8px;
        `;
        
        const openBtn = document.createElement('button');
        openBtn.style.cssText = `
            flex: 1;
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.5);
            color: #3b82f6;
            padding: 6px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        `;
        openBtn.textContent = '🔗 Open in Tab';
        openBtn.onclick = (e) => {
            e.stopPropagation();
            window.open(browser.live_view_url, '_blank');
        };
        
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.5);
            color: #ef4444;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        `;
        closeBtn.textContent = '❌';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            // Send close request
            if (window.sendMessage) {
                window.sendMessage(`Close browser session ${browser.session_id}`);
            }
            // Remove card
            card.remove();
        };
        
        actions.appendChild(openBtn);
        actions.appendChild(closeBtn);
        
        // Assemble card
        card.appendChild(header);
        card.appendChild(browserContainer);
        card.appendChild(footer);
        card.appendChild(actions);
        
        // Click to focus
        card.onclick = () => {
            iframe.focus();
        };
        
        return card;
    }
    
    function createVisualizationCard(viz) {
        console.log('[createVisualizationCard] Creating card for:', viz);
        try {
            // Get chart ID and metadata - use the id field if available
            const chartId = viz.id || (viz.path ? viz.path.replace(/^\/outputs\/visualizations\//, '').replace(/\.(html|png)$/, '') : viz.title);
            console.log('[createVisualizationCard] chartId:', chartId);
            console.log('[createVisualizationCard] window.phantomConsole:', window.phantomConsole);
            console.log('[createVisualizationCard] metadata before:', window.phantomConsole?.metadata);
            const metadata = window.phantomConsole?.metadata?.charts?.[chartId] || {};
            const tags = metadata.tags || [];
        
        // Don't skip charts just because metadata is missing
        // This was causing charts to not display!
        
        // Auto-assign to folder based on type if not already assigned
        if (!metadata.folder) {
            const typeToFolder = {
                'chart': 'charts',
                'bar_chart': 'charts',
                'pie_chart': 'charts',
                'line_chart': 'charts',
                'table': 'tables',
                'data': 'tables',
                'slide': 'reports',
                'document': 'reports'
            };
            const autoFolder = typeToFolder[viz.type] || 'uncategorized';
            
            // Initialize chart metadata if needed
            if (window.phantomConsole && window.phantomConsole.metadata) {
                if (!window.phantomConsole.metadata.charts) {
                    window.phantomConsole.metadata.charts = {};
                }
                if (!window.phantomConsole.metadata.charts[chartId]) {
                    window.phantomConsole.metadata.charts[chartId] = {
                        tags: [],
                        folder: autoFolder,
                        favorite: false,
                        pinned: false
                    };
                } else {
                    window.phantomConsole.metadata.charts[chartId].folder = autoFolder;
                }
            }
            
            // Add to folder's chart list
            if (window.phantomConsole && typeof window.phantomConsole.getAllFolders === 'function') {
                const folders = window.phantomConsole.getAllFolders();
                if (folders[autoFolder] && !folders[autoFolder].charts.includes(chartId)) {
                    folders[autoFolder].charts.push(chartId);
                }
            }
            
            metadata.folder = autoFolder;
        }
        
        const card = document.createElement('div');
        card.className = `viz-card viz-type-${viz.type}`;
        card.dataset.chartId = chartId;
        card.dataset.tags = JSON.stringify(tags);
        card.dataset.favorite = metadata.favorite || false;
        card.dataset.pinned = metadata.pinned || false;
        
        card.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            cursor: pointer;
            transition: all 0.2s;
            height: 340px;
            overflow: hidden;
            ${metadata.pinned ? 'border-color: #FFFFFF;' : ''}
        `;
        
        // Card hover effect
        card.onmouseover = () => {
            card.style.borderColor = '#FFFFFF';
            card.style.transform = 'translateY(-2px)';
        };
        card.onmouseout = () => {
            card.style.borderColor = '#333';
            card.style.transform = 'translateY(0)';
        };
        
        // Header with icon and title
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px;';
        
        const icon = document.createElement('span');
        icon.style.cssText = 'font-size: 18px; margin-right: 8px;';
        icon.textContent = getVisualizationIcon(viz.type);
        
        const title = document.createElement('h5');
        title.style.cssText = 'color: white; font-size: 14px; margin: 0; flex: 1;';
        title.textContent = viz.title || 'Untitled Visualization';
        
        const timestamp = document.createElement('span');
        timestamp.style.cssText = 'color: #666; font-size: 11px;';
        timestamp.textContent = viz.timestamp || new Date().toLocaleTimeString();
        
        header.appendChild(icon);
        header.appendChild(title);
        
        // Add favorite/pin indicators
        if (metadata.favorite || metadata.pinned) {
            const indicators = document.createElement('span');
            indicators.style.cssText = 'margin-left: 8px;';
            if (metadata.favorite) indicators.innerHTML += '<span style="color: #FFD700;">⭐</span>';
            if (metadata.pinned) indicators.innerHTML += '<span style="color: #FFFFFF;">📌</span>';
            header.appendChild(indicators);
        }
        
        header.appendChild(timestamp);
        card.appendChild(header);
        
        // Folder and tags display
        const metaContainer = document.createElement('div');
        metaContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; align-items: center;';
        
        // Show folder
        if (metadata.folder && metadata.folder !== 'uncategorized' && window.phantomConsole && typeof window.phantomConsole.getAllFolders === 'function') {
            const folders = window.phantomConsole.getAllFolders();
            const folder = folders[metadata.folder];
            if (folder) {
                const folderEl = document.createElement('span');
                folderEl.style.cssText = `
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 2px 8px;
                    border-radius: 3px;
                    color: #fff;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                `;
                folderEl.innerHTML = `<span>📁</span> ${folder.name}`;
                metaContainer.appendChild(folderEl);
            }
        }
        
        // Show tags
        if (tags.length > 0) {
            tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.style.cssText = `
                    background: #2a2a2a;
                    border: 1px solid #444;
                    padding: 2px 6px;
                    border-radius: 3px;
                    color: #aaa;
                    font-size: 10px;
                `;
                tagEl.textContent = tag;
                metaContainer.appendChild(tagEl);
            });
        }
        
        if (metaContainer.children.length > 0) {
            card.appendChild(metaContainer);
        }
        
        // Preview area - adjusted to match actual size
        const preview = document.createElement('div');
        preview.style.cssText = `
            background: #0a0a0a;
            border-radius: 6px;
            padding: 0;
            height: 200px;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            margin-top: 10px;
            position: relative;
        `;
        
        // Handle different visualization types
        console.log('[Phantom Console] Creating preview for:', viz.type, viz.path, 'interactive:', viz.interactive);
        
        // Check if this is an interactive visualization - improved detection
        const isInteractive = viz.interactive || 
                              (viz.path && viz.path.endsWith('.html')) || 
                              (viz.type && (viz.type.includes('chart') || viz.type.includes('bar_chart') || viz.type.includes('line_chart') || viz.type.includes('pie_chart'))) ||
                              (viz.title && viz.title.toLowerCase().includes('chart'));
        
        if (isInteractive) {
            // For HTML charts, directly embed as iframe without trying PNG first
            const interactiveContainer = document.createElement('div');
            // Use aspect-ratio to maintain proper proportions - make it bigger
            interactiveContainer.style.cssText = `
                position: relative;
                width: 100%;
                aspect-ratio: 4 / 3;
                border-radius: 6px;
                overflow: hidden;
                background: #0a0a0a;
                min-height: 250px;
            `;
            
            if (viz.path && viz.path.endsWith('.html')) {
                // Create iframe with absolute positioning to fill container
                const iframe = document.createElement('iframe');
                iframe.src = viz.path.startsWith('/') ? viz.path : `/${viz.path}`;
                iframe.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: transparent;
                    pointer-events: none;
                `;
                iframe.sandbox = 'allow-scripts allow-same-origin';
                iframe.setAttribute('frameborder', '0');
                
                interactiveContainer.appendChild(iframe);
                
                // Add click overlay to capture clicks
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: transparent;
                    cursor: pointer;
                    z-index: 10;
                `;
                interactiveContainer.appendChild(overlay);
            } else {
                // Fallback to icon display if no HTML path
                interactiveContainer.innerHTML = `
                    <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
                        <div style="color: #888; font-size: 12px;">${viz.description || 'Visualization'}</div>
                    </div>
                `;
            }
            
            preview.appendChild(interactiveContainer);
        } else if ((viz.type === 'image' || viz.type.includes('chart')) && viz.path && !viz.path.endsWith('.html')) {
            const img = document.createElement('img');
            img.src = viz.path.startsWith('/') ? viz.path : `/${viz.path}`;
            img.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';
            img.alt = viz.title || 'Visualization';
            img.onerror = function() {
                console.log('[Phantom Console] Image failed to load:', viz.path);
                this.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'color: #f44336; text-align: center; padding: 20px;';
                errorDiv.textContent = 'Failed to load image';
                preview.appendChild(errorDiv);
            };
            preview.appendChild(img);
        } else if (viz.type === 'html' && viz.content) {
            // For HTML content (tables, etc)
            preview.innerHTML = viz.content;
            preview.style.overflowY = 'auto';
        } else if (viz.type === 'data' && viz.data) {
            // For raw data, create a simple table preview
            const table = createDataPreview(viz.data);
            preview.appendChild(table);
        } else {
            // Placeholder for other types
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'color: #666; text-align: center;';
            placeholder.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">${getVisualizationIcon(viz.type)}</div>
                <div style="font-size: 13px;">${viz.type} visualization</div>
            `;
            preview.appendChild(placeholder);
        }
        
        card.appendChild(preview);
        
        // Action buttons footer
        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 8px; margin-top: auto; padding-top: 10px;';
        
        // View/Expand button
        const viewBtn = document.createElement('button');
        viewBtn.style.cssText = `
            flex: 1;
            padding: 6px 12px;
            background: #2a2a2a;
            border: 1px solid #333;
            color: #888;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        `;
        viewBtn.textContent = '👁️ View';
        viewBtn.onmouseover = () => {
            viewBtn.style.borderColor = '#FFFFFF';
            viewBtn.style.color = '#FFFFFF';
        };
        viewBtn.onmouseout = () => {
            viewBtn.style.borderColor = '#333';
            viewBtn.style.color = '#888';
        };
        viewBtn.onclick = (e) => {
            e.stopPropagation();
            console.log('[Phantom Console] View clicked:', viz);
            
            // For ALL visualizations including slides - open in modal for viewing
            if (viz.path && viz.path.endsWith('.html')) {
                openInteractiveModal(viz.path, viz.title);
            } else if (viz.interactive && viz.interactive_path) {
                openInteractiveModal(viz.interactive_path, viz.title);
            } else if ((viz.type === 'image' || viz.type.includes('chart')) && viz.path) {
                openImageModal(viz.path.startsWith('/') ? viz.path : `/${viz.path}`, 1200);
            }
        };
        
        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.style.cssText = `
            flex: 1;
            padding: 6px 12px;
            background: #2a2a2a;
            border: 1px solid #333;
            color: #888;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        `;
        downloadBtn.textContent = '⬇️ Download';
        downloadBtn.onmouseover = () => {
            downloadBtn.style.borderColor = '#4CAF50';
            downloadBtn.style.color = '#4CAF50';
        };
        downloadBtn.onmouseout = () => {
            downloadBtn.style.borderColor = '#333';
            downloadBtn.style.color = '#888';
        };
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadVisualization(viz);
        };
        
        // More options dropdown button
        const moreBtn = document.createElement('button');
        moreBtn.style.cssText = `
            padding: 6px 10px;
            background: #2a2a2a;
            border: 1px solid #333;
            color: #888;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            position: relative;
        `;
        moreBtn.textContent = '⋮';
        moreBtn.onmouseover = () => {
            moreBtn.style.borderColor = '#666';
            moreBtn.style.color = '#aaa';
        };
        moreBtn.onmouseout = () => {
            moreBtn.style.borderColor = '#333';
            moreBtn.style.color = '#888';
        };
        
        // Create dropdown menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';
        dropdownMenu.style.cssText = `
            position: absolute;
            bottom: 100%;
            right: 0;
            margin-bottom: 5px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 4px 0;
            min-width: 150px;
            display: none;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;
        
        // Dropdown menu items
        const menuItems = [
            { icon: '🏷️', text: 'Add Tag', action: () => window.phantomConsole.showTagDialog(chartId, viz.title) },
            { icon: '📁', text: 'Move to Folder', action: () => window.phantomConsole.showFolderDialog(chartId, viz.title) },
            { icon: '⭐', text: 'Add to Favorites', action: () => window.phantomConsole.toggleFavorite(chartId, viz.title) },
            { icon: '📌', text: 'Pin to Top', action: () => window.phantomConsole.togglePin(chartId, viz.title) },
            { divider: true },
            { icon: '🗑️', text: 'Delete', action: () => window.phantomConsole.deleteChart(chartId, viz.title), danger: true }
        ];
        
        menuItems.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.style.cssText = 'height: 1px; background: #444; margin: 4px 0;';
                dropdownMenu.appendChild(divider);
            } else {
                const menuItem = document.createElement('button');
                menuItem.style.cssText = `
                    display: block;
                    width: 100%;
                    padding: 8px 16px;
                    background: transparent;
                    border: none;
                    color: ${item.danger ? '#f44336' : '#ccc'};
                    text-align: left;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background 0.2s;
                `;
                menuItem.innerHTML = `${item.icon} ${item.text}`;
                menuItem.onmouseover = () => {
                    menuItem.style.background = '#333';
                };
                menuItem.onmouseout = () => {
                    menuItem.style.background = 'transparent';
                };
                menuItem.onclick = (e) => {
                    e.stopPropagation();
                    dropdownMenu.style.display = 'none';
                    item.action();
                };
                dropdownMenu.appendChild(menuItem);
            }
        });
        
        // Toggle dropdown on click
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display === 'block';
            // Hide all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.style.display = 'none';
                }
            });
            // Toggle this dropdown
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
        };
        
        // Container for dropdown button
        const dropdownContainer = document.createElement('div');
        dropdownContainer.style.cssText = 'position: relative;';
        dropdownContainer.className = 'dropdown-container';
        dropdownContainer.appendChild(moreBtn);
        dropdownContainer.appendChild(dropdownMenu);
        
        // For slides, add an Edit button
        if (viz.type === 'slide' || viz.type === 'presentation') {
            // Create Edit button
            const editBtn = document.createElement('button');
            editBtn.style.cssText = `
                flex: 1;
                padding: 6px 12px;
                background: #2a2a2a;
                border: 1px solid #333;
                color: #888;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            `;
            editBtn.textContent = '✏️ Edit';
            editBtn.onmouseover = () => {
                editBtn.style.borderColor = '#FF9500';
                editBtn.style.color = '#FF9500';
            };
            editBtn.onmouseout = () => {
                editBtn.style.borderColor = '#333';
                editBtn.style.color = '#888';
            };
            editBtn.onclick = (e) => {
                e.stopPropagation();
                console.log('[Phantom Console] Edit clicked:', viz);
                
                // Switch to presentations tab
                window.phantomConsole.switchToTab('presentations');
                
                // Set up active presentation data
                window.phantomConsole.presentations.active = {
                    id: viz.id || `pres_${Date.now()}`,
                    title: viz.title,
                    path: viz.path,
                    totalSlides: viz.slides || 6,
                    currentSlide: 1,
                    editMode: true,
                    history: [],
                    historyIndex: -1
                };
                
                // Load presentation in the editor
                if (viz.path) {
                    const iframe = document.getElementById('presentation-frame');
                    if (iframe) {
                        iframe.src = viz.path;
                        
                        // Initialize editor after loading
                        iframe.onload = () => {
                            window.phantomConsole.initializePresentationEditor();
                            window.phantomConsole.scalePresentationPreview();
                            
                            // Switch to edit tab
                            const editTab = document.querySelector('[data-pres-tab="edit"]');
                            if (editTab) {
                                editTab.click();
                            }
                        };
                    }
                    
                    // Update presentation info
                    document.getElementById('presentation-title').textContent = `📑 ${viz.title}`;
                    document.getElementById('presentation-empty').style.display = 'none';
                    document.getElementById('presentation-container').style.display = 'flex';
                    document.getElementById('presentation-actions').style.display = 'flex';
                    document.getElementById('slide-navigator').style.display = 'block';
                    document.getElementById('presentation-progress').style.display = 'none';
                }
            };
            
            // Add buttons in order: View, Edit, Download
            actions.appendChild(viewBtn);
            actions.appendChild(editBtn);
            actions.appendChild(downloadBtn);
        } else {
            // For non-slides, keep original button order
            actions.appendChild(viewBtn);
            actions.appendChild(downloadBtn);
        }
        
        actions.appendChild(dropdownContainer);
        card.appendChild(actions);
        
        return card;
        } catch (error) {
            console.error('[createVisualizationCard] Error creating card for', viz.title, ':', error);
            console.error('[createVisualizationCard] Full error details:', error.stack);
            return null;
        }
    }
    
    
    function getVisualizationIcon(type) {
        const icons = {
            'chart': '📈',
            'bar_chart': '📊',
            'pie_chart': '🥧',
            'line_chart': '📉',
            'table': '📋',
            'diagram': '🗺️',
            'slide': '📑',
            'dashboard': '📏',
            'map': '🗺️',
            'image': '🎨',
            'data': '📊'
        };
        return icons[type] || '📊';
    }
    
    function createDataPreview(data) {
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; font-size: 11px; color: #ccc;';
        
        // Simple preview - show first few rows
        if (Array.isArray(data) && data.length > 0) {
            const maxRows = Math.min(5, data.length);
            for (let i = 0; i < maxRows; i++) {
                const row = table.insertRow();
                if (typeof data[i] === 'object') {
                    Object.values(data[i]).forEach(val => {
                        const cell = row.insertCell();
                        cell.textContent = String(val).substring(0, 20);
                        cell.style.padding = '4px';
                    });
                }
            }
            if (data.length > maxRows) {
                const row = table.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 99;
                cell.style.textAlign = 'center';
                cell.style.color = '#666';
                cell.textContent = `... and ${data.length - maxRows} more rows`;
            }
        }
        
        return table;
    }
    
    function updateOperationsTab(operationsData) {
        console.log('[updateOperationsTab] 📊 Called with data:', operationsData);
        console.log('[updateOperationsTab] Browser session:', operationsData?.browser_session);
        
        const operationsTab = document.querySelector("#phantom-console .tab-content[data-tab=\"operations\"]");
        if (!operationsTab) {
            console.error('[updateOperationsTab] ❌ Operations tab element not found!');
            return;
        }
        
        // Combine all tasks and sort by status (in_progress first, then pending, then completed)
        const allTasks = [];
        
        // Add active tasks
        if (operationsData.active_tasks) {
            operationsData.active_tasks.forEach(task => {
                allTasks.push({
                    ...task,
                    id: task.id || `task_${Date.now()}_${Math.random()}`,
                    status: task.status || 'pending',
                    isActive: true
                });
            });
        }
        
        // Add completed tasks from history
        if (operationsData.task_history) {
            operationsData.task_history.forEach(task => {
                allTasks.push({
                    ...task,
                    id: task.id || `task_${Date.now()}_${Math.random()}`,
                    status: 'completed',
                    isActive: false
                });
            });
        }
        
        // Sort tasks
        allTasks.sort((a, b) => {
            const statusOrder = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
            return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        });
        
        // Get current browser session info
        const browserSession = operationsData.browser_session || {};
        const hasBrowser = browserSession.session_id && (browserSession.live_url || browserSession.loading);
        const isLoading = browserSession.loading || browserSession.session_id === 'loading';
        
        console.log('[updateOperationsTab] Browser session details:', {
            browserSession,
            hasBrowser,
            isLoading,
            hasSessionId: !!browserSession.session_id,
            hasLiveUrl: !!browserSession.live_url,
            hasUrl: !!browserSession.url
        });
        
        // Build the new UI
        operationsTab.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column; gap: 8px;">
                <!-- Task List Section - Minimal height to maximize browser space -->
                <div style="flex: 0 0 auto; height: 120px; display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-shrink: 0;">
                        <h3 style="color: white; margin: 0; font-size: 14px; font-weight: 600;">Task Management</h3>
                        <span style="color: #666; font-size: 12px;">${allTasks.length} tasks</span>
                    </div>
                    
                    <div style="flex: 1; overflow-y: auto; background: #0a0a0a; border: 1px solid #333; border-radius: 6px; padding: 8px; min-height: 0;">
                        ${allTasks.length > 0 ? allTasks.map(task => `
                            <div class="task-item" data-task-id="${task.id}" style="display: flex; align-items: flex-start; gap: 8px; padding: 8px; margin-bottom: 6px; background: #1a1a1a; border-radius: 4px; border: 1px solid #2a2a2a; transition: all 0.2s;">
                                <input type="checkbox" 
                                       class="task-checkbox" 
                                       ${task.status === 'completed' ? 'checked' : ''}
                                       style="margin-top: 2px; cursor: pointer; flex-shrink: 0;"
                                       onchange="window.phantomConsole.toggleTask('${task.id}', this.checked)">
                                
                                <div style="flex: 1; min-width: 0; display: flex; align-items: flex-start; gap: 8px;">
                                    <!-- Task text takes most of the space -->
                                    <div style="flex: 1; min-width: 0; color: ${task.status === 'completed' ? '#666' : '#fff'}; font-size: 13px; ${task.status === 'completed' ? 'text-decoration: line-through;' : ''} word-wrap: break-word; word-break: break-word; white-space: normal; line-height: 1.3;">
                                        ${escapeHtml(task.content || task.title || 'Untitled Task')}
                                    </div>
                                    <!-- Status badge on the right -->
                                    <div style="flex-shrink: 0;">
                                        ${task.status === 'in_progress' ? '<span style="background: #fbbf24; color: #000; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; white-space: nowrap;">Active</span>' : ''}
                                        ${task.status === 'pending' ? '<span style="background: #3b82f6; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; white-space: nowrap;">Pending</span>' : ''}
                                        ${task.status === 'completed' ? '<span style="background: #10b981; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; white-space: nowrap;">Done</span>' : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<p style="color: #666; text-align: center; padding: 20px 0; margin: 0;">No tasks yet. Ghost will add tasks as it works.</p>'}
                    </div>
                </div>
                
                <!-- Live Browser Section - Takes all remaining space -->
                <div style="flex: 1 1 auto; display: flex; flex-direction: column; min-height: 400px; overflow: hidden;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-shrink: 0;">
                        <h3 style="color: white; margin: 0; font-size: 14px; font-weight: 600;">Live Browser</h3>
                        ${hasBrowser ? `
                            <div style="display: flex; gap: 6px;">
                                <button onclick="window.phantomConsole.refreshBrowser()" style="background: #334155; border: none; color: #e2e8f0; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Refresh browser">↻</button>
                                <button onclick="window.phantomConsole.closeBrowserSession()" style="background: #ef4444; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Close session">✕</button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div id="operations-browser-container" style="flex: 1 1 auto; background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; min-height: 400px; position: relative; box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6), 0 15px 35px rgba(0, 0, 0, 0.4), 0 8px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);">
                        ${isLoading ? `
                            <!-- Professional Loading Animation with Ghost Logo -->
                            <div id="browser-loading-container" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; background: #0a0a0a; transition: opacity 0.3s ease-out;">
                                <style>
                                    @keyframes floatGhost {
                                        0%, 100% { transform: translateY(0); }
                                        50% { transform: translateY(-10px); }
                                    }
                                    @keyframes ghostGlow {
                                        0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.3)); }
                                        50% { filter: drop-shadow(0 0 35px rgba(255, 215, 0, 0.5)); }
                                    }
                                    @keyframes pulse {
                                        0%, 100% { opacity: 0.4; }
                                        50% { opacity: 1; }
                                    }
                                    @keyframes slideIn {
                                        from { opacity: 0; transform: translateY(10px); }
                                        to { opacity: 1; transform: translateY(0); }
                                    }
                                    @keyframes screenGlow {
                                        0%, 100% { opacity: 0.6; }
                                        50% { opacity: 0.9; }
                                    }
                                    @keyframes bounce {
                                        0%, 80%, 100% { 
                                            transform: scale(0);
                                            opacity: 0.5;
                                        }
                                        40% { 
                                            transform: scale(1);
                                            opacity: 1;
                                        }
                                    }
                                    .ghost-logo {
                                        width: 160px;
                                        height: 160px;
                                        margin-bottom: 24px;
                                        position: relative;
                                    }
                                    .ghost-logo img {
                                        filter: drop-shadow(0 0 20px rgba(14, 165, 233, 0.5));
                                    }
                                    .loading-dots {
                                        display: flex;
                                        gap: 6px;
                                        margin-top: 24px;
                                    }
                                    .loading-dots span {
                                        width: 6px;
                                        height: 6px;
                                        background: #0ea5e9;
                                        border-radius: 50%;
                                        animation: pulse 1.4s infinite;
                                    }
                                    .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
                                    .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
                                </style>
                                
                                <!-- Ghost Image -->
                                <img src="/ghostvibe.png" alt="Ghost" onerror="this.src='/images/newghost.png'" style="width: 160px; height: 160px; object-fit: contain; animation: floatGhost 3s ease-in-out infinite;">
                                
                                <!-- Status text -->
                                <div style="color: #e2e8f0; font-size: 16px; font-weight: 500; margin-bottom: 8px; animation: slideIn 0.5s ease-out;">
                                    Initializing Browser
                                </div>
                                
                                <!-- Subtle status message -->
                                <div id="loading-status" style="color: #666; font-size: 13px; font-family: 'SF Mono', monospace; height: 20px; transition: opacity 0.3s;">
                                    Establishing secure connection...
                                </div>
                                
                                <!-- Loading dots -->
                                <div class="loading-dots" style="display: flex; gap: 6px; margin-top: 24px;">
                                    <span style="width: 6px; height: 6px; background: #0ea5e9; border-radius: 50%; animation: bounce 1.4s ease-in-out infinite;"></span>
                                    <span style="width: 6px; height: 6px; background: #0ea5e9; border-radius: 50%; animation: bounce 1.4s ease-in-out 0.2s infinite;"></span>
                                    <span style="width: 6px; height: 6px; background: #0ea5e9; border-radius: 50%; animation: bounce 1.4s ease-in-out 0.4s infinite;"></span>
                                </div>
                                
                                <script>
                                    (function() {
                                        const messages = [
                                            "Establishing secure connection...",
                                            "Loading browser environment...",
                                            "Initializing web session...",
                                            "Preparing interface...",
                                            "Almost ready..."
                                        ];
                                        let index = 0;
                                        const statusElement = document.getElementById('loading-status');
                                        
                                        function updateStatus() {
                                            if (statusElement && document.contains(statusElement)) {
                                                statusElement.style.opacity = '0';
                                                setTimeout(() => {
                                                    if (statusElement && document.contains(statusElement)) {
                                                        statusElement.textContent = messages[index];
                                                        statusElement.style.opacity = '1';
                                                        index = (index + 1) % messages.length;
                                                    }
                                                }, 300);
                                            }
                                        }
                                        
                                        // DISABLED setInterval(updateStatus, 2500);
                                    })();
                                </script>
                            </div>
                        ` : hasBrowser ? `
                            <!-- Browser Controls Bar -->
                            <div style="background: #1a1a1a; border-bottom: 1px solid #333; padding: 8px; display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                <div style="flex: 1; background: #0a0a0a; border: 1px solid #333; border-radius: 4px; padding: 6px 10px; color: #888; font-size: 12px; font-family: 'SF Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(browserSession.url || 'No URL')}
                                </div>
                                <button onclick="window.phantomConsole.refreshBrowser()" style="padding: 4px 8px; background: #2a2a2a; border: 1px solid #333; color: #999; border-radius: 4px; cursor: pointer; font-size: 16px;" title="Refresh">
                                    ↻
                                </button>
                                <button onclick="window.phantomConsole.closeBrowserSession()" style="padding: 4px 8px; background: #2a2a2a; border: 1px solid #333; color: #999; border-radius: 4px; cursor: pointer; font-size: 14px;" title="Close">
                                    ✕
                                </button>
                            </div>
                            
                            <!-- E2B Browser iframe container with glassmorphic styling -->
                            <div style="flex: 1 1 auto; width: 100%; height: 100%; overflow: hidden; position: relative;">
                                <!-- Cloud/Local mode badge -->
                                <div class="e2b-mode-badge cloud" style="position: absolute; top: 12px; left: 12px; padding: 4px 10px; background: rgba(74, 144, 226, 0.2); border: 1px solid rgba(74, 144, 226, 0.4); border-radius: 12px; font-size: 10px; font-weight: 600; color: #4A90E2; z-index: 100;">
                                    ☁️ Cloud E2B
                                </div>
                                
                                <!-- Connection status -->
                                <div class="e2b-status" style="position: absolute; bottom: 12px; right: 12px; display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; font-size: 11px; color: rgba(255, 255, 255, 0.7); z-index: 100;">
                                    <span class="e2b-status-dot" style="width: 5px; height: 5px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite;"></span>
                                    <span>Connected</span>
                                </div>
                                
                                <iframe 
                                    id="operations-browser-iframe"
                                    src="${browserSession.live_url || browserSession.vnc_url || browserSession.live_view_url || ''}"
                                    style="width: 100%; height: 100%; border: none; border-radius: 20px; opacity: 0; transition: opacity 0.5s ease-in; background: #0a0a0a;"
                                    allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen"
                                    onload="this.style.opacity = '1'; window.handleE2BLoad && window.handleE2BLoad()"
                                ></iframe>
                            </div>
                        ` : `
                            <!-- No Browser Placeholder -->
                            <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
                                <div style="color: #444; font-size: 48px; margin-bottom: 16px;">🌐</div>
                                <h4 style="color: #666; font-size: 16px; margin: 0 0 8px 0; font-weight: 500;">No Active Browser Session</h4>
                                <p style="color: #555; font-size: 13px; margin: 0; max-width: 300px; line-height: 1.5;">
                                    When Ghost uses the live browser for research or automation, it will appear here.
                                </p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        // Store browser session globally for reference
        window.phantomConsole.currentBrowserSession = browserSession;
        
        // Scale the iframe after updating the content
        setTimeout(() => {
            scaleBrowserIframe();
        }, 100);
    }
    
    function updateArtifactsTab(artifactsData) {
        const artifactSelect = document.getElementById('artifact-selector');
        const artifactContent = document.getElementById('artifact-content');
        
        if (!artifactSelect || !artifactContent) return;
        
        // Store current selection
        const currentSelection = artifactSelect.value;
        
        // Combine all artifacts
        const allArtifacts = [
            ...(artifactsData.code || []).map(a => ({...a, category: 'Code'})),
            ...(artifactsData.documents || []).map(a => ({...a, category: 'Document'})),
            ...(artifactsData.screenshots || []).map(a => ({...a, category: 'Screenshot'}))
        ];
        
        // Only update if artifacts changed
        if (artifactSelect.children.length === allArtifacts.length && currentSelection !== '') {
            return; // Don't rebuild if nothing changed
        }
        
        // Clear and update dropdown
        artifactSelect.innerHTML = '';
        
        if (allArtifacts.length === 0) {
            artifactSelect.innerHTML = '<option>No artifacts generated yet</option>';
            artifactContent.innerHTML = '<p style="color: #666; text-align: center;">Generated artifacts will appear here...</p>';
            return;
        }
        
        // Add artifacts to dropdown
        allArtifacts.forEach((artifact, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `[${artifact.category}] ${artifact.name}${artifact.modified ? ' • ' + artifact.modified : ''}`;
            artifactSelect.appendChild(option);
        });
        
        // Restore previous selection or show first
        if (currentSelection && currentSelection < allArtifacts.length) {
            artifactSelect.value = currentSelection;
            showArtifact(parseInt(currentSelection), allArtifacts);
        } else {
            showArtifact(0, allArtifacts);
        }
        
        // Store artifacts for dropdown handler
        artifactSelect._artifacts = allArtifacts;
        
        // Handle dropdown change (only set once)
        if (!artifactSelect._handlerSet) {
            artifactSelect._handlerSet = true;
            artifactSelect.onchange = (e) => {
                e.stopPropagation();
                const selectedIndex = parseInt(artifactSelect.value);
                if (!isNaN(selectedIndex) && artifactSelect._artifacts) {
                    showArtifact(selectedIndex, artifactSelect._artifacts);
                }
            };
        }
    }
    
    function showArtifact(index, artifacts) {
        const artifactContent = document.getElementById('artifact-content');
        if (!artifactContent || !artifacts[index]) return;
        
        const artifact = artifacts[index];
        
        // Display based on artifact type
        if (artifact.type === 'screenshot' || artifact.name.match(/\.(png|jpg|jpeg|gif)$/i)) {
            artifactContent.innerHTML = `
                <div style="text-align: center;">
                    <img src="/${artifact.path}" style="max-width: 100%; height: auto; border-radius: 4px;">
                    <p style="color: #666; font-size: 12px; margin-top: 10px;">${artifact.name}</p>
                </div>
            `;
        } else if (artifact.type === 'code' || artifact.name.match(/\.(py|js|html|css|json)$/i)) {
            // For code files, display the actual content
            const codeContent = artifact.content || '[No content available]';
            artifactContent.innerHTML = `
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 4px; padding: 15px; overflow: auto;">
                    <p style="color: #FFFFFF; font-weight: bold; margin-bottom: 10px;">${artifact.name}</p>
                    ${artifact.path ? `<p style="color: #666; font-size: 12px; margin-bottom: 15px;">Path: ${artifact.path}</p>` : ''}
                    <pre style="color: #e0e0e0; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; margin: 0;"><code>${escapeHtml(codeContent)}</code></pre>
                </div>
            `;
        } else {
            // Default display for documents and other files
            artifactContent.innerHTML = `
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 4px; padding: 15px;">
                    <p style="color: #FFFFFF; font-weight: bold;">${artifact.name}</p>
                    <p style="color: #666; font-size: 12px; margin-top: 10px;">Type: ${artifact.type || 'document'}</p>
                    <p style="color: #666; font-size: 12px;">Path: ${artifact.path}</p>
                </div>
            `;
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Update Designs Tab
    function updateDesignsTab(designsData) {
        console.log('[updateDesignsTab] Called with data:', designsData);
        const container = document.getElementById('design-container');
        if (!container) {
            console.error('[updateDesignsTab] No design-container found!');
            return;
        }
        
        const hasContent = designsData && designsData.designs && designsData.designs.length > 0;
        
        // Update the design selector dropdown
        const designSelector = document.getElementById('design-selector');
        if (designSelector) {
            // Clear existing options
            designSelector.innerHTML = '';
            
            if (hasContent) {
                // Add designs to dropdown
                designsData.designs.forEach((design, index) => {
                    const option = document.createElement('option');
                    option.value = design.id || `design_${index}`;
                    option.textContent = design.title || design.name || `Design ${index + 1}`;
                    designSelector.appendChild(option);
                });
                
                // Auto-select the first design
                if (designsData.designs.length > 0) {
                    designSelector.value = designsData.designs[0].id || 'design_0';
                    loadDesign(designSelector.value);
                }
            } else {
                // Add empty state option
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No designs yet - Ask Ghost to create one';
                designSelector.appendChild(option);
            }
        }
        
        if (hasContent) {
            console.log('[updateDesignsTab] Found designs:', designsData.designs.length);
            
            // Hide empty states, show grid
            const emptyState = document.getElementById('design-empty-state');
            const filteredEmpty = document.getElementById('design-filtered-empty');
            const grid = document.getElementById('design-grid');
            const gridInner = document.getElementById('design-grid-inner');
            
            if (emptyState) emptyState.style.display = 'none';
            if (filteredEmpty) filteredEmpty.style.display = 'none';
            if (grid) {
                grid.style.display = 'block';
                
                // Clear existing content
                if (gridInner) {
                    gridInner.innerHTML = '';
                    
                    // Add design cards
                    designsData.designs.forEach(design => {
                        const designCard = createDesignCard(design);
                        if (designCard) {
                            gridInner.appendChild(designCard);
                        }
                    });
                }
            }
        } else {
            console.log('[updateDesignsTab] No designs found, showing empty state');
            // Show empty state
            const emptyState = document.getElementById('design-empty-state');
            const filteredEmpty = document.getElementById('design-filtered-empty');
            const grid = document.getElementById('design-grid');
            
            if (emptyState) emptyState.style.display = 'flex';
            if (filteredEmpty) filteredEmpty.style.display = 'none';
            if (grid) grid.style.display = 'none';
        }
    }
    
    // Create design card
    function createDesignCard(design) {
        const card = document.createElement('div');
        card.className = 'design-card';
        card.setAttribute('data-design-type', design.type || 'component');
        card.style.cssText = `
            background: rgba(26, 26, 26, 0.98);
            border: 1px solid rgba(51, 51, 51, 0.8);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
        `;
        
        // Card content
        card.innerHTML = `
            <div style="aspect-ratio: 16/9; background: #0a0a0a; position: relative; overflow: hidden;">
                ${design.preview_url ? 
                    `<img src="${design.preview_url}" alt="${design.title}" style="width: 100%; height: 100%; object-fit: cover;">` :
                    `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 48px;">${getDesignIcon(design.type)}</div>`
                }
            </div>
            <div style="padding: 12px;">
                <h4 style="color: white; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">${design.title || 'Untitled Design'}</h4>
                <p style="color: #666; font-size: 12px; margin: 0;">${design.type || 'component'}</p>
                ${design.created_at ? `<p style="color: #444; font-size: 11px; margin-top: 4px;">${new Date(design.created_at).toLocaleDateString()}</p>` : ''}
            </div>
        `;
        
        // Hover effect
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.4)';
            card.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
            card.style.borderColor = 'rgba(51, 51, 51, 0.8)';
        });
        
        // Click handler
        card.addEventListener('click', () => {
            if (design.file_path) {
                window.open(design.file_path, '_blank');
            }
        });
        
        return card;
    }
    
    // Get design type icon
    function getDesignIcon(type) {
        const icons = {
            'component': '🧩',
            'mockup': '📱',
            'wireframe': '🗺️',
            'animation': '✨'
        };
        return icons[type] || '🎨';
    }
    
    // Design action functions
    function displayDesignPreview(design) {
        console.log('[Design] Displaying preview:', design);
        
        // Hide ALL other elements - empty states and grid
        const emptyState = document.getElementById('design-empty-state');
        const filteredEmpty = document.getElementById('design-filtered-empty');
        const designGrid = document.getElementById('design-grid');
        
        if (emptyState) emptyState.style.display = 'none';
        if (filteredEmpty) filteredEmpty.style.display = 'none';
        if (designGrid) designGrid.style.display = 'none';
        
        // Get the main design container
        const designContainer = document.getElementById('design-container');
        if (!designContainer) return;
        
        // Hide empty states and grid that are already declared above
        if (emptyState) emptyState.style.display = 'none';
        if (filteredEmpty) filteredEmpty.style.display = 'none';
        if (designGrid) designGrid.style.display = 'none';
        
        // Clear the container and set it to use remaining space properly
        designContainer.style.display = 'flex';
        designContainer.style.flexDirection = 'column';
        designContainer.style.height = '100%';
        designContainer.style.paddingTop = '0'; // Reset padding
        designContainer.style.overflow = 'auto'; // Add scrolling to container
        designContainer.innerHTML = `
            <iframe 
                src="${design.preview_url || design.path}" 
                style="width: 100%; min-height: 800px; height: auto; border: none; background: white; display: block;"
                onload="this.style.height = this.contentDocument.body.scrollHeight + 'px';"
            ></iframe>
        `;
    }
    
    function showDesignCode(designId) {
        console.log('[Design] Showing code for:', designId);
        // TODO: Implement code view
        alert('Code view coming soon!');
    }
    
    function exportDesign(designId) {
        console.log('[Design] Exporting:', designId);
        // TODO: Implement export
        alert('Export functionality coming soon!');
    }
    
    function requestDesignIteration(designId) {
        console.log('[Design] Requesting iteration for:', designId);
        // Send message to Ghost requesting iteration
        if (window.sendMessage) {
            window.sendMessage(`Please iterate on the ${designId} design with improvements`);
        }
    }
    
    function deployDesign(designId) {
        console.log('[Design] Opening in browser:', designId);
        // Find the design and open it in a new tab
        if (window.phantomConsole && window.phantomConsole.designs) {
            const design = window.phantomConsole.designs.designs.find(d => d.id === designId);
            if (design && (design.preview_url || design.path)) {
                const url = design.preview_url || design.path;
                window.open(url, '_blank');
            }
        }
    }
    
    // Fetch design data
    window.fetchDesignData = async function() {
        try {
            console.log('[Design Studio] Fetching design data...');
            
            // Fetch from Phantom Console API
            const response = await fetch('/workspace_charts', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch design data');
            }
            
            const data = await response.json();
            console.log('[Design Studio] Received data:', data);
            
            // Extract designs data
            let designs = [];
            
            // Get designs from the designs folder
            if (data && data.designs && data.designs.components) {
                designs = data.designs.components;
            }
            
            // Also check for standalone HTML files that might be designs
            if (data && data.artifacts && data.artifacts.code) {
                data.artifacts.code.forEach(artifact => {
                    // Look for HTML files that might be designs
                    if (artifact.name.endsWith('.html') && 
                        (artifact.name.includes('coffee_shop') || 
                         artifact.name === 'coffee_shop_landing_page.html')) {
                        
                        // Create a design object from the artifact
                        const design = {
                            id: artifact.name.replace('.html', ''),
                            title: artifact.name
                                .replace('.html', '')
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase()),
                            type: 'landing_page',
                            path: artifact.path,
                            preview_url: '/' + artifact.path,
                            created: artifact.modified,
                            status: 'completed'
                        };
                        designs.push(design);
                    }
                });
            }
            
            // Remove duplicates based on title
            const uniqueDesigns = designs.filter((design, index, self) =>
                index === self.findIndex((d) => d.title === design.title)
            );
            
            // Store designs in phantom console for later access
            if (window.phantomConsole) {
                window.phantomConsole.designs = { designs: uniqueDesigns };
            }
            
            updateDesignsTab({
                designs: uniqueDesigns
            });
            
            return Promise.resolve();
        } catch (error) {
            console.error('[Design Studio] Error fetching data:', error);
            // Show empty state on error
            updateDesignsTab({
                designs: []
            });
            return Promise.reject(error);
        }
    };
    
    function downloadVisualization(viz) {
        // Handle different visualization types
        if (viz.interactive && viz.interactive_path) {
            // For interactive visualizations, offer both HTML and image download options
            const choice = confirm('Download interactive HTML version?\n\nOK = Interactive HTML\nCancel = Static Image (if available)');
            
            if (choice) {
                // Download interactive HTML
                const link = document.createElement('a');
                link.href = viz.interactive_path.startsWith('/') ? viz.interactive_path : `/${viz.interactive_path}`;
                link.download = `${viz.title || 'interactive_chart'}.html`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (viz.path && !viz.path.endsWith('.html')) {
                // Download static image version if available
                const link = document.createElement('a');
                link.href = viz.path.startsWith('/') ? viz.path : `/${viz.path}`;
                link.download = `${viz.title || 'chart'}.png`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Static image version not available. Please use the View button to save from the interactive chart.');
            }
        } else if ((viz.type === 'image' || viz.type.includes('chart')) && viz.path) {
            // Download regular image
            const link = document.createElement('a');
            link.href = viz.path.startsWith('/') ? viz.path : `/${viz.path}`;
            link.download = viz.title || 'visualization';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (viz.type === 'data' && viz.data) {
            // Download as JSON
            const dataStr = JSON.stringify(viz.data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${viz.title || 'data'}.json`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        console.log('[Phantom Console] Downloading:', viz.title);
    }
    
    function openImageModal(imagePath, maxWidth = 1200) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
            padding: 20px;
        `;
        
        // Create image container
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            max-width: ${maxWidth}px;
            max-height: 90vh;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Create image
        const img = document.createElement('img');
        img.src = imagePath;
        img.style.cssText = `
            max-width: 100%;
            max-height: 90vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            position: absolute;
            top: -40px;
            right: 0;
            background: #333;
            border: none;
            color: white;
            font-size: 24px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.innerHTML = '×';
        
        // Download button in modal
        const downloadBtn = document.createElement('button');
        downloadBtn.style.cssText = `
            position: absolute;
            bottom: -50px;
            left: 50%;
            transform: translateX(-50%);
            background: #FFFFFF;
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        downloadBtn.innerHTML = '⬇️ Download Image';
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            const link = document.createElement('a');
            link.href = imagePath;
            link.download = imagePath.split('/').pop();
            link.click();
        };
        
        // Assemble modal
        container.appendChild(img);
        container.appendChild(closeBtn);
        container.appendChild(downloadBtn);
        overlay.appendChild(container);
        
        // Close handlers
        overlay.onclick = () => overlay.remove();
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.remove();
        };
        container.onclick = (e) => e.stopPropagation();
        
        // Add to body
        document.body.appendChild(overlay);
    }
    
    function openInteractiveModal(vizPath, title = "Interactive Visualization") {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        // Create container
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            width: 90%;
            height: 90%;
            max-width: 1400px;
            max-height: 900px;
            background: #0a0a0a;
            border: 2px solid #333;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        
        // Header with title and controls
        const header = document.createElement('div');
        header.style.cssText = `
            background: #1a1a1a;
            padding: 15px 20px;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;
        
        const titleEl = document.createElement('h3');
        titleEl.style.cssText = `
            color: #FFFFFF;
            margin: 0;
            font-size: 18px;
        `;
        titleEl.textContent = title;
        
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 10px;
        `;
        
        // Full screen button
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #333;
            color: #888;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        fullscreenBtn.innerHTML = '⛶ Fullscreen';
        fullscreenBtn.onclick = () => {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            }
        };
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            background: #333;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.innerHTML = '✕ Close';
        
        controls.appendChild(fullscreenBtn);
        controls.appendChild(closeBtn);
        header.appendChild(titleEl);
        header.appendChild(controls);
        
        // Create iframe for interactive content
        const iframe = document.createElement('iframe');
        iframe.src = vizPath.startsWith('/') ? vizPath : `/${vizPath}`;
        iframe.style.cssText = `
            width: 100%;
            flex: 1;
            border: none;
            background: white;
        `;
        
        // Loading indicator
        const loading = document.createElement('div');
        loading.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #FFFFFF;
            font-size: 18px;
        `;
        loading.innerHTML = '⟳ Loading interactive visualization...';
        
        iframe.onload = () => {
            loading.style.display = 'none';
        };
        
        // Assemble modal
        container.appendChild(header);
        container.appendChild(iframe);
        container.appendChild(loading);
        overlay.appendChild(container);
        
        // Close handlers
        closeBtn.onclick = () => overlay.remove();
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
        
        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Add to body
        document.body.appendChild(overlay);
    }
    
    // SSE CODE REMOVED - Was causing CPU overload with constant reconnection attempts
    // The Visual Output Studio still works perfectly without SSE
    // Charts are detected via MutationObserver when Ghost mentions them in chat
    
    // Data fetching is now handled within the global togglePhantomConsole function
    // No additional event handlers needed here.
    
    console.log('Phantom Console data fetching ready!');
    
    // Global Phantom Console API
    window.phantomConsole = {
        metadata: {
            charts: {},
            tags: [],
            folders: {
                default: {
                    name: "Default",
                    charts: []
                }
            }
        },
        artifacts: {
            code: [],
            research: [],
            documents: [],
            screenshots: []
        },
        presentations: {
            active: null,
            history: []
        },
        // Expose key functions for debugging
        updateWorkspaceTab: null,
        createVisualizationCard: null,
        addCodeArtifact: function(artifactData) {
            console.log('[Phantom Console] Adding code artifact:', artifactData);
            this.artifacts.code.push(artifactData);
            // Update the UI
            if (typeof updateArtifactsTab === 'function') {
                updateArtifactsTab(this.artifacts);
            }
        },
        addResearchArtifact: function(artifactData) {
            console.log('[Phantom Console] Adding research artifact:', artifactData);
            this.artifacts.research.push(artifactData);
            // Update the UI
            if (typeof updateArtifactsTab === 'function') {
                updateArtifactsTab(this.artifacts);
            }
        },
        
        // Design handling functions
        handleDesignProgress: function(update) {
            console.log('[Phantom Console] Handling design progress:', update);
            
            // Auto-switch to Design Studio tab
            this.switchToTab('designs');
            
            // Show progress indicator
            const container = document.getElementById('design-container');
            if (!container) return;
            
            // Create or update progress display
            let progressDiv = document.getElementById('design-progress');
            if (!progressDiv) {
                progressDiv = document.createElement('div');
                progressDiv.id = 'design-progress';
                progressDiv.style.cssText = `
                    background: rgba(14, 165, 233, 0.1);
                    border: 1px solid #0EA5E9;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px;
                    text-align: center;
                `;
                container.insertBefore(progressDiv, container.firstChild);
            }
            
            // Update progress content
            progressDiv.innerHTML = `
                <div style="font-size: 24px; color: #0EA5E9; margin-bottom: 10px;">
                    ${this.getDesignStageIcon(update.stage)}
                </div>
                <div style="color: #FFFFFF; font-size: 16px; font-weight: 600;">
                    ${update.stage.charAt(0).toUpperCase() + update.stage.slice(1)}
                </div>
                <div style="color: #94A3B8; font-size: 14px; margin-top: 5px;">
                    ${update.message}
                </div>
            `;
        },
        
        handleDesignCreated: function(design) {
            console.log('[Phantom Console] Handling design created:', design);
            
            // Remove progress indicator
            const progressDiv = document.getElementById('design-progress');
            if (progressDiv) {
                progressDiv.remove();
            }
            
            // Add design to the list
            if (!this.designs) {
                this.designs = { designs: [] };
            }
            this.designs.designs.unshift(design);
            
            // Update the designs tab
            updateDesignsTab(this.designs);
            
            // Show success notification
            this.showNotification('Design created successfully!', 'success');
        },
        
        getDesignStageIcon: function(stage) {
            const icons = {
                'thinking': '🤔',
                'planning': '📋',
                'creating': '🛠️',
                'styling': '🎨',
                'scripting': '⚡',
                'complete': '✅'
            };
            return icons[stage] || '⏳';
        },
        
        showNotification: function(message, type = 'info') {
            // Simple notification (can be enhanced with toast library)
            console.log(`[Notification] ${type}: ${message}`);
        },
        
        // Presentation handling functions
        handlePresentationUpdate: function(data) {
            console.log('[Phantom Console] Handling presentation update:', data);
            
            // Auto-switch to presentations tab
            this.switchToTab('presentations');
            
            // Hide empty state, show container
            document.getElementById('presentation-empty').style.display = 'none';
            document.getElementById('presentation-container').style.display = 'flex';
            
            // Show progress initially
            if (data.status === 'starting' || data.status === 'framework_ready') {
                document.getElementById('presentation-progress').style.display = 'block';
                document.getElementById('progress-status').textContent = data.message || 'Creating presentation...';
                document.getElementById('progress-count').textContent = `0/${data.total_slides}`;
                
                // Also show the iframe area for real-time updates
                const previewTab = document.querySelector('[data-pres-tab="preview"]');
                if (previewTab) {
                    previewTab.click();
                }
            } else if (data.status === 'outline_ready') {
                document.getElementById('presentation-progress').style.display = 'block';
                document.getElementById('progress-status').textContent = 'Outline generated. Creating slides...';
                document.getElementById('progress-count').textContent = `0/${data.total_slides}`;
                
                // Show outline in thinking tab
                if (data.outline) {
                    this.updateThinkingTab(data.outline);
                }
            }
            
            // Store active presentation
            this.presentations.active = {
                id: data.presentation_id,
                title: data.title,
                totalSlides: data.total_slides
            };
        },
        
        handlePresentationProgress: function(data) {
            console.log('[Phantom Console] Handling presentation progress:', data);
            
            // Update progress bar
            const progressBar = document.getElementById('progress-bar');
            const progressCount = document.getElementById('progress-count');
            const progressStatus = document.getElementById('progress-status');
            
            // Calculate progress percentage
            const progressPercent = data.progress_percent || (data.slide_number / data.total_slides * 100);
            
            if (progressBar) {
                progressBar.style.width = `${progressPercent}%`;
            }
            
            if (progressCount) {
                progressCount.textContent = `${data.slide_number}/${data.total_slides}`;
            }
            
            if (progressStatus) {
                progressStatus.textContent = `Creating slide ${data.slide_number}...`;
            }
            
            // Real-time slide display - update iframe with current presentation state
            if (data.path) {
                const iframe = document.getElementById('presentation-frame');
                if (iframe) {
                    // Get current src to check if we need to reload
                    const currentSrc = iframe.src ? iframe.src.split('?')[0] : '';
                    const newSrc = data.path.startsWith('/') ? data.path : '/' + data.path;
                    
                    // Always reload with new timestamp to ensure fresh content
                    iframe.src = newSrc + '?t=' + Date.now();
                    
                    // Wait for iframe to load then navigate to the new slide
                    iframe.onload = () => {
                        setTimeout(() => {
                            if (iframe.contentWindow && iframe.contentWindow.Reveal) {
                                // Navigate to the newly created slide
                                iframe.contentWindow.Reveal.slide(data.slide_number - 1, 0, 0);
                                
                                // Also update our tracking
                                if (this.presentations.active) {
                                    this.presentations.active.currentSlide = data.slide_number;
                                }
                            }
                        }, 100);
                    };
                }
            }
            
            // Update slide thumbnails if needed
            this.updateSlideThumbnails(data);
        },
        
        handlePresentationCreated: function(data) {
            console.log('[Phantom Console] Handling presentation created:', data);
            
            // Hide progress, show presentation
            document.getElementById('presentation-progress').style.display = 'none';
            document.getElementById('presentation-actions').style.display = 'flex';
            document.getElementById('slide-navigator').style.display = 'block';
            
            // Update title
            document.getElementById('presentation-title').textContent = `📑 ${data.title}`;
            
            // Store active presentation data
            this.presentations.active = {
                id: data.presentation_id,
                title: data.title,
                path: data.path,
                totalSlides: data.total_slides,
                currentSlide: 1,
                editMode: false,
                history: [],
                historyIndex: -1
            };
            
            // Load presentation in iframe
            const iframe = document.getElementById('presentation-frame');
            if (iframe && data.path) {
                iframe.src = data.path;
                
                // Initialize editor after loading
                iframe.onload = () => {
                    this.initializePresentationEditor();
                    this.scalePresentationPreview();
                };
            }
            
            // Add to history
            this.presentations.history.unshift({
                id: data.presentation_id,
                title: data.title,
                path: data.path,
                slides: data.total_slides,
                created: new Date().toISOString()
            });
            
            // Create slide thumbnails
            this.createSlideThumbnails(data.total_slides);
        },
        
        switchToTab: function(tabName) {
            console.log('[Phantom Console] Switching to tab:', tabName);
            
            // Update tab buttons
            document.querySelectorAll("#phantom-console .tab-btn").forEach(btn => {
                const tab = btn.getAttribute('data-tab');
                if (tab === tabName) {
                    btn.classList.add('active');
                    btn.style.background = 'rgba(255, 255, 255, 0.05)';
                    btn.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                    btn.style.color = 'white';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                    btn.style.color = '#999';
                }
            });
            
            // Update content visibility
            document.querySelectorAll("#phantom-console .tab-content").forEach(content => {
                if (content.getAttribute('data-tab') === tabName) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
            
            // If switching to presentations tab, refresh the iframe and scale it
            if (tabName === 'presentations') {
                const iframe = document.getElementById('presentation-frame');
                if (iframe && iframe.src) {
                    // Force a refresh to ensure latest content
                    const currentSrc = iframe.src.split('?')[0];
                    iframe.src = currentSrc + '?t=' + Date.now();
                }
                // Scale the presentation after a short delay
                setTimeout(() => {
                    this.scalePresentationPreview();
                }, 100);
            }
        },
        
        updateThinkingTab: function(outline) {
            const thinkingDiv = document.getElementById('presentation-thinking');
            if (thinkingDiv) {
                let html = '<h4>Presentation Outline</h4>';
                html += '<ul style="list-style: none; padding: 0;">';
                outline.sections.forEach((section, i) => {
                    html += `<li style="margin-bottom: 8px;">
                        <strong>${i + 1}. ${section.title}</strong>
                        <div style="color: #666; font-size: 12px; margin-left: 20px;">
                            Type: ${section.type}
                        </div>
                    </li>`;
                });
                html += '</ul>';
                thinkingDiv.innerHTML = html;
            }
        },
        
        createSlideThumbnails: function(totalSlides) {
            const container = document.getElementById('slide-thumbnails');
            if (!container) return;
            
            container.innerHTML = '';
            for (let i = 1; i <= totalSlides; i++) {
                const thumb = document.createElement('div');
                thumb.style.cssText = `
                    height: 100%;
                    aspect-ratio: 16/9;
                    background: #1a1a1a;
                    border: 2px solid ${i === 1 ? '#4A90E2' : '#333'};
                    border-radius: 4px;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                thumb.innerHTML = `
                    <div style="font-size: 24px; color: #666;">${i}</div>
                    <div style="position: absolute; bottom: 4px; right: 4px; 
                                background: rgba(0,0,0,0.7); color: white; 
                                padding: 2px 6px; border-radius: 2px; 
                                font-size: 10px;">Slide ${i}</div>
                `;
                thumb.onclick = () => this.navigateToSlide(i);
                container.appendChild(thumb);
            }
        },
        
        navigateToSlide: function(slideNumber) {
            const iframe = document.getElementById('presentation-frame');
            if (iframe && iframe.contentWindow) {
                // Navigate Reveal.js to specific slide
                iframe.contentWindow.postMessage({
                    action: 'navigateToSlide',
                    slide: slideNumber - 1
                }, '*');
            }
        },
        
        // Edit functions
        initializePresentationEditor: function() {
            console.log('[Phantom Console] Initializing presentation editor...');
            
            if (!this.presentations.active) return;
            
            // Initialize editor event listeners
            this.setupEditorToolbar();
            this.setupTextFormatting();
            this.loadPresentationForEditing();
            this.setupSlideNavigator();
            this.setupDragAndDrop();
            
            // Initialize undo/redo
            this.presentations.active.history = [];
            this.presentations.active.historyIndex = -1;
        },
        
        setupEditorToolbar: function() {
            // Add Slide button
            const addSlideBtn = document.getElementById('add-slide-btn');
            if (addSlideBtn) {
                addSlideBtn.onclick = () => this.addNewSlide();
            }
            
            // Delete Slide button
            const deleteSlideBtn = document.getElementById('delete-slide-btn');
            if (deleteSlideBtn) {
                deleteSlideBtn.onclick = () => this.deleteCurrentSlide();
            }
            
            // Duplicate Slide button
            const duplicateSlideBtn = document.getElementById('duplicate-slide-btn');
            if (duplicateSlideBtn) {
                duplicateSlideBtn.onclick = () => this.duplicateCurrentSlide();
            }
            
            // Undo button
            const undoBtn = document.getElementById('undo-btn');
            if (undoBtn) {
                undoBtn.onclick = () => this.undo();
            }
            
            // Redo button
            const redoBtn = document.getElementById('redo-btn');
            if (redoBtn) {
                redoBtn.onclick = () => this.redo();
            }
            
            // Save button
            const saveBtn = document.getElementById('save-presentation-btn');
            if (saveBtn) {
                saveBtn.onclick = () => this.savePresentation();
            }
        },
        
        setupTextFormatting: function() {
            // Text formatting buttons
            document.querySelectorAll('.text-tool').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    const command = btn.getAttribute('data-command');
                    document.execCommand(command, false, null);
                    this.saveToHistory();
                };
            });
            
            // Heading selector
            const headingSelect = document.getElementById('heading-select');
            if (headingSelect) {
                headingSelect.onchange = (e) => {
                    const value = e.target.value;
                    if (value) {
                        document.execCommand('formatBlock', false, value);
                    } else {
                        document.execCommand('formatBlock', false, 'p');
                    }
                    this.saveToHistory();
                };
            }
            
            // Color pickers
            const textColor = document.getElementById('text-color');
            if (textColor) {
                textColor.onchange = (e) => {
                    document.execCommand('foreColor', false, e.target.value);
                    this.saveToHistory();
                };
            }
            
            const bgColor = document.getElementById('bg-color');
            if (bgColor) {
                bgColor.onchange = (e) => {
                    document.execCommand('hiliteColor', false, e.target.value);
                    this.saveToHistory();
                };
            }
            
            // Content editable
            const editor = document.getElementById('slide-editor');
            if (editor) {
                editor.oninput = () => {
                    this.saveToHistory();
                };
                
                // Show placeholder when empty
                editor.addEventListener('focus', () => {
                    if (editor.innerHTML === '') {
                        editor.setAttribute('data-empty', 'true');
                    }
                });
                
                editor.addEventListener('blur', () => {
                    if (editor.innerHTML === '') {
                        editor.setAttribute('data-empty', 'true');
                    } else {
                        editor.removeAttribute('data-empty');
                    }
                });
            }
        },
        
        scalePresentationPreview: function() {
            const wrapper = document.getElementById('presentation-wrapper');
            const iframe = document.getElementById('presentation-frame');
            if (!wrapper || !iframe) return;
            
            // Get container dimensions
            const containerWidth = wrapper.offsetWidth;
            const containerHeight = wrapper.offsetHeight;
            
            // Presentation dimensions (16:9 aspect ratio)
            const presentationWidth = 1280;
            const presentationHeight = 720;
            
            // Calculate scale to fit
            const scaleX = containerWidth / presentationWidth;
            const scaleY = containerHeight / presentationHeight;
            const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
            
            // Apply scale transform
            iframe.style.transform = `scale(${scale})`;
            
            // Center the iframe
            const scaledWidth = presentationWidth * scale;
            const scaledHeight = presentationHeight * scale;
            const leftOffset = (containerWidth - scaledWidth) / 2;
            const topOffset = (containerHeight - scaledHeight) / 2;
            
            iframe.style.position = 'absolute';
            iframe.style.left = `${leftOffset}px`;
            iframe.style.top = `${topOffset}px`;
        },
        
        loadPresentationForEditing: async function() {
            if (!this.presentations.active || !this.presentations.active.path) return;
            
            try {
                // Fetch the presentation HTML
                const response = await fetch(this.presentations.active.path);
                const html = await response.text();
                
                // Parse the HTML to extract slides
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const slides = doc.querySelectorAll('.reveal .slides section');
                
                this.presentations.active.slides = [];
                slides.forEach((slide, index) => {
                    this.presentations.active.slides.push({
                        id: `slide-${index + 1}`,
                        content: slide.innerHTML,
                        notes: slide.querySelector('aside.notes')?.innerHTML || ''
                    });
                });
                
                // Load first slide
                if (this.presentations.active.slides.length > 0) {
                    this.loadSlideInEditor(0);
                }
                
                // Update slide navigator
                this.updateEditorSlideNavigator();
                
            } catch (error) {
                console.error('[Phantom Console] Error loading presentation:', error);
            }
        },
        
        loadSlideInEditor: function(slideIndex) {
            if (!this.presentations.active || !this.presentations.active.slides) return;
            
            const slide = this.presentations.active.slides[slideIndex];
            if (!slide) return;
            
            const editor = document.getElementById('slide-editor');
            if (editor) {
                editor.innerHTML = slide.content;
                this.presentations.active.currentSlide = slideIndex + 1;
                
                // Update navigator selection
                document.querySelectorAll('.editor-slide-thumb').forEach((thumb, idx) => {
                    if (idx === slideIndex) {
                        thumb.style.border = '2px solid #4A90E2';
                    } else {
                        thumb.style.border = '1px solid #333';
                    }
                });
            }
        },
        
        updateEditorSlideNavigator: function() {
            const container = document.getElementById('editor-slide-list');
            if (!container || !this.presentations.active) return;
            
            container.innerHTML = '';
            
            this.presentations.active.slides.forEach((slide, index) => {
                const thumb = document.createElement('div');
                thumb.className = 'editor-slide-thumb';
                thumb.style.cssText = `
                    width: 100px;
                    height: 70px;
                    background: #1a1a1a;
                    border: 2px solid #333;
                    border-radius: 5px;
                    cursor: pointer;
                    overflow: hidden;
                    position: relative;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                `;
                
                // Slide number badge
                const num = document.createElement('div');
                num.style.cssText = `
                    position: absolute;
                    top: 4px;
                    left: 4px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 3px;
                    z-index: 1;
                    font-weight: 500;
                `;
                num.textContent = `Slide ${index + 1}`;
                
                // Slide content preview
                const previewContainer = document.createElement('div');
                previewContainer.style.cssText = `
                    flex: 1;
                    padding: 8px;
                    overflow: hidden;
                    background: #0a0a0a;
                    font-size: 9px;
                    line-height: 1.3;
                    color: #ccc;
                `;
                
                // Create a mini version of the slide content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = slide.content;
                
                // Extract title if exists
                const title = tempDiv.querySelector('h1, h2, h3');
                if (title) {
                    const titlePreview = document.createElement('div');
                    titlePreview.style.cssText = `
                        font-weight: bold;
                        font-size: 10px;
                        margin-bottom: 4px;
                        color: white;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    `;
                    titlePreview.textContent = title.textContent;
                    previewContainer.appendChild(titlePreview);
                }
                
                // Extract body text
                const bodyText = tempDiv.textContent.replace(title?.textContent || '', '').trim();
                if (bodyText) {
                    const bodyPreview = document.createElement('div');
                    bodyPreview.style.cssText = `
                        font-size: 8px;
                        color: #888;
                        overflow: hidden;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                    `;
                    bodyPreview.textContent = bodyText.substring(0, 100) + (bodyText.length > 100 ? '...' : '');
                    previewContainer.appendChild(bodyPreview);
                }
                
                thumb.appendChild(num);
                thumb.appendChild(previewContainer);
                
                // Click handler
                thumb.onclick = () => this.loadSlideInEditor(index);
                
                // Make draggable
                thumb.draggable = true;
                thumb.dataset.slideIndex = index;
                
                // Highlight current slide
                if (index === this.presentations.active.currentSlide - 1) {
                    thumb.style.border = '2px solid #4A90E2';
                    thumb.style.background = '#1a1a1a';
                }
                
                container.appendChild(thumb);
            });
        },
        
        setupSlideNavigator: function() {
            // This will be called to set up the navigator functionality
            this.updateEditorSlideNavigator();
        },
        
        setupDragAndDrop: function() {
            const container = document.getElementById('editor-slide-list');
            if (!container) return;
            
            let draggedElement = null;
            let draggedIndex = null;
            
            container.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('editor-slide-thumb')) {
                    draggedElement = e.target;
                    draggedIndex = parseInt(e.target.dataset.slideIndex);
                    e.target.style.opacity = '0.5';
                }
            });
            
            container.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('editor-slide-thumb')) {
                    e.target.style.opacity = '';
                }
            });
            
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedElement) return;
                
                const afterElement = this.getDragAfterElement(container, e.clientY);
                const dropIndex = afterElement ? 
                    parseInt(afterElement.dataset.slideIndex) : 
                    this.presentations.active.slides.length;
                
                if (draggedIndex !== dropIndex) {
                    this.reorderSlides(draggedIndex, dropIndex);
                }
                
                draggedElement = null;
                draggedIndex = null;
            });
        },
        
        getDragAfterElement: function(container, y) {
            const draggableElements = [...container.querySelectorAll('.editor-slide-thumb:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        },
        
        reorderSlides: function(fromIndex, toIndex) {
            if (!this.presentations.active || !this.presentations.active.slides) return;
            
            const slides = this.presentations.active.slides;
            const [removed] = slides.splice(fromIndex, 1);
            slides.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, removed);
            
            this.updateEditorSlideNavigator();
            this.saveToHistory();
        },
        
        addNewSlide: function() {
            if (!this.presentations.active) return;
            
            const newSlide = {
                id: `slide-${Date.now()}`,
                content: '<h2>New Slide</h2><p>Enter your content here...</p>',
                notes: ''
            };
            
            const currentIndex = this.presentations.active.currentSlide - 1;
            this.presentations.active.slides.splice(currentIndex + 1, 0, newSlide);
            
            this.updateEditorSlideNavigator();
            this.loadSlideInEditor(currentIndex + 1);
            this.saveToHistory();
        },
        
        deleteCurrentSlide: function() {
            if (!this.presentations.active || this.presentations.active.slides.length <= 1) {
                alert('Cannot delete the last slide!');
                return;
            }
            
            if (confirm('Are you sure you want to delete this slide?')) {
                const currentIndex = this.presentations.active.currentSlide - 1;
                this.presentations.active.slides.splice(currentIndex, 1);
                
                // Load previous or next slide
                const newIndex = Math.min(currentIndex, this.presentations.active.slides.length - 1);
                this.loadSlideInEditor(newIndex);
                this.updateEditorSlideNavigator();
                this.saveToHistory();
            }
        },
        
        duplicateCurrentSlide: function() {
            if (!this.presentations.active) return;
            
            const currentIndex = this.presentations.active.currentSlide - 1;
            const currentSlide = this.presentations.active.slides[currentIndex];
            
            const duplicatedSlide = {
                id: `slide-${Date.now()}`,
                content: currentSlide.content,
                notes: currentSlide.notes
            };
            
            this.presentations.active.slides.splice(currentIndex + 1, 0, duplicatedSlide);
            
            this.updateEditorSlideNavigator();
            this.loadSlideInEditor(currentIndex + 1);
            this.saveToHistory();
        },
        
        saveToHistory: function() {
            if (!this.presentations.active) return;
            
            // Get current state
            const editor = document.getElementById('slide-editor');
            if (!editor) return;
            
            const currentIndex = this.presentations.active.currentSlide - 1;
            if (this.presentations.active.slides[currentIndex]) {
                this.presentations.active.slides[currentIndex].content = editor.innerHTML;
            }
            
            // Add to history
            const state = JSON.stringify(this.presentations.active.slides);
            
            // Remove any history after current index
            this.presentations.active.history = this.presentations.active.history.slice(0, this.presentations.active.historyIndex + 1);
            
            // Add new state
            this.presentations.active.history.push(state);
            this.presentations.active.historyIndex++;
            
            // Limit history size
            if (this.presentations.active.history.length > 50) {
                this.presentations.active.history.shift();
                this.presentations.active.historyIndex--;
            }
            
            // Update button states
            this.updateUndoRedoButtons();
        },
        
        undo: function() {
            if (!this.presentations.active || this.presentations.active.historyIndex <= 0) return;
            
            this.presentations.active.historyIndex--;
            const state = JSON.parse(this.presentations.active.history[this.presentations.active.historyIndex]);
            this.presentations.active.slides = state;
            
            const currentIndex = this.presentations.active.currentSlide - 1;
            this.loadSlideInEditor(currentIndex);
            this.updateEditorSlideNavigator();
            this.updateUndoRedoButtons();
        },
        
        redo: function() {
            if (!this.presentations.active || 
                this.presentations.active.historyIndex >= this.presentations.active.history.length - 1) return;
            
            this.presentations.active.historyIndex++;
            const state = JSON.parse(this.presentations.active.history[this.presentations.active.historyIndex]);
            this.presentations.active.slides = state;
            
            const currentIndex = this.presentations.active.currentSlide - 1;
            this.loadSlideInEditor(currentIndex);
            this.updateEditorSlideNavigator();
            this.updateUndoRedoButtons();
        },
        
        updateUndoRedoButtons: function() {
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            
            if (undoBtn) {
                undoBtn.disabled = !this.presentations.active || this.presentations.active.historyIndex <= 0;
                undoBtn.style.opacity = undoBtn.disabled ? '0.5' : '1';
            }
            
            if (redoBtn) {
                redoBtn.disabled = !this.presentations.active || 
                    this.presentations.active.historyIndex >= this.presentations.active.history.length - 1;
                redoBtn.style.opacity = redoBtn.disabled ? '0.5' : '1';
            }
        },
        
        savePresentation: async function() {
            if (!this.presentations.active) return;
            
            // Save current editor content
            const editor = document.getElementById('slide-editor');
            if (editor) {
                const currentIndex = this.presentations.active.currentSlide - 1;
                if (this.presentations.active.slides[currentIndex]) {
                    this.presentations.active.slides[currentIndex].content = editor.innerHTML;
                }
            }
            
            // Generate updated HTML
            const updatedHtml = this.generatePresentationHtml();
            
            // Send to agent to save
            const saveBtn = document.getElementById('save-presentation-btn');
            if (saveBtn) {
                saveBtn.textContent = '⏳ Saving...';
                saveBtn.disabled = true;
            }
            
            try {
                // Create a temporary file path for the updated content
                const tempPath = `/tmp/presentation_${Date.now()}.html`;
                
                // Send save request to agent using file write tool
                const saveMessage = `Please save the updated presentation using the file_write tool. Write to the file: ${this.presentations.active.path}
                
The presentation has been edited and needs to be saved. I've prepared the updated HTML content. Please write it to the original presentation file.

IMPORTANT: Use the file_write tool with the following parameters:
- file_path: ${this.presentations.active.path}
- content: [The HTML content I'll provide in the next message]

First, let me provide the content in a code block:

\`\`\`html
${updatedHtml}
\`\`\`

Now please save this content to ${this.presentations.active.path} using the file_write tool.`;
                
                await this.sendMessage(saveMessage, false);
                
                // Give some time for the save to complete
                setTimeout(() => {
                    if (saveBtn) {
                        saveBtn.textContent = '✅ Saved!';
                        setTimeout(() => {
                            saveBtn.textContent = '💾 Save';
                            saveBtn.disabled = false;
                        }, 999999);
                    }
                    
                    // Update the preview
                    const iframe = document.getElementById('presentation-frame');
                    if (iframe) {
                        iframe.src = this.presentations.active.path + '?t=' + Date.now();
                    }
                }, 3000);
                
            } catch (error) {
                console.error('[Phantom Console] Error saving presentation:', error);
                if (saveBtn) {
                    saveBtn.textContent = '❌ Error';
                    setTimeout(() => {
                        saveBtn.textContent = '💾 Save';
                        saveBtn.disabled = false;
                    }, 999999);
                }
            }
        },
        
        generatePresentationHtml: function() {
            if (!this.presentations.active || !this.presentations.active.slides) return '';
            
            const slides = this.presentations.active.slides.map(slide => {
                return `<section>${slide.content}</section>`;
            }).join('\n');
            
            return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${this.presentations.active.title}</title>
    <link rel="stylesheet" href="https://unpkg.com/reveal.js@4.3.1/dist/reveal.css">
    <link rel="stylesheet" href="https://unpkg.com/reveal.js@4.3.1/dist/theme/black.css">
    <style>
        .reveal h1, .reveal h2, .reveal h3 {
            color: #4A90E2;
        }
        .reveal .slides section {
            text-align: left;
        }
        .reveal pre {
            box-shadow: none;
        }
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${slides}
        </div>
    </div>
    <script src="https://unpkg.com/reveal.js@4.3.1/dist/reveal.js"></script>
    <script>
        Reveal.initialize({
            hash: true,
            controls: true,
            progress: true,
            center: false,
            transition: 'slide'
        });
    </script>
</body>
</html>`;
        },
        
        sendMessage: async function(message, silent = false) {
            // Send message through the main chat interface
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                // Store current value
                const originalValue = chatInput.value;
                
                // Set new message
                chatInput.value = message;
                
                // Trigger send
                if (window.sendMessage) {
                    await window.sendMessage(false);
                } else {
                    // Fallback: trigger enter key
                    const event = new KeyboardEvent('keypress', {
                        key: 'Enter',
                        code: 'Enter',
                        which: 13,
                        keyCode: 13,
                        bubbles: true
                    });
                    chatInput.dispatchEvent(event);
                }
                
                // Restore original value if silent
                if (silent) {
                    chatInput.value = originalValue;
                }
            }
        },
        
        factCheckSlide: function() {
            console.log('[Phantom Console] Fact checking slide...');
            // TODO: Implement fact checking
        },
        
        aiEditSlide: function() {
            console.log('[Phantom Console] AI editing slide...');
            // TODO: Implement AI editing
        },
        
        advancedEditSlide: function() {
            console.log('[Phantom Console] Advanced editing slide...');
            // TODO: Implement advanced editing
        },
        
        exportPresentation: function(format) {
            console.log('[Phantom Console] Exporting presentation as:', format);
            // TODO: Implement export functionality
        },
        
        updateSlideThumbnails: function(data) {
            // Update slide thumbnails in navigator
            const thumbnailsContainer = document.getElementById('slide-thumbnails');
            if (!thumbnailsContainer) return;
            
            // Clear existing thumbnails
            thumbnailsContainer.innerHTML = '';
            
            // Create thumbnails for slides created so far
            for (let i = 1; i <= data.slide_number; i++) {
                const thumb = document.createElement('div');
                thumb.style.cssText = `
                    min-width: 120px;
                    height: 80px;
                    background: #2a2a2a;
                    border: 2px solid #333;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                thumb.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 24px; color: #666;">📑</div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px;">Slide ${i}</div>
                    </div>
                `;
                
                // Highlight current slide
                if (i === data.slide_number) {
                    thumb.style.borderColor = '#FFFFFF';
                }
                
                thumb.onclick = () => {
                    this.navigateToSlide(i);
                };
                
                thumbnailsContainer.appendChild(thumb);
            }
            
            // Scroll to show latest thumbnail
            const lastThumb = thumbnailsContainer.lastElementChild;
            if (lastThumb) {
                lastThumb.scrollIntoView({ behavior: 'smooth', inline: 'end' });
            }
        },
        
        // Load metadata from localStorage
        loadMetadata() {
            try {
                const stored = localStorage.getItem('phantomConsoleMetadata');
                if (stored) {
                    this.metadata = JSON.parse(stored);
                }
            } catch (error) {
                console.error('[Phantom Console] Error loading metadata:', error);
            }
        },
        
        // Save metadata to localStorage
        saveMetadata() {
            try {
                localStorage.setItem('phantomConsoleMetadata', JSON.stringify(this.metadata));
            } catch (error) {
                console.error('[Phantom Console] Error saving metadata:', error);
            }
        },
        
        // Show tag dialog
        showTagDialog(chartId, chartTitle) {
            const existingTags = this.metadata.charts?.[chartId]?.tags || [];
            const allTags = this.metadata.tags || [];
            
            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 20px;
                width: 400px;
                max-width: 90%;
            `;
            
            dialog.innerHTML = `
                <h3 style="color: #FFFFFF; margin: 0 0 15px 0;">Add Tags to "${chartTitle}"</h3>
                <div style="margin-bottom: 15px;">
                    <input type="text" id="new-tag-input" placeholder="Enter new tag..." style="
                        width: 100%;
                        padding: 8px;
                        background: #0a0a0a;
                        border: 1px solid #333;
                        color: white;
                        border-radius: 4px;
                        margin-bottom: 10px;
                    ">
                    <div id="existing-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${existingTags.map(tag => `
                            <span style="
                                background: #2a2a2a;
                                border: 1px solid #444;
                                padding: 4px 8px;
                                border-radius: 4px;
                                color: #aaa;
                                font-size: 12px;
                            ">${tag} <button onclick="window.phantomConsole.removeTag('${chartId}', '${tag}')" style="
                                background: none;
                                border: none;
                                color: #f44336;
                                cursor: pointer;
                                margin-left: 4px;
                            ">×</button></span>
                        `).join('')}
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <div style="color: #888; font-size: 12px; margin-bottom: 8px;">Suggested tags:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${allTags.filter(tag => !existingTags.includes(tag)).map(tag => `
                            <button onclick="window.phantomConsole.addTag('${chartId}', '${tag}')" style="
                                background: #0a0a0a;
                                border: 1px solid #333;
                                color: #888;
                                padding: 4px 10px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 11px;
                            ">${tag}</button>
                        `).join('')}
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="add-tag-btn" style="
                        flex: 1;
                        padding: 8px 16px;
                        background: #FFFFFF;
                        border: none;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Add Tag</button>
                    <button onclick="this.closest('[style*=\"z-index: 10001\"]').remove()" style="
                        flex: 1;
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #333;
                        color: #888;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Close</button>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            
            // Add event listeners
            const input = document.getElementById('new-tag-input');
            const addBtn = document.getElementById('add-tag-btn');
            
            addBtn.onclick = () => {
                const tag = input.value.trim();
                if (tag) {
                    this.addTag(chartId, tag);
                    modal.remove();
                }
            };
            
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    addBtn.click();
                }
            };
            
            input.focus();
        },
        
        // Add tag to chart
        addTag(chartId, tag) {
            // Initialize chart metadata if it doesn't exist
            if (!this.metadata.charts[chartId]) {
                this.metadata.charts[chartId] = {
                    tags: [],
                    folder: "default",
                    favorite: false,
                    pinned: false
                };
            }
            
            // Add tag to chart
            if (!this.metadata.charts[chartId].tags.includes(tag)) {
                this.metadata.charts[chartId].tags.push(tag);
            }
            
            // Add to global tags list
            if (!this.metadata.tags.includes(tag)) {
                this.metadata.tags.push(tag);
            }
            
            this.saveMetadata();
            fetchPhantomConsoleData(); // Refresh the UI
        },
        
        // Remove tag from chart
        removeTag(chartId, tag) {
            if (this.metadata.charts[chartId] && this.metadata.charts[chartId].tags) {
                const index = this.metadata.charts[chartId].tags.indexOf(tag);
                if (index > -1) {
                    this.metadata.charts[chartId].tags.splice(index, 1);
                }
            }
            
            this.saveMetadata();
            this.showTagDialog(chartId, 'Chart'); // Refresh the dialog
        },
        
        // Toggle favorite
        toggleFavorite(chartId, chartTitle) {
            // Initialize chart metadata if it doesn't exist
            if (!this.metadata.charts[chartId]) {
                this.metadata.charts[chartId] = {
                    tags: [],
                    folder: "default",
                    favorite: false,
                    pinned: false
                };
            }
            
            // Toggle favorite
            this.metadata.charts[chartId].favorite = !this.metadata.charts[chartId].favorite;
            
            this.saveMetadata();
            fetchPhantomConsoleData();
        },
        
        // Toggle pin
        togglePin(chartId, chartTitle) {
            // Initialize chart metadata if it doesn't exist
            if (!this.metadata.charts[chartId]) {
                this.metadata.charts[chartId] = {
                    tags: [],
                    folder: "default",
                    favorite: false,
                    pinned: false
                };
            }
            
            // Toggle pin
            this.metadata.charts[chartId].pinned = !this.metadata.charts[chartId].pinned;
            
            this.saveMetadata();
            fetchPhantomConsoleData();
        },
        
        // Show folder dialog
        showFolderDialog(chartId, chartTitle) {
            const currentFolder = this.metadata.charts[chartId]?.folder || 'uncategorized';
            const folders = this.getAllFolders();
            
            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 20px;
                width: 400px;
                max-width: 90%;
            `;
            
            dialog.innerHTML = `
                <h3 style="color: #FFFFFF; margin: 0 0 15px 0;">Move "${chartTitle}" to Folder</h3>
                <div id="folder-list" style="max-height: 300px; overflow-y: auto;">
                    ${Object.entries(folders).map(([folderId, folder]) => `
                        <label style="
                            display: flex;
                            align-items: center;
                            padding: 10px;
                            margin-bottom: 8px;
                            background: ${currentFolder === folderId ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'};
                            border: 1px solid ${currentFolder === folderId ? 'rgba(255, 255, 255, 0.3)' : '#333'};
                            border-radius: 6px;
                            cursor: pointer;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'" onmouseout="this.style.background='${currentFolder === folderId ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'}'"
                        >
                            <input type="radio" name="folder" value="${folderId}" ${currentFolder === folderId ? 'checked' : ''} style="margin-right: 10px;">
                            <span style="color: #ccc; flex: 1;">📁 ${folder.name}</span>
                            <span style="color: #666; font-size: 11px;">(${folder.charts?.length || 0} items)</span>
                        </label>
                    `).join('')}
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333;">
                    <button onclick="window.phantomConsole.showCreateFolderDialog()" style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        margin-bottom: 10px;
                    ">➕ Create New Folder</button>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="move-to-folder-btn" style="
                        flex: 1;
                        padding: 8px 16px;
                        background: #FFFFFF;
                        border: none;
                        color: black;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Move to Folder</button>
                    <button onclick="this.closest('[style*=\"z-index: 10001\"]').remove()" style="
                        flex: 1;
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #333;
                        color: #888;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Cancel</button>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            
            // Add move button handler
            const moveBtn = document.getElementById('move-to-folder-btn');
            moveBtn.onclick = () => {
                const selectedFolder = dialog.querySelector('input[name="folder"]:checked')?.value;
                if (selectedFolder) {
                    this.moveToFolder(chartId, selectedFolder);
                    modal.remove();
                }
            };
        },
        
        // Delete chart
        async deleteChart(chartId, chartTitle) {
            if (confirm(`Are you sure you want to delete "${chartTitle}"?\n\nThis will permanently remove the chart file.`)) {
                try {
                    // For now, just hide it from view by marking as deleted in metadata
                    if (!this.metadata.charts[chartId]) {
                        this.metadata.charts[chartId] = {
                            tags: [],
                            folder: "default",
                            favorite: false,
                            pinned: false
                        };
                    }
                    
                    // Mark as deleted (we'll filter these out in the display)
                    this.metadata.charts[chartId].deleted = true;
                    
                    this.saveMetadata();
                    fetchPhantomConsoleData();
                    
                    alert(`Chart "${chartTitle}" has been removed from your workspace.`);
                    
                    // TODO: In production, we'd make an API call to actually delete the file
                    // For now, it's just hidden from view
                } catch (error) {
                    console.error('[Phantom Console] Error deleting chart:', error);
                    alert('Failed to delete chart');
                }
            }
        }
    };
    
    // Load metadata on startup
    window.phantomConsole.loadMetadata();
    
    // Add resize observer for presentation scaling
    window.addEventListener('resize', () => {
        if (window.phantomConsole.scalePresentationPreview) {
            window.phantomConsole.scalePresentationPreview();
        }
    });
    
    // Also observe tab changes
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-pres-tab="preview"]')) {
            setTimeout(() => {
                if (window.phantomConsole.scalePresentationPreview) {
                    window.phantomConsole.scalePresentationPreview();
                }
            }, 100);
        }
    });
    
    // Extended API methods for filters
    window.phantomConsole.currentFilters = {
        type: 'all',
        tags: [],
        favorites: false,
        pinned: false,
        folder: 'all'
    };
    
    window.phantomConsole.getAllTags = function() {
        return this.metadata.tags || [];
    };
    
    window.phantomConsole.getAllFolders = function() {
        // Initialize with default folders if not exists
        if (!this.metadata.folders) {
            this.metadata.folders = {
                'uncategorized': { name: 'Uncategorized', charts: [] },
                'charts': { name: 'Charts', charts: [] },
                'tables': { name: 'Tables', charts: [] },
                'reports': { name: 'Reports', charts: [] }
            };
        }
        return this.metadata.folders;
    };
    
    window.phantomConsole.showCreateFolderDialog = function() {
        const folderName = prompt('Enter folder name:');
        if (folderName && folderName.trim()) {
            const folderId = folderName.toLowerCase().replace(/\s+/g, '-');
            if (!this.metadata.folders[folderId]) {
                this.metadata.folders[folderId] = {
                    name: folderName.trim(),
                    charts: []
                };
                this.saveMetadata();
                // Update dropdown
                const folderDropdown = document.querySelector('#folders-dropdown');
                if (folderDropdown && folderDropdown.classList.contains('show')) {
                    populateFolderDropdown(folderDropdown);
                }
            } else {
                alert('A folder with this name already exists!');
            }
        }
    };
    
    window.phantomConsole.moveToFolder = function(chartId, folderId) {
        // Remove from all folders first
        Object.values(this.metadata.folders).forEach(folder => {
            if (folder.charts) {
                folder.charts = folder.charts.filter(id => id !== chartId);
            }
        });
        
        // Add to new folder
        if (this.metadata.folders[folderId]) {
            if (!this.metadata.folders[folderId].charts) {
                this.metadata.folders[folderId].charts = [];
            }
            this.metadata.folders[folderId].charts.push(chartId);
        }
        
        // Update chart metadata
        if (!this.metadata.charts[chartId]) {
            this.metadata.charts[chartId] = {
                tags: [],
                folder: folderId,
                favorite: false,
                pinned: false
            };
        } else {
            this.metadata.charts[chartId].folder = folderId;
        }
        
        this.saveMetadata();
        fetchPhantomConsoleData();
    };
    
    window.phantomConsole.applyFilters = function() {
        const container = document.getElementById('visualization-container');
        if (!container) return;
        
        const charts = container.querySelectorAll('.viz-card');
        let visibleCount = 0;
        
        charts.forEach(chart => {
            let shouldShow = true;
            
            // Type filter
            if (this.currentFilters.type !== 'all') {
                const chartType = chart.className.match(/viz-type-(\w+)/)?.[1];
                const typeMap = {
                    'chart': ['chart', 'bar_chart', 'pie_chart', 'line_chart', 'image', 'meeting_summary'],
                    'table': ['table'],
                    'data': ['data', 'json', 'csv'],
                    'slides': ['slide', 'presentation', 'document']
                };
                
                if (!typeMap[this.currentFilters.type]?.includes(chartType)) {
                    shouldShow = false;
                }
            }
            
            // Tag filter
            if (shouldShow && this.currentFilters.tags.length > 0) {
                const chartTags = JSON.parse(chart.dataset.tags || '[]');
                const hasTag = this.currentFilters.tags.some(tag => chartTags.includes(tag));
                if (!hasTag) shouldShow = false;
            }
            
            // Folder filter
            if (shouldShow && this.currentFilters.folder !== 'all') {
                const chartId = chart.dataset.chartId;
                const chartFolder = this.metadata.charts[chartId]?.folder || 'uncategorized';
                // Also check if chart is in the folder's charts array
                const folder = this.metadata.folders[this.currentFilters.folder];
                const isInFolder = chartFolder === this.currentFilters.folder || 
                                  (folder && folder.charts && folder.charts.includes(chartId));
                if (!isInFolder) shouldShow = false;
            }
            
            // Favorites filter
            if (shouldShow && this.currentFilters.favorites) {
                if (chart.dataset.favorite !== 'true') shouldShow = false;
            }
            
            // Pinned filter
            if (shouldShow && this.currentFilters.pinned) {
                if (chart.dataset.pinned !== 'true') shouldShow = false;
            }
            
            chart.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount++;
        });
        
        // Update empty state if needed
        const emptyState = document.getElementById('viz-empty-state');
        const filteredEmpty = document.getElementById('viz-filtered-empty');
        const vizGrid = document.getElementById('viz-grid');
        
        if (visibleCount === 0 && charts.length > 0) {
            if (vizGrid) vizGrid.style.display = 'none';
            if (filteredEmpty) filteredEmpty.style.display = 'flex';
        } else if (charts.length === 0) {
            if (vizGrid) vizGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
        } else {
            if (vizGrid) vizGrid.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            if (filteredEmpty) filteredEmpty.style.display = 'none';
        }
    };
    
    // Task management functions
    window.phantomConsole.toggleTask = async function(taskId, isChecked) {
        console.log('[Phantom Console] Toggling task:', taskId, 'checked:', isChecked);
        
        // Update task status via Ghost
        const newStatus = isChecked ? 'completed' : 'pending';
        
        // Send message to Ghost to update task status
        if (window.sendMessage) {
            window.sendMessage(`Update task ${taskId} status to ${newStatus}`);
        }
        
        // Update UI immediately for responsiveness
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskItem) {
            const taskText = taskItem.querySelector('span');
            const statusBadge = taskItem.querySelector('span:last-child');
            
            if (isChecked) {
                taskText.style.textDecoration = 'line-through';
                taskText.style.color = '#666';
                if (statusBadge) {
                    statusBadge.textContent = '[Done]';
                    statusBadge.style.background = '#10b981';
                }
            } else {
                taskText.style.textDecoration = 'none';
                taskText.style.color = '#fff';
                if (statusBadge) {
                    statusBadge.textContent = '[Pending]';
                    statusBadge.style.background = '#3b82f6';
                }
            }
        }
    };
    
    // Browser management functions
    window.phantomConsole.updateOperationsWithBrowser = function(browserData) {
        console.log('[PhantomConsole] Updating Operations with browser:', browserData);
        // Store browser session data
        this.currentBrowserSession = browserData;
        
        // CRITICAL FIX: Set the VNC iframe source to show the browser!
        const operationsIframe = document.getElementById('operations-browser-iframe');
        if (operationsIframe && !operationsIframe.src.includes('vnc.html')) {
            // Connect to VNC display where Chrome is running
            operationsIframe.src = 'http://localhost:5800/vnc.html?autoconnect=true&resize=scale&reconnect=true';
            console.log('[PhantomConsole] Connected browser iframe to VNC display');
        }
        
        // Add smooth transition from loading to browser
        const loadingContainer = document.getElementById('browser-loading-container');
        if (loadingContainer) {
            // Fade out loading screen smoothly
            loadingContainer.style.opacity = '0';
            setTimeout(() => {
                // Fetch and update after fade out
                fetch('/workspace_charts', { 
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                })
                .then(r => r.json())
                .then(data => {
                    // Add browser session to operations data
                    if (data.operations) {
                        data.operations.browser_session = browserData;
                        updateOperationsTab(data.operations);
                        
                        // Switch to Operations tab
                        const operationsBtn = document.querySelector("#phantom-console .tab-btn[data-tab=\"operations\"]");
                        if (operationsBtn) {
                            operationsBtn.click();
                        }
                    }
                });
            }, 300); // Wait for fade out to complete
        } else {
            // No loading screen, update immediately
            fetch('/workspace_charts', { 
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })
            .then(r => r.json())
            .then(data => {
                // Add browser session to operations data
                if (data.operations) {
                    data.operations.browser_session = browserData;
                    updateOperationsTab(data.operations);
                    
                    // Switch to Operations tab
                    const operationsBtn = document.querySelector("#phantom-console .tab-btn[data-tab=\"operations\"]");
                    if (operationsBtn) {
                        operationsBtn.click();
                    }
                }
            });
        }
    };
    
    window.phantomConsole.updateBrowserUrl = function(sessionId, newUrl) {
        console.log('[PhantomConsole] Updating browser URL:', sessionId, newUrl);
        if (this.currentBrowserSession && this.currentBrowserSession.session_id === sessionId) {
            this.currentBrowserSession.url = newUrl;
            // Update the URL display
            const urlDisplay = document.querySelector('#operations-browser-iframe')?.parentElement?.querySelector('div[style*="background: #0a0a0a"]');
            if (urlDisplay) {
                urlDisplay.textContent = newUrl;
            }
        }
    };
    
    window.phantomConsole.clearBrowserSession = function() {
        console.log('[PhantomConsole] Clearing browser session');
        this.currentBrowserSession = null;
        // Refresh operations tab to show no browser
        fetch('/workspace_charts', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        })
        .then(r => r.json())
        .then(data => {
            if (data.operations) {
                data.operations.browser_session = null;
                updateOperationsTab(data.operations);
            }
        });
    };
    
    // Browser control functions
    window.phantomConsole.refreshBrowser = function() {
        const iframe = document.getElementById('operations-browser-iframe');
        if (iframe) {
            console.log('[Phantom Console] Refreshing browser...');
            iframe.src = iframe.src;
        }
    };
    
    // Browser Use Cloud URL detection and embedding
    window.phantomConsole.detectBrowserUseUrl = function(text) {
        if (!text) return;
        
        // Patterns to detect Browser Use Cloud URLs
        const patterns = [
            /https:\/\/cloud\.browser-use\.com\/[^\s<>"]+/g,
            /https:\/\/browser-use\.com\/[^\s<>"]+/g,
            /https:\/\/[^\/]+\.browser-use\.com\/[^\s<>"]+/g
        ];
        
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                const url = matches[0].replace(/[.,;:!?)}\]'"]+$/, '');
                if (url.includes('browser-use.com')) {
                    this.embedBrowserUseUrl(url);
                    return true;
                }
            }
        }
        return false;
    };
    
    window.phantomConsole.embedBrowserUseUrl = function(url) {
        // Prevent multiple popup attempts for the same URL
        if (this.lastPopupUrl === url && Date.now() - this.lastPopupTime < 5000) {
            console.log('[Phantom Console] Skipping duplicate popup attempt');
            return;
        }
        
        console.log('[Phantom Console] 🚀 Opening Browser Use in popup:', url);
        
        // Store the URL and timestamp
        this.currentBrowserUrl = url;
        this.lastPopupUrl = url;
        this.lastPopupTime = Date.now();
        localStorage.setItem('browserUseUrl', url);
        
        // Open Browser Use in a popup window
        const width = 1200;
        const height = 800;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        const browserWindow = window.open(
            url,
            'GhostBrowserUse',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=yes,status=yes`
        );
        
        if (browserWindow) {
            // Update Operations panel to show Browser Use is active
            const operationsContainer = document.querySelector('#operations-browser-container');
            if (operationsContainer) {
                operationsContainer.innerHTML = `
                    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">👻</div>
                        <h3 style="color: #00ff00; margin-bottom: 20px;">Browser Use Active</h3>
                        <p style="color: #999; margin-bottom: 20px;">Running in external window</p>
                        <div style="background: rgba(0, 255, 0, 0.1); border: 1px solid rgba(0, 255, 0, 0.3); border-radius: 5px; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 12px; word-break: break-all;">
                            ${url}
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button onclick="window.open('${url}', 'GhostBrowserUse')" style="padding: 10px 20px; background: linear-gradient(135deg, #00ff00, #00aa00); border: none; color: #000; font-weight: bold; border-radius: 5px; cursor: pointer;">
                                Open Browser Window
                            </button>
                            <button onclick="navigator.clipboard.writeText('${url}')" style="padding: 10px 20px; background: rgba(0, 255, 0, 0.2); border: 1px solid rgba(0, 255, 0, 0.3); color: #00ff00; border-radius: 5px; cursor: pointer;">
                                Copy URL
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Switch to Operations tab
            const operationsBtn = document.querySelector("#phantom-console .tab-btn[data-tab=\"operations\"]");
            if (operationsBtn) {
                operationsBtn.click();
                console.log('[Phantom Console] Switched to Operations tab');
            }
            
            // Show success notification
            if (window.showToast) {
                window.showToast('Browser Use opened in new window', 'success');
            }
        } else {
            // Popup was blocked
            console.warn('[Phantom Console] Popup blocked! Showing manual open option.');
            
            // Show a button to manually open
            const operationsContainer = document.querySelector('#operations-browser-container');
            if (operationsContainer) {
                operationsContainer.innerHTML = `
                    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                        <h3 style="color: #ffaa00; margin-bottom: 20px;">Popup Blocked</h3>
                        <p style="color: #999; margin-bottom: 20px;">Please click below to open Browser Use</p>
                        <button onclick="window.open('${url}', 'GhostBrowserUse', 'width=1200,height=800')" style="padding: 15px 30px; background: linear-gradient(135deg, #00ff00, #00aa00); border: none; color: #000; font-weight: bold; border-radius: 5px; cursor: pointer; font-size: 16px;">
                            Open Browser Use
                        </button>
                        <div style="margin-top: 20px; padding: 10px; background: rgba(255, 170, 0, 0.1); border: 1px solid rgba(255, 170, 0, 0.3); border-radius: 5px; font-size: 12px; color: #ffaa00;">
                            Tip: Allow popups for this site to auto-open Browser Use
                        </div>
                    </div>
                `;
            }
            
            // Switch to Operations tab to show the button
            const operationsBtn = document.querySelector("#phantom-console .tab-btn[data-tab=\"operations\"]");
            if (operationsBtn) {
                operationsBtn.click();
            }
        }
    };
    
    // Add manual test command
    window.testBrowserEmbed = function() {
        const testUrl = 'https://cloud.browser-use.com/51ce4c69-b5d6-4833-9cc1-f729c92061cd';
        console.log('Testing Browser Use embed with:', testUrl);
        window.phantomConsole.embedBrowserUseUrl(testUrl);
    };
    
    window.phantomConsole.closeBrowserSession = function() {
        console.log('[Phantom Console] Closing browser session...');
        
        if (window.phantomConsole.currentBrowserSession && window.phantomConsole.currentBrowserSession.session_id) {
            // Send message to Ghost to close the session
            if (window.sendMessage) {
                window.sendMessage(`Close browser session ${window.phantomConsole.currentBrowserSession.session_id}`);
            }
        }
        
        // Clear the browser section immediately
        updateOperationsTab({
            active_tasks: [], // Keep existing tasks
            task_history: [],
            browser_session: null
        });
    };
    
    // Browser scaling function
    function scaleBrowserIframe() {
        const iframe = document.getElementById('operations-browser-iframe');
        if (!iframe) {
            console.log('[Browser] No iframe found for scaling');
            return;
        }
        
        const container = iframe.parentElement;
        if (!container) {
            console.log('[Browser] No container found for scaling');
            return;
        }
        
        // Get container dimensions
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Skip if container is not visible (0x0)
        if (containerWidth === 0 || containerHeight === 0) {
            return; // Don't resize invisible containers
        }
        
        console.log(`[Browser] Container dimensions: ${containerWidth.toFixed(0)}x${containerHeight.toFixed(0)}`);
        
        // Make iframe fill the ENTIRE container - same size as "No Active Browser Session" box
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.transform = 'none';
        
        console.log(`[Browser] Set iframe to fill container: ${containerWidth.toFixed(0)}x${containerHeight.toFixed(0)}`);
    }
    
    // Expose functions globally after they're defined
    window.phantomConsole.updateWorkspaceTab = updateWorkspaceTab;
    window.phantomConsole.createVisualizationCard = createVisualizationCard;
    window.phantomConsole.updateOperationsTab = updateOperationsTab;
    
    // Make scaling function globally available
    window.scaleBrowserIframe = scaleBrowserIframe;
    
    // Set up resize observer for browser scaling
    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            if (entry.target.id === 'phantom-console') {
                setTimeout(() => {
                    scaleBrowserIframe();
                }, 10);
            }
        }
    });
    
    // Observe phantom console for resize
    const phantomConsole = document.getElementById('phantom-console');
    if (phantomConsole) {
        resizeObserver.observe(phantomConsole);
    }
    
    // Scale when Operations tab becomes active
    document.addEventListener('click', (e) => {
        if (e.target.textContent === 'Operations' && e.target.closest('.tab-buttons')) {
            setTimeout(() => {
                scaleBrowserIframe();
            }, 100);
        }
    });
    
    // SSE functionality removed - not needed for Ghost operations
    
    // Add delete functionality
    window.phantomConsole.deleteChart = async function(chartId, title) {
        console.log('[Phantom Console] Deleting chart:', chartId);
        
        // Delete the file from server
        try {
            // chartId already contains the filename without extension
            // Just add .html if it's not already there
            const filename = chartId.includes('.html') ? chartId : chartId + '.html';
            console.log('[Phantom Console] Deleting file:', filename);
            
            // Use the CORRECT endpoint - no /api/ prefix!
            const response = await fetch('/delete_visualization', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({filename: filename})
            });
            
            const result = await response.json();
            console.log('[Phantom Console] Delete response:', result);
            
            if (!response.ok || !result.success) {
                console.error('[Phantom Console] Delete failed:', result.error || response.status);
                alert(`Failed to delete chart: ${result.error || 'Unknown error'}`);
                return;
            }
            
            console.log('[Phantom Console] Successfully deleted:', filename);
        } catch (error) {
            console.error('[Phantom Console] Delete error:', error);
            alert(`Error deleting chart: ${error.message}`);
            return;
        }
        
        // Remove from DOM immediately
        const card = document.querySelector(`[data-chart-id="${chartId}"]`);
        if (card) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => card.remove(), 300);
        }
        
        // Remove from data array
        if (window.phantomConsole.workspace && window.phantomConsole.workspace.visualizations) {
            const index = window.phantomConsole.workspace.visualizations.findIndex(v => v.id === chartId);
            if (index > -1) {
                window.phantomConsole.workspace.visualizations.splice(index, 1);
            }
        }
        
        // Show toast notification
        showToast(`Deleted: ${title || chartId}`);
    };
    
    // Add batch delete functionality
    window.phantomConsole.deleteAllCharts = async function() {
        if (!confirm('Delete ALL visualizations? This cannot be undone.')) return;
        
        console.log('[Phantom Console] Deleting all charts...');
        
        // Delete all files from server
        try {
            // Use the CORRECT endpoint - no /api/ prefix!
            const response = await fetch('/delete_all_visualizations', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({})
            });
            
            const result = await response.json();
            console.log('[Phantom Console] Delete all response:', result);
            
            if (!response.ok || !result.success) {
                console.error('[Phantom Console] Delete all failed:', result.error || response.status);
                alert(`Failed to delete all charts: ${result.error || 'Unknown error'}`);
                return;
            }
            
            const deletedCount = result.count || result.deleted_count || 0;
            console.log(`[Phantom Console] Successfully deleted ${deletedCount} files`);
            showToast(`Deleted ${deletedCount} visualizations`);
        } catch (error) {
            console.error('[Phantom Console] Delete all error:', error);
            alert(`Error deleting all charts: ${error.message}`);
            return;
        }
        
        // Clear DOM
        const gridInner = document.getElementById('viz-grid-inner');
        if (gridInner) {
            gridInner.innerHTML = '';
        }
        
        // Clear data
        if (window.phantomConsole.workspace) {
            window.phantomConsole.workspace.visualizations = [];
        }
        
        // Show empty state
        const emptyState = document.getElementById('viz-empty-state');
        if (emptyState) emptyState.style.display = 'flex';
        
        showToast('All visualizations deleted');
    };
    
    // Simple toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // Dyad Integration Functions
    function initializeDyadIntegration() {
        console.log('[Dyad Integration] Initializing...');
        
        // Check Dyad connection status
        checkDyadConnection();
        
        // Set up event handlers
        setupDyadEventHandlers();
    }
    
    function checkDyadConnection() {
        const statusElement = document.getElementById('dyad-status');
        const dyadButton = document.getElementById('open-dyad-btn');
        
        if (!statusElement) return;
        
        fetch('http://localhost:50672/', { 
            method: 'GET',
            mode: 'no-cors',
            timeout: 3000
        })
        .then(() => {
            statusElement.textContent = '✅ Connected';
            statusElement.style.color = '#4ade80';
            if (dyadButton) dyadButton.disabled = false;
        })
        .catch(() => {
            statusElement.textContent = '❌ Not Available';
            statusElement.style.color = '#ef4444';
            if (dyadButton) {
                dyadButton.disabled = true;
                dyadButton.style.background = '#666';
                dyadButton.style.cursor = 'not-allowed';
            }
        });
    }
    
    function setupDyadEventHandlers() {
        // Launch Dyad Studio button
        const openDyadBtn = document.getElementById('open-dyad-btn');
        if (openDyadBtn) {
            // Remove any existing click handlers
            openDyadBtn.replaceWith(openDyadBtn.cloneNode(true));
            // Get the new element reference
            const newOpenDyadBtn = document.getElementById('open-dyad-btn');
            newOpenDyadBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Dyad Integration] Button clicked - focusing existing Dyad app');
                
                // Since Dyad is already running, just focus it using AppleScript
                try {
                    const response = await fetch('/api/focus-dyad', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (response.ok) {
                        showToast('🎨 Dyad Studio focused!');
                        console.log('[Focus] Dyad window brought to front');
                    } else {
                        throw new Error('Focus API not available');
                    }
                } catch (error) {
                    // Try to launch Dyad if not running
                    console.log('[Launch] Attempting to launch Dyad app');
                    showToast('🚀 Launching Dyad Studio...');
                    
                    // Use the system to open the Dyad app
                    try {
                        // This attempts to open the Dyad application
                        const openApp = new Promise((resolve, reject) => {
                            // Try to open Dyad.app via system
                            const link = document.createElement('a');
                            link.href = 'dyad://launch';  // Custom protocol if available
                            link.click();
                            resolve();
                        });
                        
                        setTimeout(() => {
                            showToast('💡 If Dyad didn\'t open, please launch it from Applications folder');
                        }, 999999);
                        
                    } catch (launchError) {
                        console.error('[Launch] Failed to launch Dyad:', launchError);
                        showToast('❌ Please launch Dyad manually from Applications');
                    }
                }
            });
        }
        
        // Embed Full Dyad button
        const embedDyadBtn = document.getElementById('embed-dyad-btn');
        if (embedDyadBtn) {
            embedDyadBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Dyad Integration] Starting development Dyad for embedding');
                
                showToast('🔨 Starting development Dyad server...');
                
                // Try to start the development version of Dyad
                try {
                    const response = await fetch('http://localhost:50673/api/ghost/start-dev-dyad', {
                        method: 'POST'
                    });
                    
                    if (response.ok) {
                        showToast('⏳ Dyad server starting... please wait');
                        // Wait a bit then try to embed
                        setTimeout(() => {
                            embedFullDyad();
                        }, 5000);
                    } else {
                        throw new Error('Dev server not available');
                    }
                } catch (error) {
                    console.log('[Embed] Starting dev server manually...');
                    showToast('💡 Please run "npm start" in the dyad folder first');
                    // Try embedding anyway in case it's already running
                    setTimeout(() => {
                        embedFullDyad();
                    }, 1000);
                }
            });
        }
        
        // Back to gallery button
        const backBtn = document.getElementById('dyad-back-to-empty-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                hideEmbeddedDyad();
            });
        }
        
        // Send AI context button
        const sendContextBtn = document.getElementById('dyad-send-context-btn');
        if (sendContextBtn) {
            sendContextBtn.addEventListener('click', function() {
                sendAIContextToDyad();
            });
        }
        
        // Quick design buttons
        const quickDesignBtns = document.querySelectorAll('.quick-design-btn');
        quickDesignBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const prompt = this.getAttribute('data-prompt');
                sendDesignPromptToGhost(prompt);
            });
            
            // Add hover effects
            btn.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(255, 255, 255, 0.05)';
                this.style.borderColor = '#4A90E2';
                this.style.color = '#ffffff';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
                this.style.borderColor = '#333';
                this.style.color = '#888';
            });
        });
    }
    
    // Launch design interface - tries Dyad bridge first, falls back to embedded
    async function launchDesignInterface(projectDetails = {}) {
        console.log('[Design Interface] Attempting to launch Dyad interface...');
        
        // Check if we've already tried and failed recently (prevent retry storm)
        const lastAttempt = window.dyadLastAttempt || 0;
        const now = Date.now();
        if (now - lastAttempt < 30000) { // 30 second cooldown
            console.log('[Dyad Bridge] Skipping - cooldown period active');
            embedFullDyad();
            return false;
        }
        
        try {
            // Try Dyad bridge API first with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
            
            const response = await fetch('http://localhost:5174/mcp/create-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: projectDetails.name || 'New Project',
                    template: projectDetails.template || 'react-vite',
                    description: projectDetails.description || 'Created from Ghost Design Studio'
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const result = await response.json();
                showToast('🚀 Dyad project created!');
                console.log('[Dyad Bridge] Project created successfully:', result);
                
                // Now embed the Dyad interface
                embedFullDyad();
                return true;
            } else {
                throw new Error('Dyad bridge not available');
            }
        } catch (error) {
            window.dyadLastAttempt = now; // Record failed attempt
            console.log('[Dyad Bridge] Bridge not available, using embedded interface');
            // Try to embed anyway - might just show the wrapper
            embedFullDyad();
            return false;
        }
    }
    
    // Embed full Dyad interface in the Design Studio area
    function embedFullDyad(streamUrl = null) {
        console.log('[Dyad Integration] Embedding Dyad interface');
        
        const designContainer = document.getElementById('design-container');
        if (!designContainer) {
            console.error('[Dyad Integration] Design container not found');
            return;
        }
        
        // Ensure container has proper height for full view
        designContainer.style.height = 'calc(100vh - 260px)';
        designContainer.style.minHeight = '280px';
        designContainer.style.maxHeight = '450px';
        designContainer.style.display = 'flex';
        designContainer.style.flexDirection = 'column';
        
        // Clear existing content
        designContainer.innerHTML = '';
        
        // Create iframe for Dyad interface
        const iframe = document.createElement('iframe');
        
        // Use UI-TARS Design Studio instead of Dyad
        if (streamUrl) {
            console.log('[UI-TARS Integration] Using E2B stream URL:', streamUrl);
            iframe.src = streamUrl; // E2B Desktop stream
        } else {
            iframe.src = 'about:blank'; // Placeholder until Dyad loads
        }
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 8px;
            background: transparent;
            flex: 1;
        `;
        iframe.id = 'dyad-full-iframe';
        
        // Add loading handler
        iframe.onload = function() {
            console.log('[UI-TARS Integration] UI-TARS Design Studio loaded successfully');
            showToast('🚀 UI-TARS Design Studio loaded!');
        };
        
        iframe.onerror = function() {
            console.error('[Dyad Integration] Failed to load Dyad interface');
            designContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="color: #888; margin-bottom: 8px;">Cannot Load Dyad</h3>
                    <p style="color: #666; text-align: center; max-width: 300px;">
                        Make sure Dyad is running locally:<br>
                        <code style="background: #333; padding: 2px 6px; border-radius: 3px;">npm start</code>
                    </p>
                    <button onclick="embedFullDyad()" style="margin-top: 16px; background: #4A90E2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        };
        
        designContainer.appendChild(iframe);
        
        // Switch to designs tab to show the embedded interface
        const designTab = document.querySelector('[data-tab="designs"]');
        if (designTab) {
            // Trigger tab switch
            const tabButton = document.querySelector('[onclick*="designs"]');
            if (tabButton) {
                tabButton.click();
            }
        }
    }
    
    // Show polished design interface (embedded fallback)
    function showEmbeddedDyad() {
        console.log('[Polished Design] Launching full-screen design interface');
        
        const polishedInterface = document.getElementById('polished-design-interface');
        if (polishedInterface) {
            console.log('[Polished Design] Found interface element, showing...');
            
            // Show the interface with smooth animation
            polishedInterface.style.display = 'block';
            polishedInterface.style.opacity = '0';
            polishedInterface.style.transform = 'scale(0.95)';
            
            // Animate in
            setTimeout(() => {
                polishedInterface.style.transition = 'all 0.3s ease';
                polishedInterface.style.opacity = '1';
                polishedInterface.style.transform = 'scale(1)';
            }, 10);
            
            // Setup event handlers
            setupPolishedDesignHandlers();
            
            // Hide any loading overlay that might be blocking
            hideDesignLoading();
            
            // Load the website in the iframe
            const iframe = document.getElementById('design-canvas-iframe');
            if (iframe) {
                iframe.onload = function() {
                    console.log('[Polished Design] Website loaded in design canvas');
                    // Enable element selector after iframe loads
                    setTimeout(() => {
                        enableElementSelector();
                    }, 1000);
                };
            }
        }
        
        showToast('🎨 Design Studio launched! Click any element to edit with AI.');
    }
    
    // Setup event handlers for polished design interface
    function setupPolishedDesignHandlers() {
        // Close button
        const closeBtn = document.getElementById('design-close-btn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                hidePolishedDesign();
            };
        }
        
        // Viewport buttons
        const viewportBtns = document.querySelectorAll('.viewport-btn');
        viewportBtns.forEach(btn => {
            btn.onclick = function() {
                // Remove active class from all buttons
                viewportBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    b.style.color = '#999';
                });
                
                // Add active class to clicked button
                btn.classList.add('active');
                btn.style.background = 'rgba(74, 144, 226, 0.2)';
                btn.style.borderColor = '#4A90E2';
                btn.style.color = '#4A90E2';
                
                // Update iframe container based on viewport
                const iframeContainer = document.getElementById('design-iframe-container');
                const viewport = btn.dataset.viewport;
                
                if (viewport === 'tablet') {
                    iframeContainer.style.maxWidth = '768px';
                } else if (viewport === 'mobile') {
                    iframeContainer.style.maxWidth = '375px';
                } else {
                    iframeContainer.style.maxWidth = '1200px';
                }
            };
        });
        
        // Design tool buttons hover effects
        const toolBtns = document.querySelectorAll('.design-tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            });
            
            btn.addEventListener('mouseleave', function() {
                if (!btn.id.includes('preview')) {
                    btn.style.background = 'rgba(255, 255, 255, 0.05)';
                    btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                } else {
                    btn.style.background = 'rgba(74, 144, 226, 0.1)';
                    btn.style.borderColor = 'rgba(74, 144, 226, 0.3)';
                }
            });
        });
        
        // AI popup handlers
        const aiPopupClose = document.getElementById('ai-popup-close');
        const aiEditCancel = document.getElementById('ai-edit-cancel');
        const aiEditApply = document.getElementById('ai-edit-apply');
        
        if (aiPopupClose) aiPopupClose.onclick = () => hideAIEditPopup();
        if (aiEditCancel) aiEditCancel.onclick = () => hideAIEditPopup();
        if (aiEditApply) aiEditApply.onclick = () => applyAIEdit();
        
        // Save and deploy buttons
        const saveBtn = document.getElementById('design-save-btn');
        const deployBtn = document.getElementById('design-deploy-btn');
        
        if (saveBtn) {
            saveBtn.onclick = function() {
                showDesignLoading('Saving changes...', 'Your design is being saved');
                // Simulate save process
                setTimeout(() => {
                    hideDesignLoading();
                    showToast('💾 Design saved successfully!');
                }, 999999);
            };
        }
        
        if (deployBtn) {
            deployBtn.onclick = function() {
                // Show deployment options popup (like Dyad)
                showDeploymentPopup();
            };
        }
    }
    
    // Hide polished design interface
    function hidePolishedDesign() {
        const polishedInterface = document.getElementById('polished-design-interface');
        if (polishedInterface) {
            polishedInterface.style.transition = 'all 0.2s ease';
            polishedInterface.style.opacity = '0';
            polishedInterface.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                polishedInterface.style.display = 'none';
            }, 200);
        }
        
        showToast('👋 Design Studio closed');
    }
    
    // Enable element selector
    function enableElementSelector() {
        console.log('[Element Selector] Enabling element selection');
        
        const iframe = document.getElementById('design-canvas-iframe');
        if (!iframe || !iframe.contentWindow) return;
        
        try {
            // Add hover styles to iframe content
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // Create style element for hover effects
            const style = iframeDoc.createElement('style');
            style.innerHTML = `
                .ghost-element-hover {
                    outline: 2px solid #4A90E2 !important;
                    outline-offset: 2px !important;
                    cursor: pointer !important;
                    position: relative !important;
                }
                .ghost-element-hover::after {
                    content: 'Click to edit with AI';
                    position: absolute;
                    top: -30px;
                    left: 0;
                    background: #4A90E2;
                    color: white;
                    padding: 4px 8px;
                    font-size: 11px;
                    border-radius: 4px;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
            `;
            iframeDoc.head.appendChild(style);
            
            // Add event listeners to all elements
            const elements = iframeDoc.querySelectorAll('*:not(script):not(style)');
            elements.forEach(element => {
                element.addEventListener('mouseenter', function() {
                    if (!element.classList.contains('ghost-element-hover')) {
                        element.classList.add('ghost-element-hover');
                    }
                });
                
                element.addEventListener('mouseleave', function() {
                    element.classList.remove('ghost-element-hover');
                });
                
                element.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Element Selector] Element clicked:', element.tagName);
                    showAIEditPopup(element);
                });
            });
            
            console.log(`[Element Selector] Added hover effects to ${elements.length} elements`);
            
        } catch (error) {
            console.log('[Element Selector] Cross-origin restrictions - using overlay method');
            // Fallback: Create a click overlay over the iframe
            createClickOverlay();
            showToast('💡 Element selector ready! Click anywhere on the website to edit.');
        }
    }
    
    // Create click overlay for cross-origin iframes
    function createClickOverlay() {
        console.log('[Click Overlay] Creating overlay for element selection');
        
        const iframe = document.getElementById('design-canvas-iframe');
        if (!iframe) return;
        
        // Remove existing overlay
        const existingOverlay = document.getElementById('element-click-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'element-click-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            cursor: crosshair;
            z-index: 100;
            pointer-events: all;
        `;
        
        // Add visual element highlights
        addElementHighlights(overlay, iframe);
        
        // Add hover effects
        overlay.addEventListener('mousemove', function(e) {
            highlightElementAtPosition(e, overlay, iframe);
        });
        
        // Add click handler
        overlay.addEventListener('click', function(e) {
            console.log('[Click Overlay] Click detected at', e.clientX, e.clientY);
            
            // Calculate approximate element type based on click position
            const rect = iframe.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            let elementType = 'element';
            
            // Simple heuristic for element type
            if (y < rect.height * 0.2) {
                elementType = 'header';
            } else if (x < rect.width * 0.5 && y < rect.height * 0.6) {
                elementType = 'text';
            } else {
                elementType = 'button';
            }
            
            showAIEditPopup({ tagName: elementType.toUpperCase() });
        });
        
        // Position overlay over iframe
        const container = iframe.parentElement;
        if (container) {
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
        
        console.log('[Click Overlay] Overlay created and positioned');
    }
    
    // Add visual element highlights to overlay
    function addElementHighlights(overlay, iframe) {
        const iframeRect = iframe.getBoundingClientRect();
        
        // Create highlight boxes for common clickable areas
        const highlights = [
            // Header area
            { x: 0.1, y: 0.05, w: 0.8, h: 0.15, label: 'Header', type: 'header' },
            // Main title
            { x: 0.2, y: 0.2, w: 0.6, h: 0.1, label: 'Title', type: 'title' },
            // Subtitle  
            { x: 0.15, y: 0.32, w: 0.7, h: 0.08, label: 'Subtitle', type: 'text' },
            // Left content
            { x: 0.05, y: 0.45, w: 0.4, h: 0.3, label: 'Left Content', type: 'content' },
            // Right content
            { x: 0.55, y: 0.45, w: 0.4, h: 0.3, label: 'Right Content', type: 'content' },
            // Bottom section
            { x: 0.1, y: 0.8, w: 0.8, h: 0.15, label: 'Footer', type: 'footer' }
        ];
        
        highlights.forEach((highlight, index) => {
            const box = document.createElement('div');
            box.className = 'element-highlight-box';
            box.dataset.type = highlight.type;
            box.style.cssText = `
                position: absolute;
                left: ${highlight.x * 100}%;
                top: ${highlight.y * 100}%;
                width: ${highlight.w * 100}%;
                height: ${highlight.h * 100}%;
                border: 2px dashed rgba(74, 144, 226, 0.6);
                background: rgba(74, 144, 226, 0.1);
                pointer-events: none;
                transition: all 0.2s ease;
                opacity: 0.7;
            `;
            
            // Add label
            const label = document.createElement('div');
            label.textContent = highlight.label;
            label.style.cssText = `
                position: absolute;
                top: -25px;
                left: 5px;
                background: #4A90E2;
                color: white;
                padding: 3px 8px;
                border-radius: 3px;
                font-size: 11px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                pointer-events: none;
            `;
            box.appendChild(label);
            
            overlay.appendChild(box);
        });
        
        console.log('[Element Highlights] Added', highlights.length, 'highlight boxes');
    }
    
    // Highlight element at mouse position
    function highlightElementAtPosition(e, overlay, iframe) {
        const boxes = overlay.querySelectorAll('.element-highlight-box');
        const rect = overlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        boxes.forEach(box => {
            const boxRect = box.getBoundingClientRect();
            const overlayRect = overlay.getBoundingClientRect();
            const isHovering = (
                e.clientX >= boxRect.left && 
                e.clientX <= boxRect.right &&
                e.clientY >= boxRect.top && 
                e.clientY <= boxRect.bottom
            );
            
            if (isHovering) {
                box.style.border = '2px solid #4A90E2';
                box.style.background = 'rgba(74, 144, 226, 0.2)';
                box.style.opacity = '1';
            } else {
                box.style.border = '2px dashed rgba(74, 144, 226, 0.6)';
                box.style.background = 'rgba(74, 144, 226, 0.1)';
                box.style.opacity = '0.7';
            }
        });
    }
    
    // Show deployment options popup (Dyad-style)
    function showDeploymentPopup() {
        const popup = document.createElement('div');
        popup.id = 'deployment-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border-radius: 12px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; font-size: 24px;">🚀 Deploy Your Website</h2>
                <button onclick="closeDeploymentPopup()" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            
            <div style="margin-bottom: 24px;">
                <p style="color: #ccc; margin-bottom: 20px;">Choose your deployment stack:</p>
                
                <div id="deployment-options" style="display: grid; gap: 16px;">
                    <!-- Static Website -->
                    <div class="deploy-option" data-type="static" style="border: 2px solid #333; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.2s ease;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <span style="font-size: 24px;">⚡</span>
                            <h3 style="margin: 0;">Static Website</h3>
                            <span style="background: #4A90E2; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Fastest</span>
                        </div>
                        <p style="color: #999; margin: 0; font-size: 14px;">Perfect for landing pages, portfolios, and marketing sites</p>
                        <div style="margin-top: 12px; display: flex; gap: 8px;">
                            <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Netlify</span>
                        </div>
                    </div>
                    
                    <!-- Full-Stack App -->
                    <div class="deploy-option" data-type="fullstack" style="border: 2px solid #333; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.2s ease;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <span style="font-size: 24px;">🔥</span>
                            <h3 style="margin: 0;">Full-Stack App</h3>
                            <span style="background: #10B981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Popular</span>
                        </div>
                        <p style="color: #999; margin: 0; font-size: 14px;">Complete app with database, auth, APIs, and real-time features</p>
                        <div style="margin-top: 12px;">
                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ Database</span>
                                <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ Authentication</span>
                                <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ Real-time</span>
                                <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ API</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- E-commerce -->
                    <div class="deploy-option" data-type="ecommerce" style="border: 2px solid #333; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.2s ease;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <span style="font-size: 24px;">🛒</span>
                            <h3 style="margin: 0;">E-commerce Store</h3>
                            <span style="background: #F59E0B; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Pro</span>
                        </div>
                        <p style="color: #999; margin: 0; font-size: 14px;">Online store with payments, inventory, and order management</p>
                        <div style="margin-top: 12px; display: flex; gap: 8px;">
                            <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Stripe</span>
                            <span style="background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Supabase</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="closeDeploymentPopup()" style="background: #333; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">Cancel</button>
                <button id="deploy-button" onclick="startDeployment()" disabled style="background: #4A90E2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; opacity: 0.5;">Deploy Now</button>
            </div>
        `;
        
        popup.appendChild(modal);
        document.body.appendChild(popup);
        
        // Add option selection handlers
        setupDeploymentOptions(modal);
    }
    
    function closeDeploymentPopup() {
        const popup = document.getElementById('deployment-popup');
        if (popup) popup.remove();
    }
    
    function setupDeploymentOptions(modal) {
        const options = modal.querySelectorAll('.deploy-option');
        options.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selection from all options
                options.forEach(opt => {
                    opt.style.border = '2px solid #333';
                    opt.style.background = 'transparent';
                });
                
                // Select this option
                this.style.border = '2px solid #4A90E2';
                this.style.background = 'rgba(74, 144, 226, 0.1)';
                
                // Enable deploy button
                const deployBtn = document.getElementById('deploy-button');
                deployBtn.disabled = false;
                deployBtn.style.opacity = '1';
                deployBtn.dataset.deployType = this.dataset.type;
            });
        });
    }
    
    function startDeployment() {
        const deployBtn = document.getElementById('deploy-button');
        const deployType = deployBtn.dataset.deployType;
        
        closeDeploymentPopup();
        
        // Send deployment request to Ghost
        sendDeploymentRequestToGhost(deployType);
    }
    
    function sendDeploymentRequestToGhost(deployType) {
        console.log('[Deployment] Sending request to Ghost:', deployType);
        
        const chatInput = document.querySelector('textarea[placeholder*="message"]') || 
                         document.querySelector('textarea');
        
        if (chatInput) {
            let prompt = '';
            
            if (deployType === 'static') {
                prompt = 'Deploy this website as a static site using netlify_deploy';
            } else if (deployType === 'fullstack') {
                prompt = 'Deploy this as a full-stack application with database and authentication using fullstack_deploy with features: ["database", "auth", "realtime"]';
            } else if (deployType === 'ecommerce') {
                prompt = 'Deploy this as an e-commerce store using fullstack_deploy with features: ["database", "auth", "storage", "payments"]';
            }
            
            chatInput.value = prompt;
            
            // Auto-send
            setTimeout(() => {
                const sendBtn = document.querySelector('button[type="submit"]');
                if (sendBtn) {
                    sendBtn.click();
                    showToast(`🚀 Deploying ${deployType} application...`);
                }
            }, 500);
        }
    }
    
    // Show AI edit popup
    function showAIEditPopup(element) {
        const popup = document.getElementById('ai-edit-popup');
        const input = document.getElementById('ai-edit-input');
        
        if (popup && input) {
            // Store reference to selected element
            popup.dataset.selectedElement = element ? element.tagName : 'element';
            
            // Show popup with animation
            popup.style.display = 'block';
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            setTimeout(() => {
                popup.style.transition = 'all 0.2s ease';
                popup.style.opacity = '1';
                popup.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            
            // Focus input
            input.focus();
            input.value = '';
            
            console.log('[AI Edit] Popup shown for element:', element?.tagName || 'unknown');
        }
    }
    
    // Hide AI edit popup
    function hideAIEditPopup() {
        const popup = document.getElementById('ai-edit-popup');
        if (popup) {
            popup.style.transition = 'all 0.2s ease';
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            setTimeout(() => {
                popup.style.display = 'none';
            }, 200);
        }
    }
    
    // Apply AI edit
    function applyAIEdit() {
        const input = document.getElementById('ai-edit-input');
        const popup = document.getElementById('ai-edit-popup');
        
        if (!input || !input.value.trim()) {
            showToast('⚠️ Please describe the changes you want to make');
            return;
        }
        
        const instruction = input.value.trim();
        const elementType = popup?.dataset.selectedElement || 'element';
        
        console.log('[AI Edit] Processing instruction:', instruction);
        
        // Hide popup first
        hideAIEditPopup();
        
        // Show loading
        showDesignLoading('Processing AI request...', `Applying: "${instruction}"`);
        
        // Send to Ghost AI for processing
        sendDesignChangeToGhost(instruction, elementType);
        
        // Simulate AI processing for now
        setTimeout(() => {
            hideDesignLoading();
            showToast(`✨ Applied: "${instruction}"`);
            
            // TODO: Apply actual changes to the iframe element
            applyDesignChange(instruction, elementType);
        }, 999999);
    }
    
    // Send design change request to Ghost AI
    function sendDesignChangeToGhost(instruction, elementType) {
        console.log('[Ghost Integration] Sending design change to Ghost:', {instruction, elementType});
        
        // Find the main chat input
        const chatInput = document.querySelector('textarea[placeholder*="message"]') || 
                         document.querySelector('#message-input') ||
                         document.querySelector('textarea');
        
        if (chatInput) {
            const prompt = `Apply this design change: "${instruction}" to the ${elementType} element on the current webpage. Generate the necessary CSS/HTML changes.`;
            
            // Set the prompt
            chatInput.value = prompt;
            chatInput.focus();
            
            // Trigger any reactive updates
            if (window.Alpine) {
                chatInput.dispatchEvent(new Event('input'));
            }
            
            // Auto-send the request
            setTimeout(() => {
                const sendBtn = document.querySelector('button[type="submit"]') ||
                               document.querySelector('.send-button') ||
                               document.querySelector('[onclick*="send"]');
                
                if (sendBtn) {
                    sendBtn.click();
                    console.log('[Ghost Integration] Design change request sent to Ghost');
                }
            }, 500);
        }
    }
    
    // Apply design changes to the iframe
    function applyDesignChange(instruction, elementType) {
        console.log('[Design Apply] Applying change:', instruction, 'to', elementType);
        
        // For now, show success message
        // TODO: Parse Ghost's response and apply actual CSS changes
        showToast(`🎨 Design updated: ${instruction}`);
        
        // Example of what we could do:
        // - Parse Ghost's CSS response
        // - Apply styles to iframe elements
        // - Update the webpage in real-time
    }
    
    // Show design loading overlay
    function showDesignLoading(title, subtitle) {
        const loading = document.getElementById('design-loading');
        const titleEl = document.getElementById('design-loading-text');
        const subtitleEl = document.getElementById('design-loading-subtitle');
        
        if (loading) {
            if (titleEl) titleEl.textContent = title;
            if (subtitleEl) subtitleEl.textContent = subtitle;
            
            loading.style.display = 'flex';
            loading.style.opacity = '0';
            
            setTimeout(() => {
                loading.style.transition = 'opacity 0.2s ease';
                loading.style.opacity = '1';
            }, 10);
        }
    }
    
    // Hide design loading overlay
    function hideDesignLoading() {
        const loading = document.getElementById('design-loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 200);
        }
    }
    
    // Hide embedded Dyad interface and return to gallery
    function hideEmbeddedDyad() {
        console.log('[Dyad Integration] Hiding embedded interface');
        
        const emptyState = document.getElementById('design-empty-state');
        const embeddedInterface = document.getElementById('dyad-embedded-interface');
        
        if (embeddedInterface) embeddedInterface.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        
        showToast('🏠 Returned to Design Studio gallery');
    }
    
    // Send AI context to embedded Dyad
    function sendAIContextToDyad() {
        console.log('[Dyad Integration] Sending AI context to embedded Dyad');
        
        // Get recent chat context for AI suggestions
        const chatMessages = document.querySelectorAll('.message-content');
        let recentContext = '';
        
        // Get last few messages for context
        const recentMessages = Array.from(chatMessages).slice(-5);
        recentMessages.forEach(msg => {
            recentContext += msg.textContent + ' ';
        });
        
        // Prepare context data
        const contextData = {
            type: 'GHOST_AI_CONTEXT',
            timestamp: new Date().toISOString(),
            data: {
                userRequest: recentContext.trim(),
                suggestedComponents: ['hero', 'features', 'pricing', 'testimonials'],
                aiInsights: 'Ghost AI suggests a modern, professional design approach',
                brandColors: ['#4A90E2', '#1a1a1a', '#4ade80'],
                designStyle: 'modern, clean, responsive'
            }
        };
        
        // Send to embedded Dyad iframe
        const iframe = document.getElementById('dyad-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(contextData, 'http://localhost:50672');
            showToast('🤖 AI context sent to Dyad Studio!');
        } else {
            showToast('⚠️ Could not connect to Dyad. Please try refreshing.');
        }
    }

    function sendDesignPromptToGhost(prompt) {
        console.log('[Dyad Integration] Sending prompt to Ghost:', prompt);
        
        // Find the main chat input
        const chatInput = document.querySelector('textarea[placeholder*="message"]') || 
                         document.querySelector('#message-input') ||
                         document.querySelector('textarea');
        
        if (chatInput) {
            // Set the prompt text
            chatInput.value = prompt;
            chatInput.focus();
            
            // Trigger any Alpine.js or other reactive updates
            if (window.Alpine) {
                chatInput.dispatchEvent(new Event('input'));
            }
            
            showToast('Design prompt added to chat! Press Enter to send.');
            
            // Auto-send after short delay if send button found
            setTimeout(() => {
                const sendBtn = document.querySelector('button[type="submit"]') ||
                               document.querySelector('.send-button') ||
                               document.querySelector('[onclick*="send"]');
                
                if (sendBtn) {
                    sendBtn.click();
                    showToast('Design request sent to Ghost!');
                }
            }, 1000);
        } else {
            showToast('Could not find chat input. Please copy this prompt: ' + prompt);
        }
    }
    
    // Design trigger detection removed - was causing CPU issues with polling
    // Design UI still works via direct user interaction
    function detectDesignTrigger_REMOVED() {
        // Look for design interface trigger messages in recent messages
        const messageElements = document.querySelectorAll('.message-text, .message-content, .agent-message');
        
        // Also check for specific trigger keywords in Ghost responses
        const triggerKeywords = [
            'DESIGN_INTERFACE_TRIGGER',
            'Polished Design Interface Launching',
            'Full-Screen Design Mode',
            'design interface should open automatically',
            'polished design interface should activate',
            'polished design interface should now be active',
            'Design interface successfully launched',
            'Modern SaaS Landing Page Design Interface Ready',
            'Design Studio',
            'Create websites and apps through natural language'
        ];
        
        for (let element of messageElements) {
            const textContent = element.textContent || '';
            const innerHTML = element.innerHTML || '';
            
            // Check for trigger keywords in text or HTML
            const hasTrigger = triggerKeywords.some(keyword => 
                textContent.includes(keyword) || innerHTML.includes(keyword)
            );
            
            if (hasTrigger) {
                console.log('[Design Interface] Auto-trigger detected in message', { 
                    textContent: textContent.slice(0, 200),
                    matchedKeywords: triggerKeywords.filter(k => textContent.includes(k) || innerHTML.includes(k))
                });
                
                // Extract design context if available
                const contextMatch = textContent.match(/description: "([^"]+)"|Project\*\*:\s*([^\n]+)|Coffee Shop Website Design/);
                if (contextMatch) {
                    window.designContext = {
                        description: contextMatch[1] || contextMatch[2] || 'Modern coffee shop design project',
                        type: 'website',
                        url: 'https://example.com'
                    };
                    console.log('[Design Interface] Context set:', window.designContext);
                }
                
                // Launch the design interface (A2A first, then embedded)
                setTimeout(() => {
                    console.log('[Design Interface] Auto-launching design interface...');
                    launchDesignInterface();
                }, 500);
                
                return;
            }
            
            // Also check for embedded script tags with showEmbeddedDyad
            if (innerHTML.includes('showEmbeddedDyad')) {
                console.log('[Design Interface] showEmbeddedDyad script detected, executing...');
                setTimeout(() => {
                    launchDesignInterface();
                }, 500);
                return;
            }
        }
    }

    // Design trigger polling removed - was causing CPU overload
    
    // Also check when new messages are added to the DOM
    if (window.MutationObserver) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new message nodes were added
                    const hasNewMessage = Array.from(mutation.addedNodes).some(node => {
                        return node.nodeType === Node.ELEMENT_NODE && 
                               (node.classList.contains('message') || 
                                node.querySelector && node.querySelector('.message-text, .message-content, .agent-message'));
                    });
                    
                    if (hasNewMessage) {
                        console.log('[Design Interface] New message detected, checking for triggers...');
                        // Design trigger detection removed
                    }
                }
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Force hide loading screens
    window.forceHideLoading = function() {
        console.log('[Force] Hiding all loading screens...');
        
        // Hide various loading elements
        const selectors = [
            '.loading-overlay', '.processing', '.loader', '.spinner', 
            '[class*="loading"]', '[id*="loading"]', '[class*="process"]'
        ];
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.opacity = '0';
                });
            } catch (e) {
                // Ignore selector errors
            }
        });
        
        // Also check for text-based loading indicators
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.textContent && el.textContent.includes('Processing')) {
                const parent = el.parentElement;
                if (parent) {
                    parent.style.display = 'none';
                }
            }
        });
    };

    // Manual trigger function accessible from console
    window.manualDesignTrigger = function() {
        console.log('[Manual Trigger] Launching design interface...');
        
        // First hide any loading
        window.forceHideLoading();
        
        // Then show the interface
        setTimeout(() => {
            launchDesignInterface();
        }, 100);
    };
    
    // Removed Test Design Interface button - UI-TARS loads automatically
    /*
    setTimeout(() => {
        const testButton = document.createElement('button');
        testButton.innerHTML = '🎨 Test Design Interface';
        testButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10001;
            background: #4A90E2;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
        `;
        testButton.onclick = () => {
            console.log('[Test] Manually triggering design interface...');
            if (typeof launchDesignInterface === 'function') {
                launchDesignInterface();
                // Auto-load a demo website for testing
                setTimeout(() => {
                    const iframe = document.getElementById('design-canvas-iframe');
                    if (iframe) {
                        iframe.src = 'https://coffee-shop-template.netlify.app';
                        console.log('[Test] Loading demo coffee shop website...');
                    }
                }, 999999);
            } else {
                console.error('[Test] launchDesignInterface function not found!');
            }
        };
        document.body.appendChild(testButton);
    }, 999999);
    */
    
    // Initialize UI-TARS integration when DOM is ready
    // initializeDyadIntegration();  // Commented out - using UI-TARS now
    
    // Auto-load UI-TARS when designs tab is clicked
    launchDesignInterface();
    
    // Ghost Design Studio Smart Routing
    window.ghostDesignStudio = {
        currentMode: 'idle',
        
        // Route task to appropriate tool
        routeTask: function(task) {
            const taskLower = task.toLowerCase();
            
            // Determine best tool for task
            if (taskLower.includes('browse') || taskLower.includes('navigate') || 
                taskLower.includes('search') || taskLower.includes('website')) {
                this.launchChrome(task);
            } else if (taskLower.includes('design') || taskLower.includes('build') || 
                       taskLower.includes('ui') || taskLower.includes('frontend') || 
                       taskLower.includes('dyad')) {
                this.launchDyad(task);
            } else if (taskLower.includes('code') || taskLower.includes('edit') || 
                       taskLower.includes('vscode')) {
                this.launchVSCode(task);
            } else {
                // Default to Chrome for unknown tasks
                this.launchChrome(task);
            }
        },
        
        // Launch Chrome browser with VNC
        launchChrome: function(task) {
            console.log('Launching Chrome for:', task);
            const ghostWaiting = document.getElementById('ghost-waiting-state');
            const iframe = document.getElementById('designs-browser-iframe');
            const status = document.getElementById('design-status');
            
            if (ghostWaiting) ghostWaiting.style.display = 'none';
            if (iframe) {
                iframe.src = 'http://localhost:5800/vnc.html';
                iframe.style.display = 'block';
            }
            if (status) status.textContent = 'Chrome Active';
            
            this.currentMode = 'chrome';
        },
        
        // Launch Dyad extension
        launchDyad: function(task) {
            console.log('Launching Dyad for:', task);
            const ghostWaiting = document.getElementById('ghost-waiting-state');
            const iframe = document.getElementById('designs-browser-iframe');
            const status = document.getElementById('design-status');
            
            if (ghostWaiting) ghostWaiting.style.display = 'none';
            if (iframe) {
                // In production, this would trigger the Dyad Chrome extension
                // For now, loading Dyad web app
                iframe.src = 'https://dyad.ai/app';
                iframe.style.display = 'block';
            }
            if (status) status.textContent = 'Dyad Active';
            
            this.currentMode = 'dyad';
        },
        
        // Launch VS Code
        launchVSCode: function(task) {
            console.log('Launching VS Code for:', task);
            const ghostWaiting = document.getElementById('ghost-waiting-state');
            const iframe = document.getElementById('designs-browser-iframe');
            const status = document.getElementById('design-status');
            
            if (ghostWaiting) ghostWaiting.style.display = 'none';
            if (iframe) {
                iframe.src = 'https://vscode.dev';
                iframe.style.display = 'block';
            }
            if (status) status.textContent = 'VS Code Active';
            
            this.currentMode = 'vscode';
        },
        
        // Return to waiting state
        reset: function() {
            const ghostWaiting = document.getElementById('ghost-waiting-state');
            const iframe = document.getElementById('designs-browser-iframe');
            const status = document.getElementById('design-status');
            
            if (ghostWaiting) ghostWaiting.style.display = 'flex';
            if (iframe) {
                iframe.src = '';
                iframe.style.display = 'none';
            }
            if (status) status.textContent = 'Ready';
            
            this.currentMode = 'idle';
        }
    };
    
    // Listen for Ghost commands
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'ghost-design-command') {
            if (event.data.action === 'start-task') {
                window.ghostDesignStudio.routeTask(event.data.task);
            } else if (event.data.action === 'stop') {
                window.ghostDesignStudio.reset();
            }
        }
    });
    
    console.log('[Phantom Console] Initialization complete!');
    
    // Add refresh functions for SSE
    window.phantomConsole = window.phantomConsole || {};
    
    window.phantomConsole.refreshWorkspace = function() {
        console.log('[PhantomSSE] Refreshing workspace tab...');
        if (window.loadInitialVisualizations) {
            window.loadInitialVisualizations();
        }
    };
    
    window.phantomConsole.refreshDesigns = function() {
        console.log('[PhantomSSE] Refreshing designs tab...');
        // Trigger designs tab refresh
        if (window.detectAndShowDesigns) {
            window.detectAndShowDesigns();
        }
    };
    
    // Initialize SSE for real-time updates
    if (window.initializeConsoleSSE) {
        console.log('[Phantom Console] Starting SSE for real-time updates...');
        window.initializeConsoleSSE();
    }
}

// Initialize the Phantom Console with proper timing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePhantomConsole);
} else {
    // DOM is already loaded
    initializePhantomConsole();
}

// Also expose the initialization function globally for manual retry
window.initializePhantomConsole = initializePhantomConsole;
// Browser Use Cloud Integration - DISABLED for performance
// This polling was causing excessive CPU usage and 404 errors
// Browser Use Cloud should be triggered explicitly by user actions
/*
setInterval(async () => {
    try {
        const response = await fetch('/tmp/browser_cloud_trigger.json?' + Date.now());
        if (response.ok) {
            const data = await response.json();
            if (data.type === 'browser_cloud_started') {
                const iframe = document.getElementById('operations-browser-iframe');
                if (iframe && data.preview_url) {
                    console.log('Loading Browser Use Cloud:', data.preview_url);
                    iframe.src = data.preview_url;
                    
                    // Clear the trigger file
                    fetch('/tmp/browser_cloud_trigger.json', {
                        method: 'DELETE'
                    }).catch(() => {});
                }
            }
        }
    } catch (e) {
        // Ignore errors when file doesn't exist
    }
}, 30000); // Reduced to 30 seconds if re-enabled
*/
