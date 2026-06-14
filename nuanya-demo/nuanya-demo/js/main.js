// --- 配置与通用工具 ---
const API_BASE = (window.location && window.location.port === '8000') ? '' : 'http://127.0.0.1:8000'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// --- 页面特定逻辑辅助 ---

// 加载我的收藏列表
async function loadCollections() {
    const listContainer = document.getElementById('collectionsList');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';
    
    try {
        console.log('Fetching collections from:', `${API_BASE}/api/users/me/favorites`);
        const json = await apiGet('/api/users/me/favorites');
        console.log('Collections API response:', json);
        
        if (json.code === 200 && Array.isArray(json.data)) {
            renderCollections(json.data);
        } else {
            throw new Error(json.message || '加载失败');
        }
    } catch (e) {
        console.error('loadCollections error:', e);
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>加载收藏失败：${e.message}</p>
            </div>
        `;
    }
}

function renderCollections(favorites) {
    const listContainer = document.getElementById('collectionsList');
    if (!listContainer) return;

    if (!favorites || favorites.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <p>还没有收藏过任何内容</p>
            </div>
        `;
        return;
    }

    const html = favorites.map(fav => {
        const createTime = new Date(fav.create_time).toLocaleDateString('zh-CN');
        return `
            <div class="question-card">
                <div class="card-header">
                    <span class="category-tag">收藏</span>
                </div>
                <p class="question-title">${fav.question_title || '未指定问题'}</p>
                <p class="answer-text">${fav.answer_text || '无内容'}</p>
                <p class="card-footer">回答人：${fav.mom_name || '匿名'} · 收藏时间：${createTime}</p>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = html;
}

// 加载我的回答列表
async function loadMyAnswers() {
    const listContainer = document.getElementById('myAnswersList');
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';
    
    try {
        console.log('Fetching my answers from:', `${API_BASE}/api/users/me/answers`);
        const json = await apiGet('/api/users/me/answers');
        console.log('My answers API response:', json);
        
        if (json.code === 200 && Array.isArray(json.data)) {
            renderMyAnswers(json.data);
        } else {
            throw new Error(json.message || '加载失败');
        }
    } catch (e) {
        console.error('loadMyAnswers error:', e);
        // 使用模拟数据作为后备
        const mockData = [
            {
                id: 1,
                question: {
                    id: 1,
                    title: "孩子不爱吃饭怎么办？",
                    category: "饮食健康"
                },
                answer_text: "孩子不爱吃饭可尝试少量多餐，营造愉快的用餐环境，避免强迫进食...",
                create_time: "2025-09-15T11:00:00.000000",
                voice_record_id: 101
            },
            {
                id: 2,
                question: {
                    id: 2,
                    title: "宝宝晚上频繁夜醒怎么处理？",
                    category: "睡眠问题"
                },
                answer_text: "宝宝夜醒可能是缺钙或睡眠环境不适，建议检查室温、光线，建立规律作息...",
                create_time: "2025-09-16T14:20:00.000000",
                voice_record_id: null
            },
            {
                id: 3,
                question: {
                    id: 3,
                    title: "如何培养孩子的独立性？",
                    category: "性格培养"
                },
                answer_text: "培养孩子独立性需要循序渐进，从简单的自理能力开始，给予适当的鼓励和支持...",
                create_time: "2025-09-17T09:30:00.000000",
                voice_record_id: 102
            }
        ];
        renderMyAnswers(mockData);
    }
}

function renderMyAnswers(answers) {
    const listContainer = document.getElementById('myAnswersList');
    
    if (!answers || answers.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                <p>还没有回答过问题</p>
                <p>去问答广场看看吧</p>
            </div>
        `;
        return;
    }
    
    const html = answers.map(answer => {
        const createTime = new Date(answer.create_time).toLocaleDateString('zh-CN');
        
        return `
            <div class="answer-item">
                <div class="answer-question-title">${answer.question.title}</div>
                <div class="answer-question-category">${answer.question.category}</div>
                <div class="answer-text">${answer.answer_text}</div>
                <div class="answer-meta">
                    <span class="answer-time">${createTime}</span>
                </div>
            </div>
        `;
    }).join('');
    
    listContainer.innerHTML = html;
}

async function loadMyQuestions() {
    const listContainer = document.getElementById('myQuestionsList');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';

    try {
        console.log('Fetching my questions from:', `${API_BASE}/api/users/me/questions`);
        const json = await apiGet('/api/users/me/questions');
        console.log('My questions API response:', json);

        if (json.code === 200 && Array.isArray(json.data)) {
            renderMyQuestions(json.data);
        } else {
            throw new Error(json.message || '加载失败');
        }
    } catch (e) {
        console.error('loadMyQuestions error:', e);
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>加载提问失败：${e.message}</p>
            </div>
        `;
    }
}

function renderMyQuestions(questions) {
    const listContainer = document.getElementById('myQuestionsList');
    if (!listContainer) return;

    if (!questions || questions.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>还没有提出过问题</p>
            </div>
        `;
        return;
    }

    const html = questions.map(q => {
        const createTime = new Date(q.create_time).toLocaleDateString('zh-CN');
        return `
            <div class="question-card">
                <div class="card-header"><span class="category-tag">老人问题</span></div>
                <p class="question-title">${q.title || ''}</p>
                <p class="question-snippet">${q.content || ''}</p>
                <p class="card-footer">发布时间：${createTime}</p>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = html;
}

function updateNotificationSection(enabled) {
    const section = document.getElementById('notificationsSection');
    if (!section) return;
    section.style.display = enabled ? 'block' : 'none';
}

function markNotificationRead(id) {
    notificationsData = notificationsData.map(n => n.id === id ? { ...n, unread: false } : n);
    renderNotifications();
}

// 渲染通知列表
function renderNotifications() {
    const container = document.getElementById('notificationList');
    if (!container) return;

    container.innerHTML = notificationsData.map(n => `
        <div class="notification-item ${n.unread ? 'unread' : ''}" data-id="${n.id}">
            <div class="notification-dot"></div>
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${n.title}</span>
                    <span class="notification-time">${n.time}</span>
                </div>
                <div class="notification-text">${n.content}</div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.notification-item').forEach(item => {
        item.onclick = () => {
            const id = Number(item.getAttribute('data-id'));
            const notification = notificationsData.find(n => n.id === id);
            if (notification) {
                alert(`${notification.title}\n\n${notification.content}\n\n${notification.time}`);
                markNotificationRead(id);
            }
        };
    });
}

async function apiGet(path) {
    try {
        console.log('Making API request to:', `${API_BASE}${path}`);
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Response status:', res.status);
        console.log('Response headers:', res.headers);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log('Response data:', data);
        return data;
    } catch (error) {
        console.error('API GET error:', error);
        throw error;
    }
}
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body || {})
    });
    return res.json();
}
async function apiPut(path, body) {
    try {
        console.log('Making API PUT request to:', `${API_BASE}${path}`);
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body || {})
        });
        console.log('Response status:', res.status);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log('Response data:', data);
        return data;
    } catch (error) {
        console.error('API PUT error:', error);
        throw error;
    }
}
async function apiUpload(path, formData) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            body: formData
        });
        
        // 检查响应状态
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        // 获取响应文本
        const text = await res.text();
        console.log('API响应原始文本:', text);
        
        // 尝试解析JSON
        try {
            return JSON.parse(text);
        } catch (parseError) {
            console.error('JSON解析失败:', parseError);
            console.error('响应内容:', text);
            throw new Error(`无效的JSON响应: ${text.substring(0, 100)}...`);
        }
    } catch (error) {
        console.error('API上传错误:', error);
        throw error;
    }
}

