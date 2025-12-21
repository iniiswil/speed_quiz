// 멤버 데이터 (members 폴더의 사진 기반)
const members = [
    { name: '도윤', photo: 'members/도윤.png' },
    { name: '이안', photo: 'members/이안.png' },
    { name: '재윤', photo: 'members/재윤.png' },
    { name: '성현', photo: 'members/성현.png' },
    { name: '연서', photo: 'members/연서.png' }
];

// 게임 상태 관리
const gameState = {
    // 참가자 소개
    introIndex: 0,

    // 총점수 (세션 간 유지)
    totalScores: {},

    // 스피드 퀴즈 관련
    speedTimer: 60,
    currentTimer: 60,
    timerInterval: null,
    isGameRunning: false,
    isPaused: false,
    isPenalty: false,
    penaltyTimeout: null,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    questions: [],
    currentQuestionIndex: 0,
    teamMatches: [],
    currentTeamIndex: 0,
    sessionScores: {},
    revealIndex: 0,

    // 연상 퀴즈 관련 (단순 이미지)
    catchmindCount: 10,
    catchmindImages: [],
    catchmindIndex: 0,
    catchmindScores: {},

    // 사진 퀴즈 관련 (3단계 힌트 시스템)
    photoSets: [],            // [{baseName: '사진', images: ['사진_1.png', '사진_2.png', '사진_3.png']}, ...]
    photoIndex: 0,            // 현재 문제 세트 인덱스
    photoHintLevel: 1,        // 현재 힌트 레벨 (1, 2, 3)
    photoScores: {},

    // 노래 퀴즈 관련
    songs: [],                // [{path: 'songs/xxx.mp3', title: 'xxx'}, ...]
    songIndex: 0,
    songScores: {},
    songAudio: null,          // Audio 객체
    songElapsed: 0,           // 경과 시간 (초)
    songTimerInterval: null,  // 경과 시간 타이머
    songIsPlaying: false      // 재생 중 여부
};

// 문제 파일에서 읽어온 데이터 저장
let loadedQuestions = {
    speed: [],
    body: []
};

// === 초기화 ===
document.addEventListener('DOMContentLoaded', () => {
    // 총점수 초기화
    members.forEach(m => {
        gameState.totalScores[m.name] = 0;
    });
});

// === 유틸리티 함수 ===
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getMemberPhoto(name) {
    const member = members.find(m => m.name === name);
    return member ? member.photo : null;
}

// === 참가자 소개 ===
function startIntroduction() {
    gameState.introIndex = 0;
    document.getElementById('intro-total').textContent = members.length;
    showIntroduction();
    showScreen('intro-screen');
}

function showIntroduction() {
    const member = members[gameState.introIndex];
    document.getElementById('intro-current').textContent = gameState.introIndex + 1;
    document.getElementById('intro-photo').src = member.photo;
    document.getElementById('intro-name').textContent = member.name;

    const card = document.getElementById('intro-card');
    card.style.animation = 'none';
    setTimeout(() => {
        card.style.animation = 'introCardPop 0.6s ease';
    }, 10);

    const isLast = gameState.introIndex >= members.length - 1;
    document.getElementById('intro-btn-text').textContent = isLast ? '게임 시작!' : '다음 참가자!';
}

function nextIntroduction() {
    gameState.introIndex++;
    if (gameState.introIndex >= members.length) {
        goToMainHub();
    } else {
        showIntroduction();
    }
}

// === 메인 허브 ===
function goToMainHub() {
    updateTotalScoreboard();
    showScreen('main-hub-screen');
}

// 동점자 처리된 순위 계산
function calculateRanks(sortedPlayers) {
    const ranks = [];
    let currentRank = 1;

    sortedPlayers.forEach(([name, score], index) => {
        if (index > 0 && score < sortedPlayers[index - 1][1]) {
            // 점수가 이전보다 낮으면 현재 인덱스 + 1이 순위
            currentRank = index + 1;
        }
        ranks.push({ name, score, rank: currentRank });
    });

    return ranks;
}

// 순위에 따른 메달 반환
function getMedalForRank(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
}

function updateTotalScoreboard() {
    const container = document.getElementById('total-scoreboard-list');
    container.innerHTML = '';

    const sortedPlayers = Object.entries(gameState.totalScores)
        .sort((a, b) => b[1] - a[1]);

    const rankedPlayers = calculateRanks(sortedPlayers);

    rankedPlayers.forEach(({ name, score, rank }) => {
        const item = document.createElement('div');
        item.className = 'score-item clickable';
        const medal = getMedalForRank(rank);
        const photo = getMemberPhoto(name);
        const photoHtml = photo ? `<img src="${photo}" class="scoreboard-photo">` : '';
        item.innerHTML = `
            <span class="score-name">${medal} ${photoHtml}<span class="name-text">${name}</span></span>
            <span class="score-value">${score}점</span>
        `;
        item.onclick = () => showScoreEdit(name, score, 'total');
        container.appendChild(item);
    });
}

function resetTotalScores() {
    if (confirm('정말 총점수를 초기화할까요?')) {
        members.forEach(m => {
            gameState.totalScores[m.name] = 0;
        });
        updateTotalScoreboard();
    }
}

// === 점수 수정 ===
let editingPlayer = null;
let editingScoreType = 'total';

function showScoreEdit(playerName, currentScore, scoreType) {
    editingPlayer = playerName;
    editingScoreType = scoreType;
    document.getElementById('edit-player-name').textContent = playerName;
    document.getElementById('score-edit-input').value = currentScore;
    document.getElementById('score-edit-modal').classList.add('active');
}

