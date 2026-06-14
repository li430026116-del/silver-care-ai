// --- 录音功能 ---
let mediaRecorder = null;
let audioChunks = [];
let recordingCancelled = false; // 标记录音是否被取消
let voiceSpeechRecognition = null;
let lastTranscriptInterim = '';

// --- DeepSeek API（按你的要求：直接写在代码里） ---
// 注意：把 Key 写在前端代码里会暴露给所有用户，仅适合本地/演示环境。
const DEEPSEEK_API_KEY = "sk-3c47abd4c5294afb8c5e819e7042c5a0";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

async function getDeepseekSummary(textToSummarize) {
    const input = (textToSummarize || '').trim();
    if (!input) throw new Error('转写文本为空，无法总结');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const payload = {
            model: DEEPSEEK_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "你是一个专业的育儿文案助手。你的任务是：1. 针对老年人分享的育儿观念，从冗长、重复的表达中提炼核心信息。2. 仔细审核这些观念，删除不符合现代科学育儿理念、过于传统或不切实际的内容。3. 保留合理、有价值的部分。4. 将最终总结以亲和、易懂、如同长辈口吻的方式重新组织，并确保其符合现代育儿观念。如果是大段文字，请确保每行不超过80个字符，并自动换行。"
                },
                { role: "user", content: input }
            ],
            stream: false
        };

        const resp = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        const text = await resp.text();
        if (!resp.ok) {
            throw new Error(`DeepSeek请求失败：HTTP ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`);
        }

        let json;
        try {
            json = JSON.parse(text);
        } catch {
            throw new Error(`DeepSeek返回不是JSON：${text.slice(0, 300)}`);
        }

        const summary = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
            ? String(json.choices[0].message.content).trim()
            : '';

        if (!summary) throw new Error('DeepSeek未返回总结内容');
        return summary;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function getDeepseekElderQuestion(textToSummarize) {
    const input = (textToSummarize || '').trim();
    if (!input) throw new Error('转写文本为空，无法整理问题');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const payload = {
            model: DEEPSEEK_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "你是一个养老健康问答助手。你的任务是把用户口述的内容整理成一个明确、简短、可发布的提问。要求：1) 只输出一个中文问题句；2) 不要给建议或回答；3) 不提育儿/宝宝/新生儿等词；4) 句子尽量不超过30字；5) 必须以“？”结尾。"
                },
                { role: "user", content: input }
            ],
            stream: false
        };

        const resp = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        const text = await resp.text();
        if (!resp.ok) {
            throw new Error(`DeepSeek请求失败：HTTP ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`);
        }

        let json;
        try {
            json = JSON.parse(text);
        } catch {
            throw new Error(`DeepSeek返回不是JSON：${text.slice(0, 300)}`);
        }

        const question = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
            ? String(json.choices[0].message.content).trim()
            : '';

        if (!question) throw new Error('DeepSeek未返回问题内容');
        return question;
    } finally {
        clearTimeout(timeoutId);
    }
}

// 提供给其它脚本（如 main.js 的“语音提问”流程）复用
window.NuanyaDeepseek = window.NuanyaDeepseek || {};
window.NuanyaDeepseek.summarize = getDeepseekSummary;
window.NuanyaDeepseek.summarizeElderQuestion = getDeepseekElderQuestion;

function getAnswerAiElements() {
    const wrapper = document.getElementById('summaryWrapper');
    return {
        wrapper,
        loading: document.getElementById('aiLoading'),
        results: document.getElementById('aiResults'),
        original: wrapper ? wrapper.querySelector('.original-text') : null,
        refined: wrapper ? wrapper.querySelector('.refined-suggestions') : null,
        uploadProgress: document.getElementById('uploadProgress'),
        uploadProgressBar: document.getElementById('uploadProgressBar'),
        uploadProgressText: document.getElementById('uploadProgressText')
    };
}

if ('webkitSpeechRecognition' in window) {
    voiceSpeechRecognition = new webkitSpeechRecognition();
    voiceSpeechRecognition.continuous = true;
    voiceSpeechRecognition.interimResults = true;
    voiceSpeechRecognition.lang = 'zh-CN';
    voiceSpeechRecognition.onresult = function(event) {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                lastTranscriptText += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        lastTranscriptInterim = interimTranscript;
        const { original: originalEl } = getAnswerAiElements();
        if (originalEl) originalEl.textContent = lastTranscriptText + interimTranscript;
    };
}

// 清理未确认的音频文件
async function cleanupVoiceFiles() {
    console.log('Mock: 音频文件清理完成');
    return { success: true };
}

