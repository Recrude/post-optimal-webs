// multilingual.js
// 모든 요소에서 영문은 mono, 한글은 지백 폰트로 자동 적용

document.addEventListener('DOMContentLoaded', function () {
    function wrapLangSpans(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            // 영문, 한글, 기타로 분리
            const parts = text.split(/([A-Za-z0-9.,'"\-:;!?()\[\]{}<>@#$%^&*_+=~`|/\\]+|[\u3131-\u318E\uAC00-\uD7A3]+)/g);
            if (parts.length > 1) {
                const frag = document.createDocumentFragment();
                parts.forEach(part => {
                    if (!part) return;
                    if (/^[A-Za-z0-9.,'"\-:;!?()\[\]{}<>@#$%^&*_+=~`|/\\]+$/.test(part)) {
                        const span = document.createElement('span');
                        span.style.fontFamily = "'Suisse Int'l Mono', monospace";
                        span.style.letterSpacing = '-0.01em';
                        span.style.wordSpacing = '-0.08em';
                        span.style.lineHeight = '1.2';
                        span.textContent = part;
                        frag.appendChild(span);
                    } else if (/^[\u3131-\u318E\uAC00-\uD7A3]+$/.test(part)) {
                        const span = document.createElement('span');
                        span.style.fontFamily = "'지백', sans-serif";
                        span.style.letterSpacing = '0.01em';
                        span.textContent = part;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(part));
                    }
                });
                node.parentNode.replaceChild(frag, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT','STYLE','TEXTAREA'].includes(node.tagName)) {
            Array.from(node.childNodes).forEach(wrapLangSpans);
        }
    }
    wrapLangSpans(document.body);
}); 