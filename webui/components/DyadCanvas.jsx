import React, { useState, useEffect, useRef } from 'react';
import { MousePointerClick, RefreshCw, ExternalLink, Loader2, Power } from 'lucide-react';

const DyadCanvas = ({ appUrl, appName = 'Generated App' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [error, setError] = useState(null);
  const [isComponentSelectorInitialized, setIsComponentSelectorInitialized] = useState(false);
  const iframeRef = useRef(null);

  // Initialize component selector when iframe loads
  useEffect(() => {
    const handleMessage = (event) => {
      // Security: Only accept messages from our preview frame
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const { type, payload } = event.data || {};

      if (type === 'dyad-component-selector-initialized') {
        setIsComponentSelectorInitialized(true);
        console.log('Component selector initialized');
      } else if (type === 'component-selected') {
        setSelectedElement(payload);
        setIsPicking(false);
        console.log('Component selected:', payload);
        
        // Send selected component info to Ghost for editing
        if (window.ghost) {
          window.ghost.editComponent(payload);
        }
      } else if (type === 'iframe-error') {
        setError(payload?.message || 'Preview error occurred');
        console.error('Preview error:', payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Inject component selector script into iframe
  const injectComponentSelector = () => {
    if (!iframeRef.current?.contentWindow) return;

    const script = `
      (function() {
        if (window.__dyadComponentSelector) return;
        
        window.__dyadComponentSelector = true;
        let overlay = null;
        let isActive = false;
        
        // Create overlay element for highlighting
        function createOverlay() {
          overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.pointerEvents = 'none';
          overlay.style.border = '2px solid #3b82f6';
          overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          overlay.style.zIndex = '9999';
          overlay.style.transition = 'all 0.2s ease';
          overlay.style.display = 'none';
          document.body.appendChild(overlay);
        }
        
        // Update overlay position
        function updateOverlay(element) {
          if (!overlay || !element) return;
          
          const rect = element.getBoundingClientRect();
          overlay.style.left = rect.left + 'px';
          overlay.style.top = rect.top + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
          overlay.style.display = 'block';
        }
        
        // Get component info from element
        function getComponentInfo(element) {
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          // Try to find React component name
          let componentName = 'Unknown';
          const reactKey = Object.keys(element).find(key => key.startsWith('__reactInternalInstance'));
          if (reactKey) {
            const fiber = element[reactKey];
            componentName = fiber?.elementType?.name || fiber?.elementType?.displayName || 'Component';
          }
          
          return {
            tagName: element.tagName.toLowerCase(),
            className: element.className,
            id: element.id,
            componentName,
            text: element.textContent?.substring(0, 100),
            position: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            },
            styles: {
              color: computedStyle.color,
              backgroundColor: computedStyle.backgroundColor,
              fontSize: computedStyle.fontSize,
              fontWeight: computedStyle.fontWeight,
              padding: computedStyle.padding,
              margin: computedStyle.margin
            },
            path: getElementPath(element)
          };
        }
        
        // Get element path for precise selection
        function getElementPath(element) {
          const path = [];
          while (element && element !== document.body) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
              selector += '#' + element.id;
            } else if (element.className) {
              selector += '.' + element.className.split(' ').join('.');
            }
            path.unshift(selector);
            element = element.parentElement;
          }
          return path.join(' > ');
        }
        
        // Handle mouse move
        function handleMouseMove(e) {
          if (!isActive) return;
          
          const element = document.elementFromPoint(e.clientX, e.clientY);
          if (element && element !== overlay) {
            updateOverlay(element);
            element.style.cursor = 'pointer';
          }
        }
        
        // Handle click
        function handleClick(e) {
          if (!isActive) return;
          
          e.preventDefault();
          e.stopPropagation();
          
          const element = document.elementFromPoint(e.clientX, e.clientY);
          if (element && element !== overlay) {
            const componentInfo = getComponentInfo(element);
            
            // Send selection to parent
            window.parent.postMessage({
              type: 'component-selected',
              payload: componentInfo
            }, '*');
            
            // Deactivate selector
            deactivate();
          }
        }
        
        // Activate component selector
        function activate() {
          isActive = true;
          if (!overlay) createOverlay();
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('click', handleClick, true);
          document.body.style.cursor = 'crosshair';
        }
        
        // Deactivate component selector
        function deactivate() {
          isActive = false;
          if (overlay) {
            overlay.style.display = 'none';
          }
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('click', handleClick, true);
          document.body.style.cursor = 'auto';
        }
        
        // Listen for activation messages
        window.addEventListener('message', (e) => {
          if (e.data?.type === 'activate-dyad-component-selector') {
            activate();
          } else if (e.data?.type === 'deactivate-dyad-component-selector') {
            deactivate();
          }
        });
        
        // Notify parent that selector is ready
        window.parent.postMessage({
          type: 'dyad-component-selector-initialized'
        }, '*');
      })();
    `;

    // Inject the script
    iframeRef.current.contentWindow.eval(script);
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    
    // Inject component selector after a short delay
    setTimeout(() => {
      injectComponentSelector();
    }, 500);
  };

  // Toggle component picker
  const toggleComponentPicker = () => {
    if (!iframeRef.current?.contentWindow) return;
    
    const newIsPicking = !isPicking;
    setIsPicking(newIsPicking);
    
    iframeRef.current.contentWindow.postMessage({
      type: newIsPicking 
        ? 'activate-dyad-component-selector'
        : 'deactivate-dyad-component-selector'
    }, '*');
  };

  // Reload preview
  const reloadPreview = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  // Open in new tab
  const openInNewTab = () => {
    if (appUrl) {
      window.open(appUrl, '_blank');
    }
  };

  return (
    <div className="dyad-canvas h-full flex flex-col bg-gray-900">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">
            {appName}
          </span>
          {isLoading && (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Component Picker */}
          <button
            onClick={toggleComponentPicker}
            className={`p-2 rounded hover:bg-gray-700 transition-colors ${
              isPicking ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
            title="Select element to edit"
            disabled={!isComponentSelectorInitialized}
          >
            <MousePointerClick size={18} />
          </button>
          
          {/* Reload */}
          <button
            onClick={reloadPreview}
            className="p-2 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            title="Reload preview"
          >
            <RefreshCw size={18} />
          </button>
          
          {/* Open in new tab */}
          <button
            onClick={openInNewTab}
            className="p-2 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            title="Open in new tab"
            disabled={!appUrl}
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 relative bg-white">
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-50 border-b border-red-200 p-3 z-10">
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}
        
        {appUrl ? (
          <iframe
            ref={iframeRef}
            src={appUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            title="App Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Power size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Preview Available</p>
              <p className="text-sm mt-2">Generate an app to see the preview</p>
            </div>
          </div>
        )}
        
        {isPicking && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-20">
            <div className="flex items-center gap-2">
              <MousePointerClick size={16} />
              <span className="text-sm font-medium">
                Click any element to edit
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Selected Element Info */}
      {selectedElement && (
        <div className="p-3 bg-gray-800 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Selected: <span className="text-white font-mono">
              {selectedElement.componentName || selectedElement.tagName}
            </span>
            {selectedElement.className && (
              <span className="ml-2 text-gray-500">
                .{selectedElement.className.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DyadCanvas;