function hideScoreEdit() {
    document.getElementById('score-edit-modal').classList.remove('active');
    editingPlayer = null;
}

function adjustScore(delta) {
    const input = document.getElementById('score-edit-input');
    let newValue = parseInt(input.value) + delta;
    if (newValue < 0) newValue = 0;
    if (newValue > 9999) newValue = 9999;
    input.value = newValue;
}

function saveScore() {
    if (editingPlayer) {
        const newScore = parseInt(document.getElementById('score-edit-input').value) || 0;
        const finalScore = Math.max(0, Math.min(9999, newScore));

        if (editingScoreType === 'total') {
            gameState.totalScores[editingPlayer] = finalScore;
            updateTotalScoreboard();
        } else if (editingScoreType === 'session') {
            gameState.sessionScores[editingPlayer] = finalScore;
            updateSessionScoreboard();
        }
    }
    hideScoreEdit();
}

// === 스피드 퀴즈 ===
function showSpeedQuizSetup() {
    showScreen('speed-setup-screen');
}

function setSpeedTimer(seconds) {
    gameState.speedTimer = seconds;
    document.querySelectorAll('#speed-setup-screen .timer-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(seconds)) {
            btn.classList.add('active');
        }
    });
}

// 문제 파일 로드
async function loadQuestionsFromFiles() {
    loadedQuestions.speed = [];
    loadedQuestions.body = [];

    const questionFiles = [
        { file: 'questions/speed-food.csv', type: 'speed', category: 'food' },
        { file: 'questions/speed-fun.csv', type: 'speed', category: 'fun-words' },
        { file: 'questions/body-actions.csv', type: 'body', category: 'actions' },
        { file: 'questions/body-animals.csv', type: 'body', category: 'animals' },
        { file: 'questions/body-jobs.csv', type: 'body', category: 'jobs' },
        { file: 'questions/body-proverbs.csv', type: 'body', category: 'proverbs' },
        { file: 'questions/body-sports.csv', type: 'body', category: 'sports' }
    ];

    for (const qf of questionFiles) {
        try {
            const response = await fetch(qf.file);
            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'));

                lines.forEach(line => {
                    if (qf.type === 'speed') {
                        loadedQuestions.speed.push({
                            text: line,
                            type: 'speed',
                            category: qf.category
                        });
                    } else {
                        loadedQuestions.body.push({
                            text: line,
                            type: 'body',
                            category: qf.category
                        });
                    }
                });
            }
        } catch (e) {
            console.log('Failed to load:', qf.file);
        }
    }
}

// 조 추첨 시작
async function startSpeedQuizTeamDraw() {
    // 문제 로드
    await loadQuestionsFromFiles();

    // 세션 점수 초기화
    gameState.sessionScores = {};
    members.forEach(m => {
        gameState.sessionScores[m.name] = 0;
    });

    // 조 편성
    const players = members.map(m => m.name);
    const shuffledPlayers = shuffleArray(players);
    gameState.teamMatches = [];

    for (let i = 0; i < shuffledPlayers.length; i++) {
        gameState.teamMatches.push({
            presenter: shuffledPlayers[i],
            guesser: shuffledPlayers[(i + 1) % shuffledPlayers.length]
        });
    }
    gameState.teamMatches = shuffleArray(gameState.teamMatches);

    gameState.currentTeamIndex = 0;
    gameState.revealIndex = 0;

    showTeamDraw();
}

function showTeamDraw() {
    const match = gameState.teamMatches[gameState.revealIndex];

    document.getElementById('reveal-team-number').textContent = gameState.revealIndex + 1;

    const presenterPhoto = getMemberPhoto(match.presenter);
    const guesserPhoto = getMemberPhoto(match.guesser);

    document.getElementById('reveal-presenter').innerHTML = presenterPhoto
        ? `<img src="${presenterPhoto}" class="reveal-photo"><span>${match.presenter}</span>`
        : match.presenter;
    document.getElementById('reveal-guesser').innerHTML = guesserPhoto
        ? `<img src="${guesserPhoto}" class="reveal-photo"><span>${match.guesser}</span>`
        : match.guesser;

    document.getElementById('reveal-current').textContent = gameState.revealIndex + 1;
    document.getElementById('reveal-total').textContent = gameState.teamMatches.length;

    const card = document.getElementById('reveal-card');
    card.style.animation = 'none';
    setTimeout(() => {
        card.style.animation = 'revealPop 0.5s ease';
    }, 10);

    const isLast = gameState.revealIndex >= gameState.teamMatches.length - 1;
    document.getElementById('reveal-btn-text').textContent = isLast ? '게임 시작!' : '다음 조 공개!';

    showScreen('team-draw-screen');
}

function revealNextTeam() {
    gameState.revealIndex++;
    if (gameState.revealIndex >= gameState.teamMatches.length) {
        showSpeedHub();
    } else {
        showTeamDraw();
    }
}

// 스피드 퀴즈 허브
function showSpeedHub() {
    updateSpeedTeamsList();
    updateSessionScoreboard();
    updateCurrentSpeedTeamDisplay();
    showScreen('speed-hub-screen');
}

