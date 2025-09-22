// Add a button to quickly load WebContainer test app
document.addEventListener('DOMContentLoaded', () => {
    // Create button
    const button = document.createElement('button');
    button.innerHTML = '🚀 Load Test App';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        padding: 10px 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    button.onclick = () => {
        const iframe = document.getElementById('designs-browser-iframe');
        if (iframe) {
            iframe.contentWindow.postMessage({type: 'load-test-app', files: {}}, '*');
            console.log('Triggered test app!');
            
            // Flash button to show it worked
            button.style.background = '#10b981';
            setTimeout(() => {
                button.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            }, 500);
        }
    };
    
    document.body.appendChild(button);
});