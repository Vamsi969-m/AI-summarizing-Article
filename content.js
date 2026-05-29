function getArticleText() {
    const article = document.querySelector("article");
    if (article) return article.innerText.trim();

    const main = document.querySelector("main");
    if (main) return main.innerText.trim();

    const paragraphs = Array.from(document.querySelectorAll("p"));
    const paragraphText = paragraphs.map((p) => p.innerText.trim()).filter(Boolean).join("\n");
    if (paragraphText) return paragraphText;

    const sections = Array.from(document.querySelectorAll("section"));
    const sectionText = sections.map((s) => s.innerText.trim()).filter(Boolean).join("\n");
    if (sectionText) return sectionText;

    const bodyText = document.body ? document.body.innerText.trim() : "";
    return bodyText;
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req.type === "GET_ARTICLE_TEXT") {
        const text = getArticleText();
        sendResponse({ text });
    }
});