function updateSpeedTeamsList() {
    const container = document.getElementById('speed-teams-list');
    container.innerHTML = '';

    gameState.teamMatches.forEach((match, index) => {
        const chip = document.createElement('div');
        chip.className = 'hub-team-chip' + (index === gameState.currentTeamIndex ? ' active' : '');
        const presenterPhoto = getMemberPhoto(match.presenter);
        const guesserPhoto = getMemberPhoto(match.guesser);
        chip.innerHTML = `
            <span class="chip-number">${index + 1}</span>
            <span class="chip-names">
                ${presenterPhoto ? `<img src="${presenterPhoto}" class="chip-photo">` : ''}
                <span class="chip-name">${match.presenter}</span>
                <span class="chip-arrow">→</span>
                ${guesserPhoto ? `<img src="${guesserPhoto}" class="chip-photo">` : ''}
                <span class="chip-name">${match.guesser}</span>
            </span>
        `;
        chip.onclick = () => {
            gameState.currentTeamIndex = index;
            updateSpeedTeamsList();
            updateCurrentSpeedTeamDisplay();
        };
        container.appendChild(chip);
    });
}

function updateSessionScoreboard() {
    const container = document.getElementById('session-scoreboard-list');
    container.innerHTML = '';

    const sortedPlayers = Object.entries(gameState.sessionScores)
        .sort((a, b) => b[1] - a[1]);

    const rankedPlayers = calculateRanks(sortedPlayers);

    rankedPlayers.forEach(({ name, score, rank }) => {
        const item = document.createElement('div');
        item.className = 'score-item clickable';
        const medal = getMedalForRank(rank);
        const photo = getMemberPhoto(name);
        const photoHtml = photo ? `<img src="${photo}" class="scoreboard-photo">` : '';
        item.innerHTML = `
            <span class="score-name">${medal} ${photoHtml}<span class="name-text">${name}</span></span>
            <span class="score-value">${score}점</span>
        `;
        item.onclick = () => showScoreEdit(name, score, 'session');
        container.appendChild(item);
    });
}

function updateCurrentSpeedTeamDisplay() {
    const match = gameState.teamMatches[gameState.currentTeamIndex];
    document.getElementById('speed-team-number').textContent = gameState.currentTeamIndex + 1;

    const presenterPhoto = getMemberPhoto(match.presenter);
    const guesserPhoto = getMemberPhoto(match.guesser);

    document.getElementById('speed-presenter').innerHTML = presenterPhoto
        ? `<img src="${presenterPhoto}" class="hub-team-photo">${match.presenter}`
        : match.presenter;
    document.getElementById('speed-guesser').innerHTML = guesserPhoto
        ? `<img src="${guesserPhoto}" class="hub-team-photo">${match.guesser}`
        : match.guesser;
}

function prevSpeedTeam() {
    gameState.currentTeamIndex = (gameState.currentTeamIndex - 1 + gameState.teamMatches.length) % gameState.teamMatches.length;
    updateSpeedTeamsList();
    updateCurrentSpeedTeamDisplay();
}

function nextSpeedTeam() {
    gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teamMatches.length;
    updateSpeedTeamsList();
    updateCurrentSpeedTeamDisplay();
}

// 스피드 퀴즈 라운드 시작
function startSpeedRound() {
    gameState.score = 0;
    gameState.correctCount = 0;
    gameState.wrongCount = 0;
    gameState.currentQuestionIndex = 0;
    gameState.currentTimer = gameState.speedTimer;
    gameState.isPaused = false;
    gameState.isPenalty = false;

    // 문제 섞기 (speed와 body 섞어서)
    const allQuestions = [...loadedQuestions.speed, ...loadedQuestions.body];
    gameState.questions = shuffleArray(allQuestions);

    const match = gameState.teamMatches[gameState.currentTeamIndex];

    const presenterPhoto = getMemberPhoto(match.presenter);
    const guesserPhoto = getMemberPhoto(match.guesser);

    document.getElementById('game-team-number').textContent = gameState.currentTeamIndex + 1;
    document.getElementById('game-presenter').innerHTML = presenterPhoto
        ? `<img src="${presenterPhoto}" class="game-team-photo">${match.presenter}`
        : match.presenter;
    document.getElementById('game-guesser').innerHTML = guesserPhoto
        ? `<img src="${guesserPhoto}" class="game-team-photo">${match.guesser}`
        : match.guesser;

    document.getElementById('score').textContent = 0;
    setButtonsDisabled(false);

    showScreen('speed-game-screen');
    showNextQuestion();
    startTimer();
}

// 문제별 점수 계산
function getQuestionPoints(question) {
    if (question.type === 'body') {
        if (question.category === 'proverbs') {
            return 30;
        }
        return 20;
    }
    return 10;
}

// 카테고리 한글명
function getCategoryName(category) {
    const names = {
        'fun-words': '재미있는 말',
        'proverbs': '속담',
        'food': '음식',
        'cartoon': '만화/캐릭터',
        'animals': '동물',
        'sports': '스포츠',
        'jobs': '직업',
        'ramen': '라면',
        'actions': '행동'
    };
    return names[category] || category;
}

// 문제 타입 표시 업데이트
function updateQuestionTypeIndicator(question) {
    const speedIndicator = document.getElementById('speed-mode-indicator');
    const bodyIndicator = document.getElementById('body-mode-indicator');
    const gameScreen = document.getElementById('speed-game-screen');
    const points = getQuestionPoints(question);
    const categoryName = getCategoryName(question.category);

    if (question.type === 'body') {
        speedIndicator.style.display = 'none';
        bodyIndicator.style.display = 'block';
        gameScreen.classList.add('body-mode-active');

        document.getElementById('body-mode-category').textContent = `[ ${categoryName} ]`;

        if (question.category === 'proverbs') {
            document.getElementById('body-mode-points').textContent = `🔥 ${points}점 🔥`;
            document.getElementById('body-mode-points').classList.add('bonus');
        } else {
            document.getElementById('body-mode-points').textContent = `${points}점`;
            document.getElementById('body-mode-points').classList.remove('bonus');
        }
    } else {
        speedIndicator.style.display = 'block';
        bodyIndicator.style.display = 'none';
        gameScreen.classList.remove('body-mode-active');
        document.getElementById('speed-mode-points').textContent = `${points}점`;
    }
}

