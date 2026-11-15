var WeBWorKerPanelTools = (() => {
    const scientific = 'https://www.desmos.com/scientific';
    const graphing = 'https://www.desmos.com/calculator';
    const wolfram = 'https://www.wolframalpha.com/';
    const allowed = [scientific, graphing, wolfram];
    const validTool = value => allowed.includes(value) ? value : scientific;
    const destination = (tool, query = '') => {
        tool = validTool(tool);
        if (tool !== wolfram || !query.trim()) return tool;
        const url = new URL('https://www.wolframalpha.com/input');
        url.searchParams.set('i', query.trim());
        return url.toString();
    };
    return { scientific, graphing, wolfram, validTool, destination };
})();

document.addEventListener('DOMContentLoaded', () => {
    const tools = WeBWorKerPanelTools;
    const selector = document.getElementById('toolSelector');
    const query = document.getElementById('wolframQuery');
    const form = document.getElementById('wolframForm');
    const status = document.getElementById('toolStatus');
    const frames = new Map([
        [tools.scientific, document.getElementById('scientificFrame')],
        [tools.graphing, document.getElementById('graphingFrame')]
    ]);
    let selectedTool = tools.scientific;
    let draftTimer;
    let draftWrites = Promise.resolve();
    const showError = message => { status.textContent = message; status.hidden = false; };
    const clearError = () => { status.textContent = ''; status.hidden = true; };

    function selectTool(value) {
        selectedTool = tools.validTool(value);
        selector.value = selectedTool;
        const isWolfram = selectedTool === tools.wolfram;
        document.getElementById('wolframTool').hidden = !isWolfram;
        // Each calculator keeps its browsing context when another tool is shown.
        for (const [url, frame] of frames) {
            frame.hidden = url !== selectedTool;
            if (!frame.hidden && !frame.getAttribute('src')) frame.src = url;
        }
    }

    function saveDraft() {
        clearTimeout(draftTimer);
        const value = query.value;
        draftWrites = draftWrites.catch(() => {}).then(() => chrome.storage.local.set({ wolframAlphaQuery: value }));
        return draftWrites;
    }

    async function openTool() {
        clearError();
        const tool = selectedTool;
        const expression = query.value;
        try {
            if (tool === tools.wolfram) {
                try { await saveDraft(); } catch { /* A storage failure must not stop opening the query. */ }
            }
            await chrome.tabs.create({ url: tools.destination(tool, expression) });
        } catch {
            showError('Could not open a new tab. Please try again.');
        }
    }

    selector.addEventListener('change', async () => {
        clearError();
        selectTool(selector.value);
        try { await chrome.storage.sync.set({ selectedTool }); }
        catch { showError('Could not save your tool selection.'); }
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (query.value.trim()) openTool();
    });
    query.addEventListener('input', () => {
        clearTimeout(draftTimer);
        draftTimer = setTimeout(() => { saveDraft().catch(() => showError('Could not save your query draft.')); }, 300);
    });
    query.addEventListener('change', () => { saveDraft().catch(() => showError('Could not save your query draft.')); });

    (async () => {
        try {
            const [settings, draft] = await Promise.all([
                chrome.storage.sync.get({ selectedTool: tools.scientific }),
                chrome.storage.local.get({ wolframAlphaQuery: '' })
            ]);
            query.value = typeof draft.wolframAlphaQuery === 'string' ? draft.wolframAlphaQuery : '';
            selectTool(settings.selectedTool);
        } catch {
            selectTool(tools.scientific);
            showError('Could not load saved settings. Using Desmos Scientific.');
        } finally {
            selector.disabled = false;
        }
    })();
});
