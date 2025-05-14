// 구글 스프레드시트 ID
const SPREADSHEET_ID = '1fmO_entYETXYX2rl-tWZUao6t6aQk5OBMq3EDstB6po';

// 썸네일 캐시
const thumbnailCache = new Map();

// 더미 이미지 배열 (귀여운 고양이 사진들)
const FALLBACK_IMAGES = [
    'https://http.cat/404',
    'https://http.cat/408',
    'https://http.cat/500',
    'https://http.cat/502',
    'https://http.cat/503',
    'https://http.cat/504'
];

// 랜덤 더미 이미지 가져오기
function getRandomFallbackImage() {
    const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    return FALLBACK_IMAGES[randomIndex];
}

// Fisher-Yates 셔플 알고리즘
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 데이터를 가져오는 함수
async function fetchData() {
    try {
        // 스프레드시트를 CSV 형식으로 가져옵니다
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`);
        const text = await response.text();
        
        // CSV 파싱
        const rows = text.split('\n').map(row => {
            // 쉼표로 분리하되, 따옴표로 묶인 내용은 하나의 필드로 처리
            const fields = [];
            let field = '';
            let inQuotes = false;
            
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    fields.push(field.replace(/""/g, '"'));
                    field = '';
                } else {
                    field += char;
                }
            }
            fields.push(field.replace(/""/g, '"'));
            return fields;
        });

        // 헤더를 제외한 데이터 행 수를 계산 (전체 행 수 - 1)
        const dataCount = rows.length - 1;
        
        // 숫자를 3자리 형식으로 변환 (예: 001, 012, 123)
        const formattedNumber = String(dataCount).padStart(3, '0');
        
        // number 클래스를 가진 모든 요소를 찾아 업데이트
        const numberElements = document.querySelectorAll('.number');
        numberElements.forEach(element => {
            element.textContent = formattedNumber + ' ';
        });

        return rows;
    } catch (error) {
        console.error('데이터를 가져오는 중 오류가 발생했습니다:', error);
        return null;
    }
}

// 웹사이트의 썸네일 이미지를 가져오는 함수 (타임아웃 포함)
async function fetchThumbnail(url, timeout = 5000) {
    // 캐시된 썸네일이 있으면 반환
    if (thumbnailCache.has(url)) {
        return thumbnailCache.get(url);
    }

    try {
        // 타임아웃 Promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), timeout);
        });

        // 썸네일 가져오기 Promise
        const fetchPromise = (async () => {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/html');
            
            let thumbnailUrl = null;

            // Open Graph 이미지
            const ogImage = doc.querySelector('meta[property="og:image"]');
            if (ogImage?.content) thumbnailUrl = ogImage.content;
            
            // Twitter 이미지
            if (!thumbnailUrl) {
                const twitterImage = doc.querySelector('meta[name="twitter:image"]');
                if (twitterImage?.content) thumbnailUrl = twitterImage.content;
            }
            
            // 첫 번째 이미지
            if (!thumbnailUrl) {
                const firstImage = doc.querySelector('img');
                if (firstImage?.src) thumbnailUrl = firstImage.src;
            }

            // 기본 이미지
            thumbnailUrl = thumbnailUrl || getRandomFallbackImage();
            
            // 캐시에 저장
            thumbnailCache.set(url, thumbnailUrl);
            
            return thumbnailUrl;
        })();

        // 타임아웃과 경쟁
        return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
        console.error('썸네일을 가져오는 중 오류가 발생했습니다:', error);
        const fallbackUrl = getRandomFallbackImage();
        thumbnailCache.set(url, fallbackUrl);
        return fallbackUrl;
    }
}

// 데이터를 화면에 표시하는 함수
async function displayData(data) {
    const contentElement = document.getElementById('content');
    contentElement.innerHTML = '';

    const header = data[0];
    const rows = data.slice(1);
    const shuffledRows = shuffleArray([...rows]);

    // 모든 카드를 먼저 생성하고 썸네일은 병렬로 로드
    const cards = shuffledRows.map(row => {
        if (row.length >= 4) {
            const card = document.createElement('div');
            card.className = 'card';
            
            const category = row[0]?.trim() || '분류 없음';
            const title = row[1]?.trim() || '제목 없음';
            const url = row[2]?.trim() || '#';
            const description = row[3]?.trim() || '설명 없음';
            
            // 썸네일 없이 카드 먼저 생성 (로딩 중 이미지도 귀여운 고양이로)
            card.innerHTML = `
                <div class="card-image">
                    <img src="https://http.cat/100" alt="${title}">
                </div>
                <div class="card-content">
                    <h2>${title}</h2>
                    <p><strong>분류:</strong> ${category}</p>
                    <p><strong>URL:</strong> <a href="${url}" target="_blank">${url}</a></p>
                    <p><strong>설명:</strong> ${description}</p>
                </div>
            `;
            
            contentElement.appendChild(card);
            
            // 썸네일 로딩 Promise 반환
            return {
                card,
                thumbnailPromise: fetchThumbnail(url).then(thumbnailUrl => {
                    const img = card.querySelector('img');
                    if (img) {
                        img.src = thumbnailUrl;
                    }
                })
            };
        }
        return null;
    }).filter(Boolean);

    // 모든 썸네일을 병렬로 로드
    await Promise.allSettled(cards.map(card => card.thumbnailPromise));
}

// 페이지 로드 시 데이터 가져오기
async function initialize() {
    const data = await fetchData();
    if (data) {
        await displayData(data);
    }
}

// 5분마다 데이터 업데이트
setInterval(initialize, 5 * 60 * 1000);

// 초기 로드
initialize(); 