// --- 数据和状态 ---
let questionsData = [];
let questionsLoaded = false; // 标记问题数据是否已加载
let thankLettersData = []; // 感谢信数据
let thankLettersLoaded = false; // 标记感谢信数据是否已加载
let notificationsData = [
    { id: 1, title: '恭喜！您的回答被设为最佳', content: '您关于“血压高早上起来头晕怎么办？”的回答被妈妈采纳了。', time: '10分钟前', unread: true },
    { id: 2, title: '收到一封新的感谢信', content: '李妈妈给您发来了一封感谢信，快去看看吧。', time: '1小时前', unread: true },
    { id: 3, title: '获得新勋章：暖心长辈', content: '由于您累计帮助了5位老人，获得了此勋章。', time: '昨天', unread: false }
];
// 移除模拟感谢信数据：如后端提供接口可接入；当前展示为空状态
let recordingState = 'idle', timerInterval = null, seconds = 0;
let currentSlide = 0;
let currentQuestion = null;
let lastVoiceFileUrl = null;
let lastTranscriptText = '';
let lastSummaryText = '';
let selectedExpertiseTags = []; // 用户选择的擅长领域标签

// --- 导航逻辑 ---
const pages = document.querySelectorAll('.page');
const bottomNav = document.getElementById('bottomNav');
const navItems = document.querySelectorAll('.nav-item');

function navigateTo(pageId, data = {}) {
    console.log('导航到页面:', pageId, data);
    
    // 检查目标页面是否存在
    const targetPage = document.getElementById(pageId);
    if (!targetPage) {
        console.error('目标页面不存在:', pageId);
        showToast('页面不存在');
        return;
    }
    
    // 隐藏所有页面
    pages.forEach(page => page.classList.remove('active'));
    
    // 显示目标页面
    targetPage.classList.add('active');
    console.log('页面切换成功:', pageId);

    // 处理底部导航栏显示
    if (['page-home', 'page-collections', 'page-honor', 'page-profile'].includes(pageId)) {
        if (bottomNav) bottomNav.style.display = 'flex';
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageId);
        });
    } else {
        if (bottomNav) bottomNav.style.display = 'none';
    }

    // 页面特定的初始化逻辑
    if (pageId === 'page-answer-detail') {
        loadQuestionDetail(data.question_id || (currentQuestion && currentQuestion.id));
    }
    
    if (pageId === 'page-login') {
        const phoneInput = document.getElementById('phoneInput');
        const loginBtn = document.getElementById('loginBtn');
        if(phoneInput) phoneInput.value = '';
        if(loginBtn) loginBtn.disabled = true;
    }

    if (pageId === 'page-home') {
        const savedMode = localStorage.getItem('nuanya:qa_mode') || 'answer';
        setQaMode(savedMode, true);
        if (savedMode === 'answer') fetchQuestionsAndRender();
    }
    
    if (pageId === 'page-profile') {
        loadProfileAndSettings();
    }
    
    if (pageId === 'page-honor') {
        loadHonorBadges();
        loadThankLetters();
    }
    
    if (pageId === 'page-collections') {
        loadCollections();
    }
    
    // 添加我的回答页面处理
    if (pageId === 'page-my-answers') {
        loadMyAnswers();
    }

    if (pageId === 'page-my-questions') {
        loadMyQuestions();
    }
}

