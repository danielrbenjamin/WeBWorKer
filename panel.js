document.addEventListener('DOMContentLoaded', () => {
    console.log('panel.js loaded');

    const toolSelector = document.getElementById('toolSelector');
    const toolIframe = document.getElementById('toolIframe');

    // Load saved tool or default to Desmos Scientific
    (async () => {
        const data = await chrome.storage.sync.get({ selectedTool: 'https://www.desmos.com/scientific' });
        let selectedUrl = data.selectedTool;
        
        // Validate saved URL is one of our two options, otherwise reset to Scientific
        const validUrls = ['https://www.desmos.com/scientific', 'https://www.desmos.com/calculator'];
        if (!validUrls.includes(selectedUrl)) {
            selectedUrl = 'https://www.desmos.com/scientific';
            await chrome.storage.sync.set({ selectedTool: selectedUrl });
        }
        
        // Set the dropdown value
        toolSelector.value = selectedUrl;
        
        // Load the tool in iframe
        toolIframe.src = selectedUrl;
    })();

    // Handle tool selection change
    toolSelector.addEventListener('change', async () => {
        const selectedUrl = toolSelector.value;
        
        // Save the selection
        await chrome.storage.sync.set({ selectedTool: selectedUrl });
        
        // Load the tool in iframe
        toolIframe.src = selectedUrl;
    });
});
