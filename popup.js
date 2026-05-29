
document.getElementById("summarize").addEventListener("click", async () => {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

    const summaryType = document.getElementById("summary-type").value;

    // Get API key from storage
    chrome.storage.sync.get(["geminiApiKey"], async (result) => {
        if (!result.geminiApiKey) {
            resultDiv.innerHTML =
                "API key not found. Please set your API key in the extension options.";
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            chrome.tabs.sendMessage(
                tab.id,
                { type: "GET_ARTICLE_TEXT" },
                async (res) => {
                    if (!res || !res.text) {
                        resultDiv.innerText =
                            "Could not extract article text from this page.";
                        return;
                    }

                    try {
                        const summary = await getGeminiSummary(
                            res.text,
                            summaryType,
                            result.geminiApiKey
                        );
                        resultDiv.innerText = summary;
                    } catch (error) {
                        resultDiv.innerText = `Error: ${
                            error.message || "Failed to generate summary."
                        }`;
                    }
                }
            );
        });
    });
});

// Copy button handler
const copyBtn = document.getElementById("copy-btn");
if (copyBtn) {
    copyBtn.addEventListener("click", () => {
        const summaryText = document.getElementById("result").innerText;
        if (summaryText && summaryText.trim() !== "") {
            navigator.clipboard
                .writeText(summaryText)
                .then(() => {
                    const original = copyBtn.innerText;
                    copyBtn.innerText = "Copied!";
                    setTimeout(() => (copyBtn.innerText = original), 2000);
                })
                .catch((err) => console.error("Failed to copy text:", err));
        }
    });
}

function summarizeText(text, summaryType) {
    // Prefer robust sentence splitting; fall back to paragraphs or character truncation
    const normalized = text.replace(/\s+$/g, "").trim();

    // Try to split into sentences using punctuation
    let sentences = normalized.match(/[^.!?]+[.!?]+/g) || [];

    // If sentence splitting failed (e.g., long paragraphs without punctuation), use paragraphs
    if (sentences.length <= 1) {
        const paragraphs = text.split(/\r?\n{2,}|\r\n{2,}/).map(p => p.trim()).filter(Boolean);
        if (paragraphs.length > 0) {
            if (summaryType === "bullets") {
                return paragraphs
                    .slice(0, 5)
                    .map(p => `• ${p.split(/\r?\n/)[0].slice(0, 300).trim()}${p.length > 300 ? '...' : ''}`)
                    .join("\n");
            }

            if (summaryType === "brief") {
                return paragraphs.slice(0, 2).join(' ').slice(0, 400).trim() + (paragraphs.join(' ').length > 400 ? '...' : '');
            }

            if (summaryType === "detail") {
                return paragraphs.slice(0, 4).join(' ').slice(0, 1200).trim() + (paragraphs.join(' ').length > 1200 ? '...' : '');
            }
        }

        // As a last resort, create pseudo-sentences by splitting on length
        sentences = normalized.match(/(.|\s){1,200}/g) || [normalized];
    }

    if (summaryType === "brief") {
        return sentences.slice(0, 2).join(" ").trim().slice(0, 400) + (sentences.join(' ').length > 400 ? '...' : '');
    }

    if (summaryType === "detail") {
        return sentences.slice(0, 6).join(" ").trim().slice(0, 1200) + (sentences.join(' ').length > 1200 ? '...' : '');
    }

    if (summaryType === "bullets") {
        return sentences
            .slice(0, 6)
            .map((s) => `• ${s.trim().slice(0, 300)}${s.length > 300 ? '...' : ''}`)
            .join("\n");
    }

    return sentences.slice(0, 3).join(" ").trim().slice(0, 600) + (sentences.join(' ').length > 600 ? '...' : '');
}

async function getGeminiSummary(text, summaryType, apiKey) {
    // Truncate very long texts to avoid API limits (typically around 30K tokens)
    const maxLength = 20000;
    const truncatedText =
        text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

    // Accept both `detail` and `detailed` summary-type values
    let normalizedType = summaryType;
    if (summaryType === "detailed") normalizedType = "detail";

    let prompt;
    switch (normalizedType) {
        case "brief":
            prompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
            break;
        case "detail":
            prompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
            break;
        case "bullets":
            prompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- " (dash followed by a space). Do not use asterisks or other bullet symbols, only use the dash. Keep each point concise and focused on a single key insight from the article:\n\n${truncatedText}`;
            break;
        default:
            prompt = `Summarize the following article:\n\n${truncatedText}`;
    }

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.2,
                    },
                }),
            }
        );

        if (!res.ok) {
            // Try to parse error body if present
            let errorData = null;
            try {
                errorData = await res.json();
            } catch (e) {
                /* ignore */
            }
            throw new Error(errorData?.error?.message || "API request failed");
        }

        const data = await res.json();

        function extractText(item) {
            if (!item && item !== "") return "";
            if (typeof item === "string") return item;
            if (Array.isArray(item)) return item.map(extractText).join("");
            if (typeof item === "object") {
                if (typeof item.text === "string") return item.text;
                if (typeof item.output === "string") return item.output;
                if (Array.isArray(item.parts)) return item.parts.map(extractText).join("");
                if (Array.isArray(item.content)) return item.content.map(extractText).join("");
            }
            return "";
        }

        const candidate = data?.candidates?.[0] ?? data?.outputs?.[0];
        const extracted = extractText(candidate?.content ?? candidate?.output ?? candidate);
        if (extracted.trim()) return extracted.trim();

        const alt = data?.outputs?.[0]?.content;
        if (Array.isArray(alt)) {
            const altText = alt.map((c) => extractText(c)).join("");
            if (altText.trim()) return altText.trim();
        }

        return JSON.stringify(data);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate summary. Please try again later.");
    }
}