// --- 页面专属逻辑 ---

function setQaMode(mode, skipSave = false) {
    const answerBtn = document.getElementById('qa-btn-answer');
    const askBtn = document.getElementById('qa-btn-ask');
    const answerContent = document.getElementById('qa-answer-content');
    const askContent = document.getElementById('qa-ask-content');
    if (!answerBtn || !askBtn || !answerContent || !askContent) return;

    const targetMode = mode === 'ask' ? 'ask' : 'answer';
    answerBtn.classList.toggle('active', targetMode === 'answer');
    askBtn.classList.toggle('active', targetMode === 'ask');
    answerContent.style.display = targetMode === 'answer' ? 'block' : 'none';
    askContent.style.display = targetMode === 'ask' ? 'block' : 'none';

    if (!skipSave) localStorage.setItem('nuanya:qa_mode', targetMode);
    if (targetMode === 'ask') resetAskVoiceUI();
    if (targetMode === 'answer') fetchQuestionsAndRender();
}

let askMediaRecorder = null;
let askAudioChunks = [];
let askRecordingState = 'idle';
let askTimerInterval = null;
let askSeconds = 0;
let askVoiceFileUrl = null;
let askTranscriptText = '';
let askSummaryText = '';

function resetAskVoiceUI() {
    askVoiceFileUrl = null;
    askTranscriptText = '';
    askSummaryText = '';

    const wrapper = document.getElementById('askSummaryWrapper');
    const loading = document.getElementById('askAiLoading');
    const results = document.getElementById('askAiResults');
    if (wrapper) wrapper.classList.remove('visible');
    if (loading) loading.style.display = 'block';
    if (results) results.style.display = 'none';

    const orig = document.getElementById('askOriginalText');
    const refined = document.getElementById('askRefinedText');
    if (orig) orig.textContent = '';
    if (refined) refined.innerHTML = '';

    askRecordingState = 'idle';
    updateAskRecordingUI('idle');
    stopAskTimer();
}

async function startAskRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });

        let mimeType = 'audio/wav';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm;codecs=opus';
        }

        askMediaRecorder = new MediaRecorder(stream, { mimeType });
        askAudioChunks = [];

        askMediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) askAudioChunks.push(event.data);
        };

        askMediaRecorder.onstart = () => {
            askRecordingState = 'recording';
            updateAskRecordingUI('recording');
            startAskTimer();
        };

        askMediaRecorder.onstop = async () => {
            askRecordingState = 'stopped';
            updateAskRecordingUI('stopped');
            stopAskTimer();

            const audioBlob = new Blob(askAudioChunks, { type: mimeType });
            const wrapper = document.getElementById('askSummaryWrapper');
            const loading = document.getElementById('askAiLoading');
            const results = document.getElementById('askAiResults');
            if (wrapper) wrapper.classList.add('visible');
            if (loading) loading.style.display = 'block';
            if (results) results.style.display = 'none';

            await uploadAskVoiceFile(audioBlob);
        };

        askMediaRecorder.start();
    } catch (error) {
        console.error('无法访问麦克风:', error);
        showToast('无法访问麦克风，请检查权限');
    }
}