function showNextQuestion() {
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        gameState.questions = shuffleArray(gameState.questions);
        gameState.currentQuestionIndex = 0;
    }

    const question = gameState.questions[gameState.currentQuestionIndex];
    const card = document.getElementById('question-card');
    const textEl = document.getElementById('question-text');

    updateQuestionTypeIndicator(question);

    card.style.animation = 'none';
    setTimeout(() => {
        card.style.animation = 'cardBounce 0.3s ease';
    }, 10);

    textEl.textContent = question.text;
}

function startTimer() {
    gameState.isGameRunning = true;
    gameState.isPaused = false;
    updateTimerDisplay();

    gameState.timerInterval = setInterval(() => {
        if (!gameState.isPenalty) {
            gameState.currentTimer--;
            updateTimerDisplay();

            if (gameState.currentTimer <= 10) {
                document.querySelector('.timer-circle').classList.add('timer-warning');
            }

            if (gameState.currentTimer <= 0) {
                endSpeedRound();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = gameState.currentTimer;
}

function stopGame() {
    gameState.isGameRunning = false;
    gameState.isPaused = false;
    gameState.isPenalty = false;
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    if (gameState.penaltyTimeout) {
        clearTimeout(gameState.penaltyTimeout);
        gameState.penaltyTimeout = null;
    }
    document.querySelector('.timer-circle')?.classList.remove('timer-warning');
    document.getElementById('penalty-overlay')?.classList.remove('active');
}

function setButtonsDisabled(disabled) {
    const passBtn = document.getElementById('pass-btn');
    const correctBtn = document.getElementById('correct-btn');
    if (disabled) {
        passBtn.classList.add('disabled');
        correctBtn.classList.add('disabled');
    } else {
        passBtn.classList.remove('disabled');
        correctBtn.classList.remove('disabled');
    }
}

function markCorrect() {
    if (!gameState.isGameRunning || gameState.isPaused || gameState.isPenalty) return;

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const points = getQuestionPoints(currentQuestion);

    gameState.score += points;
    gameState.correctCount++;
    document.getElementById('score').textContent = gameState.score;

    gameState.currentQuestionIndex++;
    showNextQuestion();
    showEffect('correct');
}

function markWrong() {
    if (!gameState.isGameRunning || gameState.isPaused || gameState.isPenalty) return;

    gameState.wrongCount++;
    gameState.isPenalty = true;

    setButtonsDisabled(true);

    const overlay = document.getElementById('penalty-overlay');
    const countdown = document.getElementById('penalty-countdown');
    overlay.classList.add('active');

    let count = 3;
    countdown.textContent = count;

    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdown.textContent = count;
        }
    }, 1000);

    gameState.penaltyTimeout = setTimeout(() => {
        clearInterval(countInterval);
        overlay.classList.remove('active');
        gameState.isPenalty = false;
        setButtonsDisabled(false);

        gameState.currentQuestionIndex++;
        showNextQuestion();
    }, 3000);
}

function showEffect(type) {
    const card = document.getElementById('question-card');
    card.style.borderColor = type === 'correct' ? '#38ef7d' : '#ff6b6b';
    setTimeout(() => {
        card.style.borderColor = 'transparent';
    }, 200);
}

function endSpeedRound() {
    stopGame();

    const match = gameState.teamMatches[gameState.currentTeamIndex];

    // 세션 점수 추가
    gameState.sessionScores[match.presenter] = (gameState.sessionScores[match.presenter] || 0) + gameState.score;
    gameState.sessionScores[match.guesser] = (gameState.sessionScores[match.guesser] || 0) + gameState.score;

    // 총점수 추가
    gameState.totalScores[match.presenter] = (gameState.totalScores[match.presenter] || 0) + gameState.score;
    gameState.totalScores[match.guesser] = (gameState.totalScores[match.guesser] || 0) + gameState.score;

    document.getElementById('round-team-number').textContent = gameState.currentTeamIndex + 1;

    const presenterPhoto = getMemberPhoto(match.presenter);
    const guesserPhoto = getMemberPhoto(match.guesser);

    document.getElementById('round-presenter').innerHTML = presenterPhoto
        ? `<img src="${presenterPhoto}" class="round-result-photo">${match.presenter}`
        : match.presenter;
    document.getElementById('round-guesser').innerHTML = guesserPhoto
        ? `<img src="${guesserPhoto}" class="round-result-photo">${match.guesser}`
        : match.guesser;

    document.getElementById('round-score').textContent = gameState.score;
    document.getElementById('round-correct').textContent = gameState.correctCount;
    document.getElementById('round-wrong').textContent = gameState.wrongCount;

    showScreen('round-result-screen');
    showConfetti();
}

function backToSpeedHub() {
    gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teamMatches.length;
    showSpeedHub();
}

function endSpeedQuizSession() {
    // 세션 결과 표시
    const container = document.getElementById('session-rankings');
    container.innerHTML = '';

    const sortedPlayers = Object.entries(gameState.sessionScores)
        .sort((a, b) => b[1] - a[1]);

    const rankedPlayers = calculateRanks(sortedPlayers);

    rankedPlayers.forEach(({ name, score, rank }) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        const medal = getMedalForRank(rank);
        const rankText = medal || `${rank}위`;
        const photo = getMemberPhoto(name);
        const photoHtml = photo ? `<img src="${photo}" class="ranking-photo">` : '';
        item.innerHTML = `
            <span class="ranking-position">${rankText}</span>
            ${photoHtml}
            <span class="ranking-name">${name}</span>
            <span class="ranking-score">${score}점</span>
        `;
        container.appendChild(item);
    });

    showScreen('session-result-screen');
    showConfetti();
}

