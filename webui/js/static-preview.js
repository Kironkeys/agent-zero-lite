/**
 * Static Preview System
 * No WebContainer, no dev server - just render HTML/CSS/JS directly
 */

class StaticPreview {
    constructor() {
        this.previewFrame = null;
    }

    init() {
        this.previewFrame = document.getElementById('preview-frame') || 
                           document.getElementById('designs-browser-iframe');
    }

    // Render static files directly
    renderPreview(files) {
        if (!this.previewFrame) return;

        // Find the HTML file
        let htmlContent = files['index.html'] || '';
        
        // Inject CSS files as style tags
        const cssFiles = Object.keys(files).filter(f => f.endsWith('.css'));
        cssFiles.forEach(file => {
            const css = files[file];
            htmlContent = htmlContent.replace('</head>', 
                `<style>${css}</style></head>`);
        });

        // For React apps - build a simple static version
        if (files['src/App.tsx'] || files['src/App.jsx']) {
            htmlContent = this.buildStaticReactPreview(files);
        }

        // Create blob URL and load in iframe
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        this.previewFrame.src = url;
    }

    // Convert React to static HTML for preview
    buildStaticReactPreview(files) {
        // Extract the JSX and convert to HTML
        const appFile = files['src/App.tsx'] || files['src/App.jsx'];
        
        // Simple regex to extract the return JSX
        const jsxMatch = appFile.match(/return\s*\(([\s\S]*?)\);/);
        if (!jsxMatch) return '<html><body>Preview loading...</body></html>';
        
        let jsx = jsxMatch[1];
        
        // Convert className to class
        jsx = jsx.replace(/className=/g, 'class=');
        
        // Remove {expressions} for static preview
        jsx = jsx.replace(/\{[^}]+\}/g, 'Content');
        
        // Add Tailwind CDN for styling
        const html = `
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        ${files['src/index.css'] || ''}
    </style>
</head>
<body>
    <div id="root">
        ${jsx}
    </div>
</body>
</html>`;
        
        return html;
    }
}

// Listen for Ghost's generated files
window.addEventListener('message', (e) => {
    if (e.data.type === 'preview-files') {
        const preview = new StaticPreview();
        preview.init();
        preview.renderPreview(e.data.files);
    }
});