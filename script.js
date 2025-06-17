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

        shuffledData = shuffleArray([...rows.slice(1)]); // 섞인 데이터를 전역 변수에 저장
        return rows; // 원본 데이터 (헤더 포함) 반환
    } catch (error) {
        console.error('데이터를 가져오는 중 오류가 발생했습니다:', error);
        return null;
    }
}

// 웹사이트의 썸네일 이미지를 가져오는 함수 (Screenshoter.com API + CORS 프록시 사용)
async function fetchThumbnail(url) {
    // 캐시된 썸네일이 있으면 반환
    if (thumbnailCache.has(url)) {
        return thumbnailCache.get(url);
    }

    try {
        const screenshotApiUrl = `https://screenshoter.com/?uri=${encodeURIComponent(url)}&viewport=1280x1024&type=cropped&size=large`;
        // CORS 문제를 우회하기 위해 프록시 사용
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(screenshotApiUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch screenshot for ${url} via proxy`);
        }
        
        const imageBlob = await response.blob();
        const objectURL = URL.createObjectURL(imageBlob);

        thumbnailCache.set(url, objectURL);
        return objectURL;

    } catch (error) {
        console.error('스크린샷을 가져오는 중 오류가 발생했습니다:', error);
        const fallbackUrl = getRandomFallbackImage();
        thumbnailCache.set(url, fallbackUrl);
        return fallbackUrl;
    }
}

// 데이터를 화면에 표시하는 함수
async function displayData() {
    const sceneElement = document.getElementById('scene');
    if (!sceneElement) return;
    sceneElement.innerHTML = ''; // Clear existing content

    // 월드 크기 정의 (확대)
    const worldWidth = 10000;
    const worldHeight = 10000;
    sceneElement.style.width = `${worldWidth}px`;
    sceneElement.style.height = `${worldHeight}px`;

    const rows = shuffledData; // 전역 변수에 저장된 섞인 데이터 사용 (헤더 없음)

    // 카테고리별 색상 매핑
    const categoryColors = {
        '사회적 비판과 거버넌스': 'rgb(255, 238, 173)', // 노랑
        '기술 윤리와 미래 시나리오': 'rgb(255, 179, 179)', // 빨강
        '디지털 정체성과 문화': 'rgb(179, 226, 179)',   // 초록
        '환경·경제 시스템 탐구': 'rgb(179, 204, 226)', // 파랑
        '실험적 인터페이스와 데이터 경험': 'rgb(255, 204, 179)', // 주황
        '디지털 유산과 역사성': 'rgb(204, 226, 179)',   // 연두
        '분류 없음': 'rgb(220, 220, 220)' // 회색 (기타)
    };

    let allCardThumbnailPromises = [];
    const cardPositions = [];
    const cardSize = 240; // .card의 크기와 동일 (축소)
    const minDistance = cardSize * 2.0; // 카드 간 최소 이격 거리 (증가)

    rows.forEach(row => {
        if (row.length < 4) return;
        
        const card = document.createElement('div');
        card.className = 'card';

        // 겹치지 않는 위치 찾기
        let position;
        let attempts = 0;
        do {
            position = {
                x: Math.random() * (worldWidth - cardSize),
                y: Math.random() * (worldHeight - cardSize)
            };
            attempts++;
        } while (
            cardPositions.some(p => Math.sqrt(Math.pow(p.x - position.x, 2) + Math.pow(p.y - position.y, 2)) < minDistance) &&
            attempts < 100
        );
        
        cardPositions.push(position);
        card.style.left = `${position.x}px`;
        card.style.top = `${position.y}px`;

        const category = row[0]?.trim() || '분류 없음';
        const title = row[1]?.trim() || '제목 없음';
        const url = row[2]?.trim() || '#';
        const description = row[3]?.trim() || '설명 없음';

        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';

        // 카드 앞면 (이미지 + 카테고리 배경색)
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        // 카테고리별 배경색 적용
        cardFront.style.backgroundColor = categoryColors[category] || categoryColors['분류 없음'];
        cardFront.innerHTML = `
            <div class="card-image">
                <img src="https://http.cat/100" alt="${title}">
            </div>
        `;

        // 카드 뒷면 (콘텐츠)
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        // 내용 수정: URL은 "WEBSITE LINK" 텍스트로 대체, 설명은 전체 표시
        cardBack.innerHTML = `
            <div class="card-content">
                <h2>${title}</h2>
                <p class="card-category-value">${category}</p>
                <p class="card-url-value"><a href="${url}" target="_blank" rel="noopener noreferrer">WEBSITE LINK</a></p>
                <p class="card-description-value">${description}</p> 
            </div>
        `;

        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        card.appendChild(cardInner);
        sceneElement.appendChild(card);
        
        allCardThumbnailPromises.push(
            fetchThumbnail(url).then(thumbnailUrl => {
                const img = card.querySelector('.card-front .card-image img');
                if (img) {
                    img.src = thumbnailUrl;
                }
            })
        );
    });

    // 모든 썸네일을 병렬로 로드
    await Promise.allSettled(allCardThumbnailPromises);

    // Panzoom 초기화
    const panzoom = Panzoom(sceneElement, {
        canvas: true,
        contain: 'outside',
        minScale: 0.3,
        maxScale: 1.5
    });

    const parent = sceneElement.parentElement;
    parent.addEventListener('wheel', panzoom.zoomWithWheel);

    // Grab 커서 상태 변경
    parent.addEventListener('mousedown', () => parent.style.cursor = 'grabbing');
    parent.addEventListener('mouseup', () => parent.style.cursor = 'grab');
    parent.addEventListener('mouseleave', () => parent.style.cursor = 'grab');
}

// 생성형 Iframe을 만드는 함수 (유기적 애니메이션으로 변경)
function initOrganicIframeAnimation() {
    const viewport = document.querySelector('.iframe-viewport');
    const container = document.querySelector('.iframe-container');
    if (!container || !viewport) return;

    // p5.js 인스턴스가 로드되었는지 확인
    if (typeof interactiveView === 'undefined' || !interactiveView.p5) {
        console.warn("p5.js instance not ready for iframe animation. Retrying in 100ms.");
        setTimeout(initOrganicIframeAnimation, 100);
        return;
    }

    const p5 = interactiveView.p5;
    const websites = shuffledData.slice(0, 12); // 개수 조정 (12개)
    if (websites.length === 0) return;

    container.innerHTML = ''; // 기존 콘텐츠 초기화

    const particles = [];
    const viewportWidth = viewport.offsetWidth;
    const viewportHeight = viewport.offsetHeight;

    class IframeParticle {
        constructor(url, index) {
            this.url = url;
            this.width = p5.random(150, 350);
            this.height = this.width * 0.75;
            this.x = p5.random(viewportWidth);
            this.y = p5.random(viewportHeight);
            
            this.z = p5.random(0.5, 1.5); // 깊이감 (크기, 속도 조절)
            this.element = this.createDOMElement();

            // 노이즈 오프셋: 각 파티클이 다르게 움직이도록
            this.noiseOffsetX = p5.random(1000);
            this.noiseOffsetY = p5.random(1000);
            this.noiseOffsetZ = p5.random(1000); // 크기 변경용
        }

        createDOMElement() {
            const wrapper = document.createElement('div');
            wrapper.className = 'dynamic-iframe-wrapper';
            
            const iframe = document.createElement('iframe');
            iframe.src = this.url;
            iframe.scrolling = 'no';
            iframe.loading = 'lazy';
            iframe.sandbox = 'allow-scripts allow-same-origin';

            wrapper.appendChild(iframe);
            container.appendChild(wrapper);
            return wrapper;
        }

        update() {
            const time = p5.millis() * 0.0001;
            
            // Perlin 노이즈를 사용하여 속도 결정
            const angle = p5.noise(this.noiseOffsetX + time, this.noiseOffsetY + time) * p5.TWO_PI * 4;
            const speed = p5.map(this.z, 0.5, 1.5, 0.1, 0.5);
            
            this.x += Math.cos(angle) * speed;
            this.y += Math.sin(angle) * speed;

            // 크기를 노이즈로 부드럽게 변경
            const sizeNoise = p5.noise(this.noiseOffsetZ + time);
            this.currentScale = p5.map(sizeNoise, 0.2, 0.8, 0.8, 1.2) * this.z;
            this.currentWidth = this.width * this.currentScale;
            this.currentHeight = this.height * this.currentScale;

            // 화면 경계 처리 (wrap around)
            if (this.x > viewportWidth + this.currentWidth / 2) this.x = -this.currentWidth / 2;
            if (this.x < -this.currentWidth / 2) this.x = viewportWidth + this.currentWidth / 2;
            if (this.y > viewportHeight + this.currentHeight / 2) this.y = -this.currentHeight / 2;
            if (this.y < -this.currentHeight / 2) this.y = viewportHeight + this.currentHeight / 2;
        }

        render() {
            this.element.style.width = `${this.currentWidth}px`;
            this.element.style.height = `${this.currentHeight}px`;
            this.element.style.zIndex = Math.floor(this.z * 10);
            this.element.style.transform = `translate(${this.x - this.currentWidth / 2}px, ${this.y - this.currentHeight / 2}px)`;
        }
    }

    websites.forEach((site, index) => {
        const url = site[2]?.trim();
        if (url && url !== '#') {
            particles.push(new IframeParticle(url, index));
        }
    });

    function animate() {
        p5.background(0, 5); // 희미한 잔상 효과
        
        particles.forEach(p => {
            p.update();
            p.render();
        });
        
        requestAnimationFrame(animate);
    }

    animate();
}

// 페이지 로드 시 데이터 가져오기 및 원형 텍스트 적용
document.addEventListener('DOMContentLoaded', () => {
    async function initialize() {
        // 초기 데이터 로드
        await fetchData();
    
        // 데이터 표시 및 panzoom 초기화
        await displayData();
        
        // 인터랙티브 뷰 시작
        if (typeof startInteractiveView === 'function') {
            startInteractiveView(shuffledData);
        }

        // 생성형 Iframe 애니메이션 초기화
        // initOrganicIframeAnimation(); // 이 함수는 현재 사용되지 않는 것으로 보입니다.
    }

    // 초기화 함수 호출
    initialize();

    // 제보 폼 관련 로직
    const submissionSection = document.getElementById('submission-section');
    if (submissionSection) {
        let formVisible = false;

        const showSubmissionForm = () => {
            if (formVisible) return;
            const buffer = 200; 
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - buffer) {
                submissionSection.classList.add('visible');
                formVisible = true;
                window.removeEventListener('scroll', showSubmissionForm);
            }
        };

        window.addEventListener('scroll', showSubmissionForm);
        showSubmissionForm(); // 초기 로드 시에도 체크

        const form = document.getElementById('submission-form');
        const formResponseEl = document.getElementById('form-response');
        const submitButton = form.querySelector('button[type="submit"]');

        const appsScriptURL = 'https://script.google.com/macros/s/AKfycbwLe2TlpU_cjFTF0S5ACFjaIWx-0OZobCq_V6Bsd-qEBxvBulUjQRDURkO_oVOT3jd0/exec'; 

        form.addEventListener('submit', e => {
            e.preventDefault();
            
            submitButton.disabled = true;
            formResponseEl.textContent = '제출하는 중...';
            formResponseEl.style.color = '#aaa';

            fetch(appsScriptURL, { method: 'POST', body: new FormData(form) })
                .then(response => response.json())
                .then(data => {
                    if (data.result === 'success') {
                        form.reset();
                        formResponseEl.textContent = '제보해주셔서 감사합니다!';
                        formResponseEl.style.color = '#4CAF50';
                    } else {
                        throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
                    }
                })
                .catch(error => {
                    console.error('Error!', error);
                    formResponseEl.textContent = `오류가 발생했습니다: ${error.message}`;
                    formResponseEl.style.color = '#F44336';
                })
                .finally(() => {
                    submitButton.disabled = false;
                });
        });
    }
});

function applyCircularText(elementId, radius, letterSpacingDegrees, startAngleOffsetDegrees) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Element with ID " + elementId + " not found for circular text.");
        return;
    }

    const text = element.innerText;
    if (!text || text.trim() === '') {
        // console.warn("Text content is empty for element ID: " + elementId);
        // return; // 텍스트가 없으면 실행 중단 (필요시 주석 해제)
    }
    element.innerHTML = ''; // 기존 텍스트 지우기
    element.style.position = 'relative'; 
    element.style.display = 'inline-block'; 
    // 크기 설정은 요소의 내용과 폰트 크기에 따라 유동적일 수 있으므로, 
    // CSS에서 .cover-block .mono 에 이미 스타일이 있다면 여기서 고정 크기 설정은 주의
    // element.style.width = (radius * 2.5) + 'px'; 
    // element.style.height = (radius * 2.5) + 'px'; 
    element.style.textAlign = 'center';

    const characters = text.split('');
    const totalChars = characters.length;
    const angleStep = letterSpacingDegrees; 

    characters.forEach((char, index) => {
        const charSpan = document.createElement('span');
        charSpan.innerText = char;
        
        const angleDegrees = startAngleOffsetDegrees + (index * angleStep);
        const angleRadians = angleDegrees * (Math.PI / 180);

        const x = radius * Math.cos(angleRadians);
        const y = radius * Math.sin(angleRadians);

        charSpan.style.position = 'absolute';
        charSpan.style.left = '50%'; 
        charSpan.style.top = '50%';  
        charSpan.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angleDegrees + 90}deg)`; 
        
        element.appendChild(charSpan);
    });
}

let shuffledData = []; // interactive.js에 전달할 데이터를 저장할 변수 

// 흔들기 버튼 이벤트 리스너
const shakeButton = document.getElementById('shake-button');
if (shakeButton) {
    shakeButton.addEventListener('click', () => {
        // 모든 카드를 선택하여 흔들기 클래스 추가
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.classList.add('shake');
            // 애니메이션이 끝난 후 클래스 제거
            card.addEventListener('animationend', () => {
                card.classList.remove('shake');
            }, { once: true });
        });

        // 카드 위치 재배치
        displayData();
    });
} 