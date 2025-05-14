function updateClock() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // YYYY.MM.DD.HH:MM:SS 형식으로 포맷팅
    const formattedTime = `${year}.${month}.${day}.${hours}:${minutes}:${seconds}`;
    
    // clock 클래스를 가진 요소를 찾아 시간을 업데이트
    const clockElement = document.querySelector('.clock');
    if (clockElement) {
        clockElement.textContent = formattedTime;
    }
}

// 페이지 로드 시에만 시간 업데이트
updateClock(); 