function stopAskRecording() {
    if (askMediaRecorder && askRecordingState === 'recording') {
        askMediaRecorder.stop();
        askMediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function updateAskRecordingUI(state) {
    const recordBtn = document.getElementById('askRecordBtn');
    const statusText = document.getElementById('askStatusText');
    const instructions = document.getElementById('askInstructions');
    const progress = document.getElementById('askRecordingProgress');
    const fill = document.getElementById('askProgressFill');
    const timer = document.getElementById('askRecordingTimer');
    const micIcon = document.getElementById('ask-mic-icon');
    const stopIcon = document.getElementById('ask-stop-icon');

    if (!recordBtn || !statusText || !instructions || !progress || !fill || !timer || !micIcon || !stopIcon) return;

    if (state === 'idle') {
        recordBtn.className = 'record-button idle';
        micIcon.style.display = 'block';
        stopIcon.style.display = 'none';
        statusText.textContent = '';
        instructions.textContent = '点击按钮，开始说出您的问题';
        progress.style.display = 'none';
        fill.style.width = '0%';
        timer.textContent = '00:00';
    } else if (state === 'recording') {
        recordBtn.className = 'record-button recording';
        micIcon.style.display = 'none';
        stopIcon.style.display = 'block';
        statusText.textContent = '正在录音中...';
        instructions.textContent = '再次点击按钮停止录音';
        progress.style.display = 'block';
    } else if (state === 'stopped') {
        recordBtn.className = 'record-button idle';
        micIcon.style.display = 'block';
        stopIcon.style.display = 'none';
        statusText.textContent = '录音已完成，正在处理...';
        instructions.textContent = '正在上传和识别您的语音';
        progress.style.display = 'none';
    }
}

function startAskTimer() {
    const timer = document.getElementById('askRecordingTimer');
    const fill = document.getElementById('askProgressFill');
    const maxDuration = 120;

    askSeconds = 0;
    stopAskTimer();
    askTimerInterval = setInterval(() => {
        askSeconds++;
        const minutes = Math.floor(askSeconds / 60);
        const remainingSeconds = askSeconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        if (timer) timer.textContent = timeString;
        if (fill) {
            const progress = Math.min((askSeconds / maxDuration) * 100, 100);
            fill.style.width = `${progress}%`;
        }
        if (askSeconds >= maxDuration) stopAskRecording();
    }, 1000);
}

function stopAskTimer() {
    if (askTimerInterval) {
        clearInterval(askTimerInterval);
        askTimerInterval = null;
    }
}

async function uploadAskVoiceFile(audioBlob) {
    const formData = new FormData();
    let finalBlob = audioBlob;
    if (!audioBlob.type.includes('wav') && typeof convertToWav === 'function') {
        finalBlob = await convertToWav(audioBlob);
    }
    formData.append('file', finalBlob, 'recording.wav');

    try {
        const json = await apiUpload('/api/voice/upload_transcribe_summarize', formData);
        if (json && json.code === 200) {
            askVoiceFileUrl = json.data.file_url;
            askTranscriptText = json.data.transcript || '';
            askSummaryText = json.data.summary || '';

            const loading = document.getElementById('askAiLoading');
            const results = document.getElementById('askAiResults');
            if (loading) loading.style.display = 'none';
            if (results) results.style.display = 'block';

            const originalEl = document.getElementById('askOriginalText');
            const refinedEl = document.getElementById('askRefinedText');
            if (originalEl) originalEl.textContent = askTranscriptText;
            if (refinedEl) refinedEl.innerHTML = `<p>${askSummaryText}</p>`;

            askRecordingState = 'idle';
            updateAskRecordingUI('idle');
        } else {
            throw new Error((json && json.message) || '上传失败');
        }
    } catch (error) {
        console.error('语音上传错误:', error);
        const loading = document.getElementById('askAiLoading');
        const results = document.getElementById('askAiResults');
        if (loading) loading.style.display = 'none';
        if (results) results.style.display = 'block';

        const originalEl = document.getElementById('askOriginalText');
        const refinedEl = document.getElementById('askRefinedText');
        if (originalEl) originalEl.textContent = '语音处理失败，请重新录制';
        if (refinedEl) refinedEl.innerHTML = '<p>无法生成内容</p>';

        askRecordingState = 'idle';
        updateAskRecordingUI('idle');
    }
}

async function submitAskByVoice() {
    const categorySelect = document.getElementById('askCategorySelectVoice');
    const category = (categorySelect && categorySelect.value ? categorySelect.value : '').trim();
    const content = askTranscriptText || '';
    const titleSource = (askSummaryText || '').trim() || content;
    const title = titleSource.length > 18 ? `${titleSource.slice(0, 18)}...` : titleSource;

    if (!content) {
        showToast('请先录一段语音');
        return;
    }

    try {
        const payload = {
            title: title || '语音提问',
            category: category || '其他',
            content,
            tags: [],
            baby_age_months: 6,
            urgency_level: 'normal'
        };
        const json = await apiPost('/api/mom/questions/ask/', payload);
        if (json && json.success) {
            showToast('提问成功');
            resetAskVoiceUI();
            setQaMode('answer');
        } else {
            throw new Error((json && json.message) || '提问失败');
        }
    } catch (e) {
        showToast(`提问失败：${e.message}`);
    }
}

function openAskModal() {
    const modal = document.getElementById('askModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const titleInput = document.getElementById('askTitleInput');
    if (titleInput) titleInput.focus();
}

function closeAskModal() {
    const modal = document.getElementById('askModal');
    if (!modal) return;
    modal.style.display = 'none';
}

async function submitAsk() {
    const titleInput = document.getElementById('askTitleInput');
    const categorySelect = document.getElementById('askCategorySelect');
    const contentInput = document.getElementById('askContentInput');
    const title = (titleInput && titleInput.value ? titleInput.value : '').trim();
    const category = (categorySelect && categorySelect.value ? categorySelect.value : '').trim();
    const content = (contentInput && contentInput.value ? contentInput.value : '').trim();

    if (!title) {
        showToast('请先填写标题');
        return;
    }

    try {
        const payload = {
            title,
            category,
            content,
            tags: [],
            baby_age_months: 6,
            urgency_level: 'normal'
        };
        const json = await apiPost('/api/mom/questions/ask/', payload);
        if (json && json.success) {
            showToast('提问成功');
            closeAskModal();
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            setQaMode('answer');
        } else {
            throw new Error((json && json.message) || '提问失败');
        }
    } catch (e) {
        showToast(`提问失败：${e.message}`);
    }
}

function readStorageJson(key, fallbackValue) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallbackValue;
        return JSON.parse(raw);
    } catch {
        return fallbackValue;
    }
}

function writeStorageJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {}
}