// === 나가기 확인 ===
function showExitConfirm() {
    pauseGame();
    document.getElementById('exit-modal').classList.add('active');
}

function hideExitConfirm() {
    document.getElementById('exit-modal').classList.remove('active');
    resumeGame();
}

function confirmExit() {
    document.getElementById('exit-modal').classList.remove('active');
    stopGame();
    showSpeedHub();
}

function pauseGame() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    gameState.isPaused = true;
}

function resumeGame() {
    if (gameState.isPaused && gameState.isGameRunning && !gameState.isPenalty) {
        gameState.isPaused = false;
        gameState.timerInterval = setInterval(() => {
            gameState.currentTimer--;
            updateTimerDisplay();

            if (gameState.currentTimer <= 10) {
                document.querySelector('.timer-circle').classList.add('timer-warning');
            }

            if (gameState.currentTimer <= 0) {
                endSpeedRound();
            }
        }, 1000);
    }
}

// === 그림 연상 퀴즈 ===
function showCatchmindSetup() {
    showScreen('catchmind-setup-screen');
}

function changeCatchmindCount(delta) {
    gameState.catchmindCount = Math.max(1, Math.min(50, gameState.catchmindCount + delta));
    document.getElementById('catchmind-count').textContent = gameState.catchmindCount;
}

async function loadCatchmindImages() {
    gameState.catchmindImages = [];

    try {
        const response = await fetch('catchmind/');
        if (response.ok) {
            const text = await response.text();
            const matches = text.match(/href="([^"]+\.(png|jpg|jpeg|gif|webp))"/gi);
            if (matches) {
                matches.forEach(match => {
                    const filename = match.match(/href="([^"]+)"/)[1];
                    gameState.catchmindImages.push('catchmind/' + filename);
                });
            }
        }
    } catch (e) {
        console.log('catchmind 폴더 로드 실패');
    }

    return gameState.catchmindImages;
}

async function startCatchmind() {
    await loadCatchmindImages();

    if (gameState.catchmindImages.length === 0) {
        alert('catchmind 폴더에 이미지가 없습니다!');
        return;
    }

    gameState.catchmindScores = {};
    members.forEach(m => {
        gameState.catchmindScores[m.name] = 0;
    });

    gameState.catchmindImages = shuffleArray(gameState.catchmindImages);
    gameState.catchmindIndex = 0;

    const total = Math.min(gameState.catchmindCount, gameState.catchmindImages.length);
    document.getElementById('catchmind-total').textContent = total;

    createCatchmindButtons();
    showCatchmindQuestion();
    showScreen('catchmind-game-screen');
}

function createCatchmindButtons() {
    const container = document.getElementById('catchmind-buttons');
    container.innerHTML = '';

    members.forEach(member => {
        const btn = document.createElement('button');
        btn.className = 'participant-btn';
        const photo = getMemberPhoto(member.name);
        btn.innerHTML = `
            ${photo ? `<img src="${photo}" class="participant-photo">` : ''}
            <span>${member.name}</span>
        `;
        btn.onclick = () => catchmindCorrect(member.name);
        container.appendChild(btn);
    });
}

// 파일명에서 점수 추출 (기본 10점, _20이면 20점, _30이면 30점) - 그림 연상퀴즈용
function getImagePoints(imagePath) {
    const filename = imagePath.split('/').pop().split('.')[0];
    if (filename.endsWith('_30')) return 30;
    if (filename.endsWith('_20')) return 20;
    return 10;
}

// 힌트 레벨에 따른 점수 (1=30점, 2=20점, 3=10점) - 사진퀴즈용
function getPhotoPoints(hintLevel) {
    if (hintLevel === 1) return 30;
    if (hintLevel === 2) return 20;
    return 10;
}

function showCatchmindQuestion() {
    const total = Math.min(gameState.catchmindCount, gameState.catchmindImages.length);

    if (gameState.catchmindIndex >= total) {
        endCatchmind();
        return;
    }

    const currentImage = gameState.catchmindImages[gameState.catchmindIndex];
    const points = getImagePoints(currentImage);

    document.getElementById('catchmind-current').textContent = gameState.catchmindIndex + 1;
    document.getElementById('catchmind-image').src = currentImage;

    // 점수 표시 업데이트
    const pointsEl = document.getElementById('catchmind-points');
    const container = document.getElementById('catchmind-image-container');

    if (points >= 30) {
        pointsEl.innerHTML = `🔥 ${points}점 🔥`;
        pointsEl.className = 'quiz-points bonus-30';
        container.className = 'catchmind-image-container bonus-container-30';
    } else if (points >= 20) {
        pointsEl.innerHTML = `⭐ ${points}점 ⭐`;
        pointsEl.className = 'quiz-points bonus-20';
        container.className = 'catchmind-image-container bonus-container-20';
    } else {
        pointsEl.textContent = `${points}점`;
        pointsEl.className = 'quiz-points';
        container.className = 'catchmind-image-container';
    }
}

function catchmindCorrect(playerName) {
    const currentImage = gameState.catchmindImages[gameState.catchmindIndex];
    const points = getImagePoints(currentImage);

    gameState.catchmindScores[playerName] += points;
    gameState.totalScores[playerName] += points;

    gameState.catchmindIndex++;
    showCatchmindQuestion();
}