async function startRecording() {
    try {
        recordingCancelled = false; // 重置取消标记
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        // 尝试使用WAV格式，如果不支持则使用webm
        let mimeType = 'audio/wav';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm;codecs=opus';
        }
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstart = () => {
            console.log('录音开始，格式:', mimeType);
            recordingState = 'recording';
            updateRecordingUI('recording');
            startTimer();
            if (voiceSpeechRecognition) {
                lastTranscriptText = '';
                try { voiceSpeechRecognition.start(); } catch(e) {}
            }
        };

        mediaRecorder.onstop = async () => {
            console.log('录音结束');
            recordingState = 'stopped';
            updateRecordingUI('stopped');
            if (voiceSpeechRecognition) {
                try { voiceSpeechRecognition.stop(); } catch(e) {}
            }

            // 合并 final + interim，避免用户说得短导致没有 final 结果
            const mergedTranscript = `${lastTranscriptText || ''}${lastTranscriptInterim || ''}`.trim();
            if (mergedTranscript) {
                lastTranscriptText = mergedTranscript;
                lastTranscriptInterim = '';
            }
            
            // 创建音频blob，使用实际的MIME类型
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            console.log('音频文件大小:', audioBlob.size, 'bytes');
            console.log('音频文件类型:', audioBlob.type);
            
            const ui = getAnswerAiElements();
            if (ui.wrapper) ui.wrapper.classList.add('visible');
            if (ui.loading) ui.loading.style.display = 'block';
            if (ui.results) ui.results.style.display = 'none';
            if (ui.uploadProgress) ui.uploadProgress.style.display = 'none';
            if (ui.uploadProgressText) ui.uploadProgressText.style.display = 'none';
            if (ui.uploadProgressBar) ui.uploadProgressBar.style.width = '0%';
            
            await uploadVoiceFile(audioBlob);
        };
        
        mediaRecorder.start();
    } catch (error) {
        console.error('无法访问麦克风:', error);
        alert('无法访问麦克风，请检查权限设置');
    }
}

function stopRecording() {
    if (mediaRecorder && recordingState === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        stopTimer();
        // UI更新将在onstop事件中处理
    }
}

function updateRecordingUI(state) {
    const recordBtn = document.getElementById('recordBtn');
    const statusText = document.getElementById('statusText');
    const instructions = document.getElementById('instructions');
    const recordingProgress = document.getElementById('recordingProgress');
    const progressFill = document.getElementById('progressFill');
    const recordingTimer = document.getElementById('recordingTimer');
    
    if (state === 'idle') {
        recordBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
        recordBtn.className = 'record-button idle';
        recordBtn.classList.remove('recording');
        statusText.textContent = '';
        instructions.textContent = '点击按钮，开始分享您的经验';
        recordingProgress.style.display = 'none';
        progressFill.style.width = '0%';
        recordingTimer.textContent = '00:00';
    } else if (state === 'recording') {
        recordBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12"></rect></svg>';
        recordBtn.className = 'record-button recording';
        recordBtn.classList.add('recording');
        statusText.textContent = '正在录音中...';
        instructions.textContent = '再次点击按钮停止录音';
        recordingProgress.style.display = 'block';
    } else if (state === 'stopped') {
        recordBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
        recordBtn.className = 'record-button idle';
        recordBtn.classList.remove('recording');
        statusText.textContent = '录音已完成，正在处理...';
        instructions.textContent = '正在上传和处理您的语音';
        recordingProgress.style.display = 'none';
    }
}