function pushMomNotification(notification) {
    const key = 'nuanya:mom_notifications';
    const list = readStorageJson(key, []);
    list.unshift(notification);
    writeStorageJson(key, list.slice(0, 50));
}

// 问答广场：加载数据并渲染
async function fetchQuestionsAndRender() {
    const listContainer = document.getElementById('questionList');
    
    // 如果数据已经加载过，直接渲染现有数据
    if (questionsLoaded && questionsData.length > 0) {
        console.log('Using cached questions data');
        renderQuestions();
        return;
    }
    
    // 清空容器并显示加载状态
    listContainer.innerHTML = '<div class="loading-state">加载中...</div>';
    
    try {
        console.log('Fetching questions from:', `${API_BASE}/api/elder/questions/unanswered`);
        const json = await apiGet('/api/elder/questions/unanswered');
        console.log('API response:', json);
        if (json.code === 200 && Array.isArray(json.data)) {
            questionsData = json.data;
            questionsLoaded = true; // 标记数据已加载
        } else {
            throw new Error(json.message || '加载失败');
        }
    } catch (e) {
        console.error('fetchQuestionsAndRender error:', e);
        questionsData = [];
        questionsLoaded = false;
        const err = document.createElement('div');
        err.textContent = '加载问题列表失败，请稍后重试。';
        listContainer.innerHTML = '';
        listContainer.appendChild(err);
        return;
    }

    renderQuestions();
}