function passCatchmind() {
    gameState.catchmindIndex++;
    showCatchmindQuestion();
}

function endCatchmind() {
    showQuizResult('그림 연상퀴즈 종료! 🎨', gameState.catchmindScores);
}

// === 사진 퀴즈 (3단계 힌트 시스템) ===
function showPhotoQuizSetup() {
    showScreen('photo-setup-screen');
}

async function loadPhotoImages() {
    gameState.photoSets = [];
    const allImages = [];

    try {
        const response = await fetch('pictures/');
        if (response.ok) {
            const text = await response.text();
            const matches = text.match(/href="([^"]+\.(png|jpg|jpeg|gif|webp))"/gi);
            if (matches) {
                matches.forEach(match => {
                    const filename = match.match(/href="([^"]+)"/)[1];
                    allImages.push(filename);
                });
            }
        }
    } catch (e) {
        console.log('pictures 폴더 로드 실패');
    }

    // 이미지들을 세트로 그룹화 (파일명_1, 파일명_2, 파일명_3)
    const imageGroups = {};

    allImages.forEach(filename => {
        const match = filename.match(/^(.+)_([123])\.(png|jpg|jpeg|gif|webp)$/i);
        if (match) {
            const baseName = match[1];
            const hintNum = parseInt(match[2]);

            if (!imageGroups[baseName]) {
                imageGroups[baseName] = {};
            }
            imageGroups[baseName][hintNum] = 'pictures/' + filename;
        }
    });

    // 완전한 세트만 추가 (1, 2, 3 모두 있는 것)
    Object.keys(imageGroups).forEach(baseName => {
        const group = imageGroups[baseName];
        if (group[1] && group[2] && group[3]) {
            gameState.photoSets.push({
                baseName: baseName,
                images: [group[1], group[2], group[3]]
            });
        }
    });

    return gameState.photoSets;
}

async function startPhotoQuiz() {
    await loadPhotoImages();

    if (gameState.photoSets.length === 0) {
        alert('pictures 폴더에 이미지 세트가 없습니다!\n(파일명_1.png, 파일명_2.png, 파일명_3.png 형식으로 준비해주세요)');
        return;
    }

    gameState.photoScores = {};
    members.forEach(m => {
        gameState.photoScores[m.name] = 0;
    });

    gameState.photoSets = shuffleArray(gameState.photoSets);
    gameState.photoIndex = 0;
    gameState.photoHintLevel = 1;

    // 모든 문제를 다 출제
    document.getElementById('photo-total').textContent = gameState.photoSets.length;

    createPhotoButtons();
    showPhotoQuestion();
    showScreen('photo-game-screen');
}

function createPhotoButtons() {
    const container = document.getElementById('photo-buttons');
    container.innerHTML = '';

    members.forEach(member => {
        const btn = document.createElement('button');
        btn.className = 'participant-btn';
        const photo = getMemberPhoto(member.name);
        btn.innerHTML = `
            ${photo ? `<img src="${photo}" class="participant-photo">` : ''}
            <span>${member.name}</span>
        `;
        btn.onclick = () => photoCorrect(member.name);
        container.appendChild(btn);
    });
}

function showPhotoQuestion() {
    if (gameState.photoIndex >= gameState.photoSets.length) {
        endPhotoQuiz();
        return;
    }

    const currentSet = gameState.photoSets[gameState.photoIndex];
    const hintLevel = gameState.photoHintLevel;
    const currentImage = currentSet.images[hintLevel - 1];
    const points = getPhotoPoints(hintLevel);

    document.getElementById('photo-current').textContent = gameState.photoIndex + 1;
    document.getElementById('photo-image').src = currentImage;

    // 힌트 레벨 표시
    document.getElementById('photo-hint-level').textContent = hintLevel;

    // 점수 표시 업데이트
    const pointsEl = document.getElementById('photo-points');
    const container = document.getElementById('photo-image-container');

    if (points >= 30) {
        pointsEl.innerHTML = `🔥 ${points}점 🔥`;
        pointsEl.className = 'quiz-points bonus-30';
        container.className = 'catchmind-image-container bonus-container-30';
    } else if (points >= 20) {
        pointsEl.innerHTML = `⭐ ${points}점 ⭐`;
        pointsEl.className = 'quiz-points bonus-20';
        container.className = 'catchmind-image-container bonus-container-20';
    } else {
        pointsEl.textContent = `${points}점`;
        pointsEl.className = 'quiz-points';
        container.className = 'catchmind-image-container';
    }

    // 다음 힌트 버튼 활성화/비활성화
    const nextHintBtn = document.getElementById('photo-next-hint-btn');
    if (hintLevel >= 3) {
        nextHintBtn.classList.add('disabled');
    } else {
        nextHintBtn.classList.remove('disabled');
    }

    // 게임 화면으로 전환
    showScreen('photo-game-screen');
}

function photoCorrect(playerName) {
    const points = getPhotoPoints(gameState.photoHintLevel);

    gameState.photoScores[playerName] += points;
    gameState.totalScores[playerName] += points;

    // 결과 화면 표시
    showPhotoQuestionResult(playerName, points);
}

// 다음 힌트 보기
function nextPhotoHint() {
    if (gameState.photoHintLevel < 3) {
        gameState.photoHintLevel++;
        showPhotoQuestion();
    }
}

function passPhotoQuiz() {
    // 패스 결과 화면 표시
    showPhotoQuestionResult(null, 0);
}