function startTimer() {
    const recordingTimer = document.getElementById('recordingTimer');
    const progressFill = document.getElementById('progressFill');
    const maxDuration = 120; // 最大录音时长2分钟
    
    seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        if (recordingTimer) {
            recordingTimer.textContent = timeString;
        }
        
        // 更新进度条（基于最大录音时长）
        if (progressFill) {
            const progress = Math.min((seconds / maxDuration) * 100, 100);
            progressFill.style.width = `${progress}%`;
        }
        
        // 如果达到最大录音时长，自动停止
        if (seconds >= maxDuration) {
            stopRecording();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

async function uploadVoiceFile(audioBlob) {
    try {
        const ui = getAnswerAiElements();
        if (ui.uploadProgress) ui.uploadProgress.style.display = 'block';
        if (ui.uploadProgressText) {
            ui.uploadProgressText.style.display = 'block';
            ui.uploadProgressText.textContent = '0%';
        }

        // 1) 先转文字并展示
        const transcript = (lastTranscriptText || '').trim();
        if (!transcript) {
            throw new Error('未识别到语音内容（可能声音过小、语速过快或环境噪音较大）');
        }

        if (ui.wrapper) ui.wrapper.classList.add('visible');
        if (ui.loading) ui.loading.style.display = 'none';
        if (ui.results) ui.results.style.display = 'block';
        if (ui.uploadProgress) ui.uploadProgress.style.display = 'none';
        if (ui.uploadProgressText) ui.uploadProgressText.style.display = 'none';

        const originalEl = ui.original;
        const suggestionsEl = ui.refined;
        if (originalEl) originalEl.textContent = transcript;

        // 2) 再分析解答内容
        const summary = await getDeepseekSummary(transcript);
        lastSummaryText = summary || '';
        if (!lastSummaryText) throw new Error('未获取到AI总结内容');

        if (suggestionsEl) {
            if (window.ExperienceAnalyzer) {
                await window.ExperienceAnalyzer.renderInto(suggestionsEl, transcript, '育儿/健康经验');
            } else {
                suggestionsEl.innerHTML = `<p>${lastSummaryText}</p>`;
            }
        }

        // 3) 最后上传音频（失败不影响前面的转写和分析展示）
        let finalBlob = audioBlob;
        if (!audioBlob.type.includes('wav')) {
            finalBlob = await convertToWav(audioBlob);
        }
        try {
            if (window.NuanyaVoice && typeof window.NuanyaVoice.uploadWithProgress === 'function') {
                const up = await window.NuanyaVoice.uploadWithProgress('/api/voice/upload_transcribe_summarize', finalBlob, (loaded, total) => {
                    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
                    if (ui.uploadProgressBar) ui.uploadProgressBar.style.width = `${percent}%`;
                    if (ui.uploadProgressText) ui.uploadProgressText.textContent = `${percent}%`;
                });
                if (up && up.code === 200) lastVoiceFileUrl = up.data.file_url || '';
            } else {
                const formData = new FormData();
                formData.append('file', finalBlob, 'recording.wav');
                const up = await apiUpload('/api/voice/upload_transcribe_summarize', formData);
                if (up && up.code === 200) lastVoiceFileUrl = up.data.file_url || '';
            }
        } catch (e) {
            console.warn('语音上传失败（不影响转写/分析展示）:', e);
        }

        recordingState = 'idle';
        updateRecordingUI('idle');
    } catch (error) {
        console.error('语音上传错误:', error);
        const ui = getAnswerAiElements();
        
        if (ui.wrapper) ui.wrapper.classList.add('visible');
        if (ui.loading) ui.loading.style.display = 'none';
        if (ui.results) ui.results.style.display = 'block';
        if (ui.uploadProgress) ui.uploadProgress.style.display = 'none';
        if (ui.uploadProgressText) ui.uploadProgressText.style.display = 'none';
        
        const originalEl = ui.original;
        const suggestionsEl = ui.refined;
        
        if (originalEl) originalEl.textContent = '语音处理失败，请重新录制';
        if (suggestionsEl) {
            const msg = (error && error.message) ? error.message : '请检查网络连接或重新录制';
            if (msg.includes('未识别到语音')) {
                suggestionsEl.innerHTML = `<p>${msg}</p><p>建议：靠近麦克风、提高音量、减少环境噪音后重试。</p>`;
            } else {
                suggestionsEl.innerHTML = `<p>无法生成优化建议：${msg}</p>`;
            }
        }
        
        // 重置录音状态
        recordingState = 'idle';
        updateRecordingUI('idle');
    }
}

// 音频格式转换函数
async function convertToWav(audioBlob) {
    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const fileReader = new FileReader();
        
        fileReader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                // 转换为16kHz单声道
                const sampleRate = 16000;
                const numberOfChannels = 1;
                const length = audioBuffer.duration * sampleRate;
                const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);
                
                const source = offlineContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(offlineContext.destination);
                source.start();
                
                const renderedBuffer = await offlineContext.startRendering();
                const wavBlob = audioBufferToWav(renderedBuffer);
                resolve(wavBlob);
            } catch (error) {
                console.error('音频转换失败:', error);
                // 如果转换失败，返回原始blob
                resolve(audioBlob);
            }
        };
        
        fileReader.onerror = () => reject(new Error('文件读取失败'));
        fileReader.readAsArrayBuffer(audioBlob);
    });
}

// 将AudioBuffer转换为WAV格式的Blob
function audioBufferToWav(buffer) {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV文件头
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // 写入音频数据
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function processVoiceTranscription() {
    if (!lastVoiceFileUrl) return;
    
    const ui = getAnswerAiElements();
    if (ui.wrapper) ui.wrapper.classList.add('visible');
    if (ui.loading) ui.loading.style.display = 'block';
    if (ui.results) ui.results.style.display = 'none';
    
    try {
        // 语音转文字
        const transcriptRes = await apiPost('/api/voice/transcript', { 
            file_url: lastVoiceFileUrl 
        });
        
        if (transcriptRes.code === 200) {
            lastTranscriptText = transcriptRes.data.text || '';
            
            // AI 精炼（改为直连 DeepSeek）
            lastSummaryText = await getDeepseekSummary(lastTranscriptText);
            if (!lastSummaryText) throw new Error('未获取到AI总结内容');

            if (ui.loading) ui.loading.style.display = 'none';
            if (ui.results) ui.results.style.display = 'block';

            const originalEl = ui.original;
            const suggestionsEl = ui.refined;

            if (originalEl) originalEl.textContent = lastTranscriptText;
            if (suggestionsEl) suggestionsEl.innerHTML = `<p>${lastSummaryText}</p>`;
        } else {
            throw new Error(transcriptRes.message || '语音识别失败');
        }
    } catch (error) {
        if (ui.loading) ui.loading.style.display = 'none';
        if (ui.results) ui.results.style.display = 'block';
        
        const originalEl = ui.original;
        const suggestionsEl = ui.refined;
        
        if (originalEl) originalEl.textContent = '语音处理失败，请重新录制';
        if (suggestionsEl) suggestionsEl.innerHTML = `<p>无法生成优化建议：${(error && error.message) ? error.message : '请检查网络连接或重新录制'}</p>`;
    }
}