// 渲染问题列表
function renderQuestions() {
    const listContainer = document.getElementById('questionList');
    listContainer.innerHTML = '';

    questionsData.forEach((q, index) => {
        const cardLink = document.createElement('a');
        cardLink.className = 'question-card-link';
        cardLink.onclick = () => { currentQuestion = q; navigateTo('page-answer-detail', { question_id: q.id }); };

        const card = document.createElement('div');
        card.className = 'question-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <div class="card-header"><span class="category-tag">${q.category || ''}</span></div>
            <p class="question-title">${q.title || ''}</p>
            <p class="card-footer">发布时间：${(q.create_time || '').replace('T',' ').split('.')[0]}</p>
        `;
        cardLink.appendChild(card);
        listContainer.appendChild(cardLink);
    });
}

// 引导页逻辑
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('dotsContainer');
const onboardingBtn = document.getElementById('onboardingBtn');

function setupOnboarding() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slides.length; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dotsContainer.appendChild(dot);
    }
    updateOnboardingUI();
}

function updateOnboardingUI() {
    slides.forEach((slide, index) => {
        slide.style.display = index === currentSlide ? 'flex' : 'none';
    });
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
    if (currentSlide === slides.length - 1) {
        onboardingBtn.textContent = '开启我的分享之旅';
    } else {
        onboardingBtn.textContent = '下一页';
    }
}

// 荣誉墙页面的Tab切换
function showHonorTab(tabName) {
    document.getElementById('btn-badges').classList.remove('active');
    document.getElementById('btn-letters').classList.remove('active');
    document.getElementById('honor-badges-content').style.display = 'none';
    document.getElementById('honor-letters-content').style.display = 'none';

    document.getElementById(`btn-${tabName}`).classList.add('active');
    document.getElementById(`honor-${tabName}-content`).style.display = 'block';
}

// 感谢信详情逻辑
const letterDetailOverlay = document.getElementById('letterDetailOverlay');
function showLetterDetail(letterId) {
    // 查找对应的感谢信数据
    const letter = thankLettersData.find(l => l.id === letterId);
    
    if (!letter) {
        console.error('未找到感谢信数据:', letterId);
        return;
    }
    
    // 隐藏图片元素（当前设计不包含图片）
    const photoEl = document.getElementById('letterDetailPhoto');
    if (photoEl) {
        photoEl.style.display = 'none';
    }
    
    // 显示感谢信内容
    const textEl = document.getElementById('letterDetailText');
    if (textEl) {
        textEl.innerHTML = `
            <div class="letter-detail-content">
                <h3>${letter.title}</h3>
                <div class="letter-content">${letter.content}</div>
                <div class="letter-meta">
                    <p><strong>来自：</strong>${letter.sender_name}（${letter.sender_relation}）</p>
                    <p><strong>感谢专家：</strong>${letter.recipient_expert}</p>
                    <p><strong>帮助类别：</strong>${letter.help_category}</p>
                    <p><strong>时间：</strong>${new Date(letter.create_time).toLocaleDateString('zh-CN')}</p>
                </div>
            </div>
        `;
    }
    
    // 显示弹窗
    letterDetailOverlay.classList.add('visible');
    setTimeout(() => { letterDetailOverlay.classList.add('open'); }, 10);
}
function closeLetterDetail() {
    letterDetailOverlay.classList.remove('open');
    setTimeout(() => {
        letterDetailOverlay.classList.remove('visible');
    }, 800);
}

// 回答详情页逻辑
function loadQuestionDetail(questionId) {
    const question = questionsData.find(q => q.id === questionId) || currentQuestion;
    if(question) {
        currentQuestion = question;
        document.getElementById('questionTitleDetail').textContent = question.title || '';
        document.getElementById('questionContentDetail').textContent = question.content || '';
        // 重置摘要区
        lastVoiceFileUrl = null; lastTranscriptText = ''; lastSummaryText = '';
        document.getElementById('summaryWrapper').classList.remove('visible');
        document.getElementById('aiLoading').style.display = 'block';
        document.getElementById('aiResults').style.display = 'none';
        // 清空显示区，避免残留测试文案
        const origEl = document.querySelector('.original-text');
        const suggEl = document.querySelector('.refined-suggestions');
        if (origEl) origEl.textContent = '';
        if (suggEl) suggEl.innerHTML = '';
    }
}

// 个人中心：加载用户信息与设置
async function loadProfileAndSettings() {
    try {
        const me = await apiGet('/api/user/profile');
        if (me.code === 200 && me.data) {
            const d = me.data;
            document.querySelector('#page-profile .user-info .name').textContent = d.name || '共享育儿专家';
            document.querySelector('#page-profile .user-info .tag').textContent = `${d.role || '育儿专家'} · ${String(d.join_time || '').slice(0,10)} 加入`;
            const stats = document.querySelectorAll('#page-profile .stat-item .count');
            // 使用数据库中的真实数据
            if (stats[0]) stats[0].textContent = d.answer_count || 0;
            if (stats[1]) stats[1].textContent = d.like_count || 0;
            if (stats[2]) stats[2].textContent = d.help_count || 0;
        }
    } catch(e) {
        console.error('加载用户资料失败:', e);
        // 如果API调用失败，显示0而不是随机数据
        const stats = document.querySelectorAll('#page-profile .stat-item .count');
        if (stats[0]) stats[0].textContent = 0;
        if (stats[1]) stats[1].textContent = 0;
        if (stats[2]) stats[2].textContent = 0;
    }

    // 设置：声音提醒与消息通知
    try {
        const s = await apiGet('/api/settings');
        if (s.code === 200 && s.data) {
            const soundSwitch = document.getElementById('soundAlert');
            const notifSwitch = document.getElementById('messageNotification');
            if (soundSwitch) soundSwitch.checked = (s.data.sound === 'on');
            if (notifSwitch) notifSwitch.checked = (s.data.notification === 'on');
            updateNotificationSection(!notifSwitch || notifSwitch.checked);
            renderNotifications();
            if (soundSwitch) {
                soundSwitch.onchange = async () => {
                    await apiPut('/api/settings', { sound: soundSwitch.checked ? 'on' : 'off', notification: notifSwitch && notifSwitch.checked ? 'on' : 'off' });
                };
            }
            if (notifSwitch) {
                notifSwitch.onchange = async () => {
                    await apiPut('/api/settings', { sound: soundSwitch && soundSwitch.checked ? 'on' : 'off', notification: notifSwitch.checked ? 'on' : 'off' });
                    updateNotificationSection(notifSwitch.checked);
                };
            }
        }
    } catch(e) {}
}

// 设置弹窗相关函数
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';
    loadSettingsData();
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

async function loadSettingsData() {
    try {
        const s = await apiGet('/api/settings');
        if (s.code === 200 && s.data) {
            const soundSwitch = document.getElementById('soundAlert');
            const notifSwitch = document.getElementById('messageNotification');
            if (soundSwitch) soundSwitch.checked = (s.data.sound === 'on');
            if (notifSwitch) notifSwitch.checked = (s.data.notification === 'on');
            updateNotificationSection(!notifSwitch || notifSwitch.checked);
            renderNotifications();
            if (soundSwitch) {
                soundSwitch.onchange = async () => {
                    await apiPut('/api/settings', { 
                        sound: soundSwitch.checked ? 'on' : 'off', 
                        notification: notifSwitch && notifSwitch.checked ? 'on' : 'off' 
                    });
                };
            }
            if (notifSwitch) {
                notifSwitch.onchange = async () => {
                    await apiPut('/api/settings', { 
                        sound: soundSwitch && soundSwitch.checked ? 'on' : 'off', 
                        notification: notifSwitch.checked ? 'on' : 'off' 
                    });
                    updateNotificationSection(notifSwitch.checked);
                };
            }
        }
    } catch(e) {
        console.error('加载设置失败:', e);
    }
}

function ensureSettingsSwitch(labelText, id) {
    // 在功能列表中确保存在两个设置项（声音提醒、消息通知）
    const list = document.querySelector('#page-profile .function-list');
    let item = document.getElementById(id);
    if (!item) {
        item = document.createElement('div');
        item.className = 'list-item';
        item.id = id;
        item.innerHTML = `
            <div class="item-left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
                <span>${labelText}</span>
            </div>
            <label class="switch"><input type="checkbox"><span class="slider"></span></label>
        `;
        list.insertBefore(item, list.firstChild);
    }
    return item.querySelector('input');
}

// 荣誉墙：加载徽章（已获与全部）
async function loadHonorBadges() {
    try {
        const all = await apiGet('/api/badges');
        const mine = await apiGet('/api/users/me/badges');
        const unlocked = new Set((mine.data || []).map(b => b.id));
        const grid = document.querySelector('.badge-grid');
        grid.innerHTML = '';
        (all.data || []).forEach(b => {
            const isUnlocked = unlocked.has(b.id);
            const el = document.createElement('div');
            el.className = 'badge-item';
            el.innerHTML = `
                <div class="badge-icon ${isUnlocked ? 'unlocked' : ''}">${isUnlocked ? '已获得' : '未解锁'}</div>
                <p class="badge-name ${isUnlocked ? 'unlocked' : ''}">${b.name}</p>
                <p class="badge-description">${b.description || '暂无描述'}</p>
            `;
            grid.appendChild(el);
        });
    } catch(e) {}
}

// 擅长领域选择功能
function setupExpertiseSelection() {
    const expertiseOptions = document.querySelectorAll('.expertise-option');
    const expertiseBtn = document.getElementById('expertiseBtn');
    
    if (!expertiseOptions.length || !expertiseBtn) {
        console.warn('擅长领域选择元素未找到');
        return;
    }
    
    expertiseOptions.forEach(option => {
        option.addEventListener('click', () => {
            const tag = option.dataset.tag;
            
            if (option.classList.contains('selected')) {
                // 取消选择
                option.classList.remove('selected');
                selectedExpertiseTags = selectedExpertiseTags.filter(t => t !== tag);
            } else {
                // 添加选择
                option.classList.add('selected');
                selectedExpertiseTags.push(tag);
            }
            
            // 更新按钮状态
            expertiseBtn.disabled = selectedExpertiseTags.length === 0;
            console.log('当前选择的擅长领域:', selectedExpertiseTags);
        });
    });
    
    expertiseBtn.addEventListener('click', async () => {
        if (selectedExpertiseTags.length > 0) {
            try {
                console.log('准备保存擅长领域:', selectedExpertiseTags);
                
                // 先保存到本地存储
                localStorage.setItem('selectedExpertiseTags', JSON.stringify(selectedExpertiseTags));
                
                // 显示保存成功提示
                showToast('擅长领域已保存');
                
                // 导航到主页
                navigateTo('page-home');
                
                // 异步提交到后端（如果后端可用）
                try {
                    await apiPut('/api/users/me/expertise_tags', {
                        expertise_tags: selectedExpertiseTags
                    });
                    console.log('擅长领域已同步到后端');
                } catch (backendError) {
                    console.warn('后端同步失败，但本地已保存:', backendError);
                    // 不显示错误，因为本地已保存成功
                }
                
            } catch (error) {
                console.error('保存擅长领域失败:', error);
                showToast('保存失败，请重试');
            }
        } else {
            showToast('请至少选择一个擅长领域');
        }
    });
}
async function cancelRecording() {
    try {
        // 调用清理音频文件的API
        await cleanupVoiceFiles();
        
        // 隐藏AI结果区域
        const summaryWrapper = document.getElementById('summaryWrapper');
        const aiResults = document.getElementById('aiResults');
        if (summaryWrapper) summaryWrapper.style.display = 'none';
        if (aiResults) aiResults.style.display = 'none';
        
        // 重置录音状态
        const statusText = document.getElementById('statusText');
        if (statusText) statusText.textContent = '';
        
        // 显示成功消息
        showMessage('录音已取消，音频文件已删除', 'success');
        
    } catch (error) {
        console.error('取消录音时出错:', error);
        showMessage('取消录音失败，请重试', 'error');
    }
}

// 提交回答：携带语音占位与文件URL
async function submitAnswer() {
    if (!currentQuestion) return;
    const payload = {
        question_id: currentQuestion.id,
        answer_text: lastSummaryText || lastTranscriptText || '（语音回答）',
        voice_file: 'WAV 容器格式 + 16 位有符号小端 PCM 编码 + 单声道 + 16000Hz',
        voice_file_url: lastVoiceFileUrl || '',
        voice_format: 'wav'
    };
    try {
        const json = await apiPost('/api/answers', payload);
        if (json.code === 200) {
            pushMomNotification({
                id: `ans_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                type: 'answer',
                unread: true,
                question_id: currentQuestion.id,
                question_title: currentQuestion.title || '',
                answer_excerpt: (payload.answer_text || '').slice(0, 80),
                create_time: new Date().toISOString()
            });
            document.getElementById('successOverlay').classList.add('visible');
            setTimeout(() => {
                document.getElementById('successOverlay').classList.remove('visible');
                navigateTo('page-home');
            }, 1500);
        } else {
            throw new Error(json.message || '提交失败');
        }
    } catch(e) {
        alert('提交失败：' + e.message);
    }
}

