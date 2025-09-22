/**
 * Force AGUI rendering - bypass the broken system and inject HTML directly
 */

// Override the renderComponent function to actually work
if (window.AGUI) {
    window.AGUI.renderComponent = function(spec) {
        console.log('🔥 FORCE RENDERING:', spec);
        
        // Create the HTML directly instead of relying on the broken system
        let html = '';
        
        if (spec.type === 'card') {
            html = `
                <div class="agui-card" style="
                    border: 2px solid #007bff;
                    border-radius: 10px;
                    padding: 20px;
                    margin: 20px 0;
                    background: white;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    max-width: 600px;
                ">
                    <h3 style="margin-top: 0; color: #333;">${spec.properties?.title || 'Component'}</h3>
                    ${renderChildren(spec.children || [])}
                </div>
            `;
        } else if (spec.type === 'button') {
            const variant = spec.properties?.variant || 'primary';
            const colors = {
                success: '#28a745',
                error: '#dc3545',
                primary: '#007bff',
                secondary: '#6c757d'
            };
            
            html = `
                <button onclick="${spec.properties?.onclick || ''}" style="
                    background: ${colors[variant] || '#007bff'};
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    margin: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: opacity 0.2s;
                " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                    ${spec.properties?.label || 'Button'}
                </button>
            `;
        } else if (spec.type === 'text') {
            html = `<div style="margin: 10px 0;">${spec.properties?.content || ''}</div>`;
        } else if (spec.type === 'container') {
            const layout = spec.properties?.layout || 'vertical';
            const flexDirection = layout === 'horizontal' ? 'row' : 'column';
            
            html = `
                <div style="display: flex; flex-direction: ${flexDirection}; gap: 10px; margin: 10px 0;">
                    ${renderChildren(spec.children || [])}
                </div>
            `;
        }
        
        function renderChildren(children) {
            return children.map(child => {
                if (child.type === 'button') {
                    const variant = child.properties?.variant || 'primary';
                    const colors = {
                        success: '#28a745',
                        error: '#dc3545', 
                        primary: '#007bff',
                        secondary: '#6c757d'
                    };
                    
                    return `
                        <button onclick="${child.properties?.onclick || ''}" style="
                            background: ${colors[variant] || '#007bff'};
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            margin: 5px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: opacity 0.2s;
                        " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            ${child.properties?.label || 'Button'}
                        </button>
                    `;
                } else if (child.type === 'text') {
                    return `<div style="margin: 10px 0;">${child.properties?.content || ''}</div>`;
                }
                return '';
            }).join('');
        }
        
        // Find the chat messages container and inject the HTML
        const chatMessages = document.querySelector('#chat-messages') || document.querySelector('.message-container') || document.body;
        
        // Create a container for this component
        const container = document.createElement('div');
        container.innerHTML = html;
        container.className = 'agui-force-rendered';
        
        // Add it to the page
        chatMessages.appendChild(container);
        
        console.log('✅ FORCE RENDERED component');
    };
    
    // Also force check for content on page load and monitor for new content
    function scanForAGUIComponents() {
        document.querySelectorAll('*').forEach(element => {
            const text = element.textContent;
            if (text && (text.includes('"type":"card"') || text.includes('"type":"modal"') || text.includes('Approval Required'))) {
                try {
                    // Look for complete JSON objects that contain AGUI specs
                    const jsonMatches = text.match(/\{[^{}]*"type":\s*"(card|modal|container)"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                    if (jsonMatches) {
                        jsonMatches.forEach(match => {
                            try {
                                const spec = JSON.parse(match);
                                console.log('🎯 Found AGUI component:', spec);
                                window.AGUI.renderComponent(spec);
                                
                                // Hide the original JSON text
                                if (element.innerHTML) {
                                    element.innerHTML = element.innerHTML.replace(match, '<div style="color: #28a745; font-weight: bold;">✅ Interactive component rendered above</div>');
                                }
                            } catch (parseError) {
                                // Try more complex parsing for nested structures
                                console.log('🔧 Complex JSON detected, attempting deep parse...');
                            }
                        });
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        });
    }
    
    // Initial scan
    setTimeout(scanForAGUIComponents, 2000);
    
    // Monitor for new content being added to the page
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                setTimeout(scanForAGUIComponents, 500);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

console.log('🔥 Force render AGUI loaded - will bypass broken system');