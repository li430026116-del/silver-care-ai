/**
 * Nuanya Voice Uploader Module
 *
 * 提供：
 * - WAV 编码（PCM16/Mono/16kHz）
 * - WAV 头格式校验（RIFF/WAVE/PCM16/单声道/16kHz）
 * - 通过 XMLHttpRequest 的 multipart/form-data 上传，带上传进度回调
 * - 统一错误处理与可复用的工具函数
 *
 * 使用方式：
 * 1) 在 HTML 中通过 <script type="module" src="./js/voiceUploader.js"></script> 引入
 * 2) 该模块会在 window.NuanyaVoice 上暴露 API，供页面脚本调用
 */

/**
 * 将 Float32Array 数组编码为 WAV Blob（PCM16/Mono/16kHz）。
 * @param {Float32Array[]} buffers - WebAudio 收集的单声道音频片段
 * @param {number} targetSampleRate - 目标采样率（默认 16000）
 * @returns {Blob} - WAV Blob（audio/wav）
 */
export function buildWavBlobFromFloat32(buffers, targetSampleRate = 16000) {
  // 合并所有 Float32Array
  let totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  let merged = new Float32Array(totalLength);
  let offset = 0;
  for (const b of buffers) { merged.set(b, offset); offset += b.length; }

  // 输入采样率：由外层传入或通过 AudioContext 保证；此处仅进行最简单的抽样降采样
  // 为便于复用，此函数假定外层传入的 buffers 来源于固定采样率的 AudioContext
  const inputSampleRate = 44100; // 若需要适配更多采样率，请在外层传入并修改降采样逻辑
  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.floor(merged.length / ratio);
  const downsampled = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    downsampled[i] = merged[Math.floor(i * ratio)] || 0;
  }

  // 写入 WAV 头（PCM16/Mono）
  const buffer = new ArrayBuffer(44 + downsampled.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + downsampled.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true);  // PCM 格式
  view.setUint16(22, 1, true);  // 单声道
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true); // 字节率 = 采样率 * 通道数 * 每样本字节数
  view.setUint16(32, 2, true);  // block align
  view.setUint16(34, 16, true); // 位深 16
  writeString(view, 36, 'data');
  view.setUint32(40, downsampled.length * 2, true);

  floatTo16BitPCM(view, 44, downsampled);
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * 从 WAV Blob 解析并校验 WAV 头，确保满足：RIFF/WAVE，PCM(1)，单声道，16kHz，位深16。
 * @param {Blob} blob - 需要校验的 WAV Blob
 * @returns {{ok:boolean, reason?:string, meta?:{sampleRate:number, channels:number, bitDepth:number}}}
 */
export async function validateWavBlob(blob) {
  try {
    const header = await blob.slice(0, 44).arrayBuffer();
    const view = new DataView(header);

    const riff = readString(view, 0, 4);
    const wave = readString(view, 8, 4);
    const fmt  = readString(view, 12, 4);
    const audioFormat = view.getUint16(20, true);
    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitDepth = view.getUint16(34, true);

    if (riff !== 'RIFF' || wave !== 'WAVE' || fmt !== 'fmt ') {
      return { ok: false, reason: '文件头不是有效的 WAV（RIFF/WAVE/fmt）' };
    }
    if (audioFormat !== 1) {
      return { ok: false, reason: '非 PCM 编码，当前仅支持 PCM16' };
    }
    if (channels !== 1) {
      return { ok: false, reason: '必须为单声道（channels=1）' };
    }
    if (sampleRate !== 16000) {
      return { ok: false, reason: '采样率必须为 16000Hz' };
    }
    if (bitDepth !== 16) {
      return { ok: false, reason: '位深必须为 16-bit' };
    }
    return { ok: true, meta: { sampleRate, channels, bitDepth } };
  } catch (e) {
    return { ok: false, reason: `解析 WAV 头失败：${e.message}` };
  }
}

/**
 * 带上传进度的 multipart/form-data 提交（字段名固定为 file）。
 * 注意：后端仅接受完整文件，不支持断点续传或分片重组。
 * 我们使用 xhr.upload.onprogress 展示分块式进度。
 *
 * @param {string} url - 上传接口，如 `${location.origin}/api/voice/upload_transcribe_summarize`
 * @param {Blob} wavBlob - 要上传的 WAV Blob
 * @param {(loaded:number,total:number)=>void} onProgress - 进度回调
 * @returns {Promise<any>} - 解析后的 JSON 响应
 */
export function uploadWithProgress(url, wavBlob, onProgress) {
  return new Promise((resolve, reject) => {
    const endpoint = normalizeApiUrl(url);
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', wavBlob, 'recording.wav');

    xhr.open('POST', endpoint, true);
    xhr.responseType = 'json';
    xhr.timeout = 120000;

    xhr.upload.onprogress = (evt) => {
      if (typeof onProgress !== 'function') return;
      if (evt.lengthComputable) onProgress(evt.loaded, evt.total);
    };

    xhr.onload = () => {
      const response = xhr.response || safeParseJson(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
        return;
      }
      const msg = response && response.message ? response.message : `HTTP ${xhr.status}`;
      reject(new Error(msg));
    };

    xhr.onerror = () => reject(new Error('网络错误，上传失败'));
    xhr.ontimeout = () => reject(new Error('上传超时，请重试'));

    xhr.send(formData);
  });
}

// --- 内部工具函数 ---
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
function readString(view, offset, length) {
  let s = '';
  for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}
function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function normalizeApiUrl(url) {
  if (!url) return 'http://127.0.0.1:8000/api/voice/upload_transcribe_summarize';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (window.location && window.location.port === '8000') ? '' : 'http://127.0.0.1:8000';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

// 在浏览器环境下提供全局对象，方便旧页面脚本直接调用
if (typeof window !== 'undefined') {
  window.NuanyaVoice = {
    buildWavBlobFromFloat32,
    validateWavBlob,
    uploadWithProgress,
  };
}