// --- 初始化和事件绑定 ---
function initializeApp() {
    // 绑定所有静态按钮的事件
    onboardingBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            updateOnboardingUI();
        } else {
            navigateTo('page-expertise');
        }
    });
    
    // 底部导航切换
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.page;
            if (target) navigateTo(target);
        });
    });

    // 荣誉墙标签切换
    const btnBadges = document.getElementById('btn-badges');
    const btnLetters = document.getElementById('btn-letters');
    if (btnBadges) btnBadges.addEventListener('click', () => showHonorTab('badges'));
    if (btnLetters) btnLetters.addEventListener('click', () => showHonorTab('letters'));

    const recordBtn = document.getElementById('recordBtn');
    const submitBtn = document.getElementById('submitBtn');

    recordBtn.addEventListener('click', () => {
        if (recordingState === 'idle' || recordingState === 'finished') startRecording();
        else if (recordingState === 'recording') stopRecording();
    });

    submitBtn.addEventListener('click', submitAnswer);

    // 绑定取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelRecording);
    }

    const askRecordBtn = document.getElementById('askRecordBtn');
    if (askRecordBtn) {
        askRecordBtn.addEventListener('click', () => {
            if (askRecordingState === 'idle') startAskRecording();
            else if (askRecordingState === 'recording') stopAskRecording();
        });
    }

    const askCancelBtn = document.getElementById('askCancelBtn');
    if (askCancelBtn) {
        askCancelBtn.addEventListener('click', async () => {
            if (typeof cleanupVoiceFiles === 'function') await cleanupVoiceFiles();
            resetAskVoiceUI();
        });
    }

    const askSubmitBtn = document.getElementById('askSubmitBtn');
    if (askSubmitBtn) {
        askSubmitBtn.addEventListener('click', submitAskByVoice);
    }

    const phoneInput = document.getElementById('phoneInput');
    const loginBtn = document.getElementById('loginBtn');
    phoneInput.addEventListener('input', () => {
        loginBtn.disabled = !(phoneInput.value.length === 11 && /^\d{11}$/.test(phoneInput.value));
    });
    loginBtn.addEventListener('click', () => {
        if(!loginBtn.disabled) navigateTo('page-onboarding');
    });
    
    // 初始化页面
    setupOnboarding();
    setupExpertiseSelection();
    navigateTo('page-splash');
    setTimeout(() => { navigateTo('page-login'); }, 1500);
}