// 문제 결과 화면 표시
function showPhotoQuestionResult(winnerName, points) {
    const currentSet = gameState.photoSets[gameState.photoIndex];

    // 3개 힌트 이미지 표시
    document.getElementById('photo-result-img1').src = currentSet.images[0];
    document.getElementById('photo-result-img2').src = currentSet.images[1];
    document.getElementById('photo-result-img3').src = currentSet.images[2];

    const titleEl = document.getElementById('photo-result-title');
    const winnerEl = document.getElementById('photo-result-winner');
    const winnerPhotoEl = document.getElementById('photo-winner-photo');
    const winnerNameEl = document.getElementById('photo-winner-name');
    const pointsEl = document.getElementById('photo-result-points');

    if (winnerName) {
        // 정답자 있음
        titleEl.textContent = '정답! 🎉';
        titleEl.className = 'question-result-title correct';

        winnerEl.className = 'grid-item winner-grid';
        document.querySelector('#photo-result-winner .grid-label').textContent = '정답자';

        const winnerPhoto = getMemberPhoto(winnerName);
        winnerPhotoEl.src = winnerPhoto || '';
        winnerPhotoEl.style.display = winnerPhoto ? 'block' : 'none';
        winnerNameEl.textContent = winnerName;
        winnerNameEl.style.display = 'block';

        pointsEl.textContent = `+${points}점!`;
        pointsEl.className = 'winner-grid-points points-' + points;
        pointsEl.style.display = 'block';
    } else {
        // 패스
        titleEl.textContent = '패스 😅';
        titleEl.className = 'question-result-title pass';

        winnerEl.className = 'grid-item winner-grid pass';
        document.querySelector('#photo-result-winner .grid-label').textContent = '결과';

        winnerPhotoEl.style.display = 'none';
        winnerNameEl.textContent = '아쉬워요!';
        winnerNameEl.style.display = 'block';
        pointsEl.style.display = 'none';
    }

    showScreen('photo-question-result-screen');
}

// 다음 문제로 계속
function continuePhotoQuiz() {
    gameState.photoIndex++;
    gameState.photoHintLevel = 1;
    showPhotoQuestion();
}

function endPhotoQuiz() {
    showQuizResult('사진 퀴즈 종료! 📸', gameState.photoScores);
}

// === 노래 퀴즈 ===
function showSongQuizSetup() {
    showScreen('song-setup-screen');
}

async function loadSongs() {
    gameState.songs = [];

    try {
        const response = await fetch('songs/');
        if (response.ok) {
            const text = await response.text();
            const matches = text.match(/href="([^"]+\.(mp3|wav|ogg|m4a))"/gi);
            if (matches) {
                matches.forEach(match => {
                    const filename = match.match(/href="([^"]+)"/)[1];
                    // 파일명에서 확장자 제거하여 제목으로 사용
                    const title = decodeURIComponent(filename.replace(/\.(mp3|wav|ogg|m4a)$/i, ''));
                    gameState.songs.push({
                        path: 'songs/' + filename,
                        title: title
                    });
                });
            }
        }
    } catch (e) {
        console.log('songs 폴더 로드 실패');
    }

    return gameState.songs;
}

async function startSongQuiz() {
    await loadSongs();

    if (gameState.songs.length === 0) {
        alert('songs 폴더에 음악 파일이 없습니다!');
        return;
    }

    gameState.songScores = {};
    members.forEach(m => {
        gameState.songScores[m.name] = 0;
    });

    gameState.songs = shuffleArray(gameState.songs);
    gameState.songIndex = 0;

    document.getElementById('song-total').textContent = gameState.songs.length;

    createSongButtons();
    showSongQuestion();
    showScreen('song-game-screen');
}

function createSongButtons() {
    const container = document.getElementById('song-buttons');
    container.innerHTML = '';

    members.forEach(member => {
        const btn = document.createElement('button');
        btn.className = 'participant-btn';
        const photo = getMemberPhoto(member.name);
        btn.innerHTML = `
            ${photo ? `<img src="${photo}" class="participant-photo">` : ''}
            <span>${member.name}</span>
        `;
        btn.onclick = () => songCorrect(member.name);
        container.appendChild(btn);
    });
}

// 경과 시간에 따른 점수 계산
function getSongPoints(elapsedSeconds) {
    if (elapsedSeconds < 20) return 50;
    if (elapsedSeconds < 40) return 40;
    if (elapsedSeconds < 60) return 30;
    if (elapsedSeconds < 80) return 20;
    return 10;
}

function showSongQuestion() {
    if (gameState.songIndex >= gameState.songs.length) {
        endSongQuiz();
        return;
    }

    const currentSong = gameState.songs[gameState.songIndex];

    document.getElementById('song-current').textContent = gameState.songIndex + 1;

    // 경과 시간 초기화
    gameState.songElapsed = 0;
    document.getElementById('song-elapsed').textContent = '0';

    // 점수 표시 초기화 (30점으로 시작)
    updateSongPointsDisplay();

    // 오디오 설정 및 재생
    if (gameState.songAudio) {
        gameState.songAudio.pause();
        gameState.songAudio = null;
    }

    gameState.songAudio = new Audio(currentSong.path);
    gameState.songAudio.play();
    gameState.songIsPlaying = true;

    // 재생 버튼 상태 업데이트
    updatePlayButton(true);

    // 경과 시간 타이머 시작
    startSongTimer();

    showScreen('song-game-screen');
}

function startSongTimer() {
    if (gameState.songTimerInterval) {
        clearInterval(gameState.songTimerInterval);
    }

    gameState.songTimerInterval = setInterval(() => {
        if (gameState.songIsPlaying) {
            gameState.songElapsed++;
            document.getElementById('song-elapsed').textContent = gameState.songElapsed;
            updateSongPointsDisplay();
        }
    }, 1000);
}

