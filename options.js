document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('save');
    const clearBtn = document.getElementById('clear');
    const testBtn = document.getElementById('test');
    const status = document.getElementById('status');

    function showStatus(msg, timeout = 3000) {
        status.textContent = msg;
        if (timeout) setTimeout(() => { status.textContent = ''; }, timeout);
    }

    // Load existing key from chrome.storage.sync
    chrome.storage.sync.get(['geminiApiKey'], (res) => {
        if (res?.geminiApiKey) apiKeyInput.value = res.geminiApiKey;
    });

    saveBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            showStatus('Please enter a non-empty API key.');
            return;
        }

        chrome.storage.sync.set({ geminiApiKey: key }, () => {
            if (chrome.runtime.lastError) {
                showStatus('Failed to save key.');
                console.error(chrome.runtime.lastError);
                return;
            }
            showStatus('API key saved to chrome.storage.sync');
        });
    });

    clearBtn.addEventListener('click', () => {
        apiKeyInput.value = '';
        chrome.storage.sync.remove(['geminiApiKey'], () => {
            if (chrome.runtime.lastError) {
                showStatus('Failed to clear key.');
                console.error(chrome.runtime.lastError);
                return;
            }
            showStatus('API key cleared from storage');
        });
    });

    testBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) { showStatus('Please enter an API key first.'); return; }

        showStatus('Testing API key...', 0);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
        const body = { contents: [{ parts: [{ text: 'Test request' }] }], generationConfig: { temperature: 0, maxOutputTokens: 16 } };

        try {
            const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!resp.ok) {
                const textErr = await resp.text().catch(() => null);
                showStatus(`Test failed: ${resp.status} ${resp.statusText}` + (textErr ? ` — ${textErr}` : ''), 5000);
                return;
            }
            await resp.json();
            showStatus('API key valid — test request succeeded', 4000);
        } catch (err) {
            console.error('Test request error', err);
            showStatus('Network/CORS error during test — see console.', 6000);
        }
    });
});