// 退出登录功能
function handleLogout() {
    try {
        // 清除本地存储的用户数据
        localStorage.removeItem('userProfile');
        localStorage.removeItem('selectedExpertiseTags');
        localStorage.removeItem('questionsData');
        localStorage.removeItem('thankLettersData');
        localStorage.removeItem('honorBadges');
        
        // 清除全局变量
        questionsData = [];
        questionsLoaded = false;
        thankLettersData = [];
        thankLettersLoaded = false;
        selectedExpertiseTags = [];
        
        // 显示退出成功提示
        showToast('已退出登录');
        
        // 延迟跳转到用户类型选择页面
        setTimeout(() => {
            window.location.href = 'splash_screen.html';
        }, 1000);
        
    } catch (error) {
        console.error('退出登录失败:', error);
        showToast('退出登录失败，请重试');
    }
}

// Toast 提示功能
function showToast(message) {
    // 创建或获取toast元素
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
        
        // 添加toast样式
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0,0,0,0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.5s, top 0.5s;
            }
            .toast.show {
                opacity: 1;
                top: 40px;
            }
        `;
        document.head.appendChild(style);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    // 3秒后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initializeApp);

// 加载感谢信数据
async function loadThankLetters() {
    // 如果数据已经加载过，直接返回现有数据
    if (thankLettersLoaded && thankLettersData.length > 0) {
        console.log('Using cached thank letters data');
        return;
    }
    
    try {
        console.log('Fetching thank letters from:', `${API_BASE}/api/thank-letters`);
        const json = await apiGet('/api/thank-letters');
        console.log('Thank letters API response:', json);
        
        if (json.code === 200 && Array.isArray(json.data)) {
            thankLettersData = json.data;
            thankLettersLoaded = true; // 标记数据已加载
            renderThankLetters();
        } else {
            throw new Error(json.message || '加载感谢信失败');
        }
    } catch (e) {
        console.error('loadThankLetters error:', e);
        thankLettersData = [];
        thankLettersLoaded = false;
        // 显示错误状态
        const lettersList = document.querySelector('.letter-list');
        if (lettersList) {
            lettersList.innerHTML = `
                <div class="letter-card">
                    <p class="letter-text">加载感谢信失败，请稍后重试</p>
                    <p class="letter-info">—</p>
                    <p class="letter-question">—</p>
                </div>
            `;
        }
    }
}

// 渲染感谢信列表
function renderThankLetters() {
    const lettersList = document.querySelector('.letter-list');
    if (!lettersList) return;
    
    if (!thankLettersData || thankLettersData.length === 0) {
        lettersList.innerHTML = `
            <div class="letter-card">
                <p class="letter-text">暂无感谢信</p>
                <p class="letter-info">—</p>
                <p class="letter-question">—</p>
            </div>
        `;
        return;
    }
    
    const html = thankLettersData.map(letter => {
        // 截取内容前50个字符作为预览
        const previewText = letter.content.length > 50 
            ? letter.content.substring(0, 50) + '...' 
            : letter.content;
        
        return `
            <div class="letter-card" onclick="showLetterDetail(${letter.id})">
                <p class="letter-text">${previewText}</p>
                <p class="letter-info">来自 ${letter.sender_name}（${letter.sender_relation}）</p>
                <p class="letter-question">感谢专家：${letter.recipient_expert} · ${letter.help_category}</p>
            </div>
        `;
    }).join('');
    
    lettersList.innerHTML = html;
}