function stopSongTimer() {
    if (gameState.songTimerInterval) {
        clearInterval(gameState.songTimerInterval);
        gameState.songTimerInterval = null;
    }
}

function updateSongPointsDisplay() {
    const points = getSongPoints(gameState.songElapsed);
    const pointsEl = document.getElementById('song-points');

    if (points >= 30) {
        pointsEl.innerHTML = `🔥 ${points}점 🔥`;
        pointsEl.className = 'quiz-points bonus-30';
    } else if (points >= 20) {
        pointsEl.innerHTML = `⭐ ${points}점 ⭐`;
        pointsEl.className = 'quiz-points bonus-20';
    } else {
        pointsEl.textContent = `${points}점`;
        pointsEl.className = 'quiz-points';
    }
}

function updatePlayButton(isPlaying) {
    const btn = document.getElementById('song-play-btn');
    const playerBox = document.querySelector('.song-player-box');

    if (isPlaying) {
        btn.classList.add('playing');
        btn.querySelector('.play-icon').textContent = '⏸️';
        btn.querySelector('.btn-text').textContent = '일시정지';
        playerBox.classList.remove('paused');
    } else {
        btn.classList.remove('playing');
        btn.querySelector('.play-icon').textContent = '▶️';
        btn.querySelector('.btn-text').textContent = '재생';
        playerBox.classList.add('paused');
    }
}

function toggleSongPlayback() {
    if (!gameState.songAudio) return;

    if (gameState.songIsPlaying) {
        gameState.songAudio.pause();
        gameState.songIsPlaying = false;
        updatePlayButton(false);
    } else {
        gameState.songAudio.play();
        gameState.songIsPlaying = true;
        updatePlayButton(true);
    }
}

function songCorrect(playerName) {
    const points = getSongPoints(gameState.songElapsed);
    const elapsed = gameState.songElapsed;

    gameState.songScores[playerName] += points;
    gameState.totalScores[playerName] += points;

    // 음악 정지
    stopSongPlayback();

    // 결과 화면 표시
    showSongQuestionResult(playerName, points, elapsed);
}

function stopSongPlayback() {
    stopSongTimer();
    if (gameState.songAudio) {
        gameState.songAudio.pause();
        gameState.songAudio = null;
    }
    gameState.songIsPlaying = false;
}

function passSongQuiz() {
    const elapsed = gameState.songElapsed;
    stopSongPlayback();
    showSongQuestionResult(null, 0, elapsed);
}

function showSongQuestionResult(winnerName, points, elapsed) {
    const currentSong = gameState.songs[gameState.songIndex];

    // 노래 제목 표시
    document.getElementById('song-answer').textContent = currentSong.title;

    const titleEl = document.getElementById('song-result-title');
    const winnerBox = document.getElementById('song-result-winner');
    const winnerPhotoEl = document.getElementById('song-winner-photo');
    const winnerNameEl = document.getElementById('song-winner-name');
    const pointsEl = document.getElementById('song-result-points');
    const timeEl = document.getElementById('song-result-time');

    if (winnerName) {
        // 정답자 있음
        titleEl.textContent = '정답! 🎉';
        titleEl.className = 'question-result-title correct';

        winnerBox.className = 'song-winner-box';

        const winnerPhoto = getMemberPhoto(winnerName);
        winnerPhotoEl.src = winnerPhoto || '';
        winnerPhotoEl.style.display = winnerPhoto ? 'block' : 'none';
        winnerNameEl.textContent = winnerName;

        pointsEl.textContent = `+${points}점!`;
        pointsEl.className = 'winner-points-large points-' + points;
        pointsEl.style.display = 'block';

        timeEl.textContent = `${elapsed}초만에 정답!`;
        timeEl.style.display = 'block';
    } else {
        // 패스
        titleEl.textContent = '패스 😅';
        titleEl.className = 'question-result-title pass';

        winnerBox.className = 'song-winner-box pass';

        winnerPhotoEl.style.display = 'none';
        winnerNameEl.textContent = '아쉬워요!';
        pointsEl.style.display = 'none';
        timeEl.style.display = 'none';
    }

    showScreen('song-question-result-screen');
}

function continueSongQuiz() {
    gameState.songIndex++;
    showSongQuestion();
}

function endSongQuiz() {
    stopSongPlayback();
    showQuizResult('노래 퀴즈 종료! 🎵', gameState.songScores);
}

// === 공통 퀴즈 결과 ===
function showQuizResult(title, scores) {
    document.getElementById('quiz-result-title').textContent = title;

    const container = document.getElementById('quiz-rankings');
    container.innerHTML = '';

    const sortedPlayers = Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);

    const rankedPlayers = calculateRanks(sortedPlayers);

    rankedPlayers.forEach(({ name, score, rank }) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        const medal = getMedalForRank(rank);
        const rankText = medal || `${rank}위`;
        const photo = getMemberPhoto(name);
        const photoHtml = photo ? `<img src="${photo}" class="ranking-photo">` : '';
        item.innerHTML = `
            <span class="ranking-position">${rankText}</span>
            ${photoHtml}
            <span class="ranking-name">${name}</span>
            <span class="ranking-score">${score}점</span>
        `;
        container.appendChild(item);
    });

    showScreen('quiz-result-screen');
    showConfetti();
}

// === 효과 ===
function showConfetti() {
    const colors = ['#ff6b6b', '#feca57', '#48c6ef', '#38ef7d', '#667eea', '#ff9f43'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }, i * 50);
    }
}
