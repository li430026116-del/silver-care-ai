// --- 录音功能 ---
let mediaRecorder = null;
let audioChunks = [];
let recordingCancelled = false; // 标记录音是否被取消

// 清理未确认的音频文件
async function cleanupVoiceFiles() {
    try {
        const response = await fetch('/api/voice/cleanup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        if (result.code === 200) {
            console.log('音频文件清理完成:', result.message);
            return result.data;
        } else {
            console.error('音频文件清理失败:', result.message);
        }
    } catch (error) {
        console.error('清理音频文件时发生错误:', error);
    }
    return null;
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
        };

        mediaRecorder.onstop = async () => {
            console.log('录音结束');
            recordingState = 'stopped';
            updateRecordingUI('stopped');
            
            // 创建音频blob，使用实际的MIME类型
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            console.log('音频文件大小:', audioBlob.size, 'bytes');
            console.log('音频文件类型:', audioBlob.type);
            
            // 显示加载状态
            document.getElementById('summaryWrapper').classList.add('visible');
            document.getElementById('aiLoading').style.display = 'block';
            document.getElementById('aiResults').style.display = 'none';
            
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
    const formData = new FormData();
    
    // 如果不是WAV格式，需要转换
    let finalBlob = audioBlob;
    if (!audioBlob.type.includes('wav')) {
        console.log('转换音频格式到WAV...');
        finalBlob = await convertToWav(audioBlob);
    }
    
    formData.append('file', finalBlob, 'recording.wav'); // 修改字段名为 'file'
    
    try {
        const json = await apiUpload('/api/voice/upload_transcribe_summarize', formData); // 修改API端点
        if (json.code === 200) {
            lastVoiceFileUrl = json.data.file_url;
            lastTranscriptText = json.data.transcript || '';
            lastSummaryText = json.data.summary || '';
            
            // 直接显示结果，不需要额外的API调用
            document.getElementById('summaryWrapper').classList.add('visible');
            document.getElementById('aiLoading').style.display = 'none';
            document.getElementById('aiResults').style.display = 'block';
            
            const originalEl = document.querySelector('.original-text');
            const suggestionsEl = document.querySelector('.refined-suggestions');
            
            if (originalEl) originalEl.textContent = lastTranscriptText;
            if (suggestionsEl) {
                suggestionsEl.innerHTML = `<p>${lastSummaryText}</p>`;
            }
            
            // 重置录音状态
            recordingState = 'idle';
            updateRecordingUI('idle');
        } else {
            throw new Error(json.message || '上传失败');
        }
    } catch (error) {
        console.error('语音上传错误:', error);
        
        // 显示错误状态
        document.getElementById('summaryWrapper').classList.add('visible');
        document.getElementById('aiLoading').style.display = 'none';
        document.getElementById('aiResults').style.display = 'block';
        
        const originalEl = document.querySelector('.original-text');
        const suggestionsEl = document.querySelector('.refined-suggestions');
        
        if (originalEl) originalEl.textContent = '语音处理失败，请重新录制';
        if (suggestionsEl) suggestionsEl.innerHTML = '<p>无法生成优化建议，请检查网络连接或重新录制</p>';
        
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
    
    document.getElementById('summaryWrapper').classList.add('visible');
    document.getElementById('aiLoading').style.display = 'block';
    document.getElementById('aiResults').style.display = 'none';
    
    try {
        // 语音转文字
        const transcriptRes = await apiPost('/api/voice/transcript', { 
            file_url: lastVoiceFileUrl 
        });
        
        if (transcriptRes.code === 200) {
            lastTranscriptText = transcriptRes.data.text || '';
            
            // AI 优化建议
            const summaryRes = await apiPost('/api/voice/summary', { 
                text: lastTranscriptText 
            });
            
            if (summaryRes.code === 200) {
                lastSummaryText = summaryRes.data.summary || '';
                
                // 显示结果
                document.getElementById('aiLoading').style.display = 'none';
                document.getElementById('aiResults').style.display = 'block';
                
                const originalEl = document.querySelector('.original-text');
                const suggestionsEl = document.querySelector('.refined-suggestions');
                
                if (originalEl) originalEl.textContent = lastTranscriptText;
                if (suggestionsEl) {
                    suggestionsEl.innerHTML = `<p>${lastSummaryText}</p>`;
                }
            } else {
                throw new Error(summaryRes.message || 'AI处理失败');
            }
        } else {
            throw new Error(transcriptRes.message || '语音识别失败');
        }
    } catch (error) {
        document.getElementById('aiLoading').style.display = 'none';
        document.getElementById('aiResults').style.display = 'block';
        
        const originalEl = document.querySelector('.original-text');
        const suggestionsEl = document.querySelector('.refined-suggestions');
        
        if (originalEl) originalEl.textContent = '语音处理失败，请重新录制';
        if (suggestionsEl) suggestionsEl.innerHTML = '<p>无法生成优化建议</p>';
    }
}