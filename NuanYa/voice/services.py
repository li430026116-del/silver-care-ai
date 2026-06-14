# coding=utf-8
import base64
import json
# -------- DeepSeek API 调用（简单HTTP请求方式） --------
import os
import random
import time
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import requests

# 环境变量加载（可选）
try:
    from dotenv import load_dotenv  # 需要安装 python-dotenv

    load_dotenv()
except Exception:
    pass

# DeepSeek API - AI对话
DEEPSEEK_API_KEY = "sk-3c47abd4c5294afb8c5e819e7042c5a0"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


def summarize_text_with_deepseek(
    text_to_summarize: str,
    *,
    temperature: float = 0.1,
    max_tokens: int = 100,
    timeout: int = 60,
    system_prompt: str | None = None,
    truncate_chars: int = 4000,
) -> str:
    """
    使用 DeepSeek API 对文本进行总结。

    使用简单的HTTP请求方式调用DeepSeek API，不依赖OpenAI客户端。
    """

    if not text_to_summarize or not text_to_summarize.strip():
        return "错误：输入内容为空，无法进行总结。"

    # 检查API Key
    if not DEEPSEEK_API_KEY:
        return "请求 DeepSeek API 失败：缺少 DEEPSEEK_API_KEY（请在环境变量中设置）"

    # 针对老人话语与育儿场景的总结提示词（可根据需要微调）
    default_prompt = (
        "【严格指令】你是一个文本提炼工具，不是创作助手！\n\n"
        "任务要求：\n"
        "1. 首先判断文本内容是否合适：\n"
        "   - 合适：内容健康、符合现代育儿理念、表达清晰\n"
        "   - 不合适：包含暴力、歧视、不科学观念、表达混乱等\n"
        "2. 如果内容合适：直接返回原文本，不要做任何修改\n"
        "3. 如果内容不合适：进行最小化改写，只修正问题部分\n"
        "4. 使用第一人称（我、我们），保持老人原话风格\n\n"
        "5. 绝对不要添加任何额外内容（不要'您说得对'、'真是说到根子上了'等附和语）\n"
        "6. 如果输入已经很简洁，直接返回原话或稍作整理\n"
        "7. 返回时直接返回处理后的最终简单文本，不要返回分析（例如健康性/表达是否混乱这种分析）"
        "8. 关于医疗指导需要拦截并生成对老人的温和反馈"
        "输出格式：直接输出提炼后的文本，不要任何解释和标记\n\n"
        "示例：\n"
        "输入：'咱们带娃这么多年，其实没太多高深道理，核心就俩字——上心。心里要装着孩子，眼睛要看着孩子，行动要跟着孩子。孩子哭闹不是故意捣蛋，是他们还不会好好表达，更需要我们用心去理解、去引导。'\n"
        "输出：'我们带娃的核心就是上心，心里装孩子，眼睛看孩子，行动跟孩子。孩子哭闹不会表达，需要我们理解和引导。'\n\n"
        "现在请严格按以上要求处理："
    )
    system_prompt = system_prompt or default_prompt

    # 避免输入过长导致超时：按字符数截断
    if (
        isinstance(text_to_summarize, str)
        and truncate_chars
        and len(text_to_summarize) > truncate_chars
    ):
        text_to_summarize = text_to_summarize[:truncate_chars]

    # 构造请求头
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
    }

    # 构造请求体
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text_to_summarize},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    # 简单的瞬时错误判断（网关超时/限流等）
    def is_transient_error(err: Exception) -> bool:
        s = str(err).lower()
        return (
            "504" in s
            or "gateway time-out" in s
            or "timeout" in s
            or "429" in s
            or "too many requests" in s
            or "rate limit" in s
            or "饱和" in s
        )

    attempts = 4
    delay = 0.8  # 初始延迟（秒）

    for i in range(attempts):
        try:
            # 使用requests发送HTTP请求
            response = requests.post(
                DEEPSEEK_API_URL,
                headers=headers,
                data=json.dumps(payload),
                timeout=timeout,
            )
            if response.status_code in (401, 403):
                return "请求 DeepSeek API 失败：鉴权失败，请检查 DEEPSEEK_API_KEY 是否正确。"
            response.raise_for_status()

            # 解析响应
            result = response.json()
            summary_content = result["choices"][0]["message"]["content"]
            return summary_content or "API返回空内容"

        except Exception as e:
            if i < attempts - 1 and is_transient_error(e):
                # 退避重试（指数退避 + 抖动）
                time.sleep(delay + random.uniform(0, 0.5))
                delay *= 2
                continue
            # 非瞬时错误或已用尽重试：返回更友好的提示
            msg = str(e)
            if "504" in msg or "Gateway Time-out" in msg:
                return "请求 DeepSeek API 失败：模型接口超时或暂时不可用，请稍后重试。"
            if "401" in msg or "403" in msg or "authentication" in msg.lower():
                return "请求 DeepSeek API 失败：鉴权失败，请检查 DEEPSEEK_API_KEY 是否正确。"
            return f"请求 DeepSeek API 失败：{e}"


# -------- 百度语音识别（保持原有密钥读取方式：常量） --------
# 注意：以下密钥读取方式与原 newApi.py 保持一致（直接常量）。
API_KEY = "NMq0hW4OGJxTJuvXlRYNOjhK"
SECRET_KEY = "JPPaZ5urWjSoRLvlQXu5p7uHYAHNAE1r"

ASR_URL = "http://vop.baidu.com/server_api"
TOKEN_URL = "http://openapi.baidu.com/oauth/2.0/token"


def fetch_token() -> str:
    params = {
        "grant_type": "client_credentials",
        "client_id": API_KEY,
        "client_secret": SECRET_KEY,
    }
    post_data = urlencode(params).encode("utf-8")
    req = Request(TOKEN_URL, post_data)
    try:
        f = urlopen(req, timeout=5)
        result_str = f.read().decode()
    except URLError as err:
        return f"token http response http code : {getattr(err, 'code', '')}"

    result = json.loads(result_str)
    if "access_token" in result.keys() and "scope" in result.keys():
        if "audio_voice_assistant_get" not in result["scope"].split(" "):
            return "请确保已开通【语音识别】服务（不是文本转语音）"
        return result["access_token"]
    else:
        return "请检查API_KEY和SECRET_KEY是否正确"


def load_audio_file(file_path: str):
    with open(file_path, "rb") as f:
        data = f.read()
    audio_base64 = base64.b64encode(data).decode("utf-8")
    audio_len = len(data)
    return audio_base64, audio_len


def transcribe_audio_wav_16000_mono(file_path: str):
    token = fetch_token()
    # 如果返回的是错误提示，直接返回
    if not token or len(token) < 20:  # 粗略判断
        return {"success": False, "error": token}

    audio_data, audio_len = load_audio_file(file_path)
    params = {
        "format": "wav",
        "rate": 16000,
        "channel": 1,
        "cuid": "quickstart",
        "token": token,
        "speech": audio_data,
        "len": audio_len,
    }

    post_data = json.dumps(params).encode("utf-8")
    req = Request(ASR_URL, post_data)
    req.add_header("Content-Type", "application/json")

    try:
        f = urlopen(req)
        result_str = f.read().decode()
        result = json.loads(result_str)
        if result.get("err_no") == 0:
            texts = result.get("result", [])
            return {"success": True, "result": texts}
        else:
            return {
                "success": False,
                "error": f"{result.get('err_msg')} (错误码: {result.get('err_no')})",
            }
    except URLError as err:
        try:
            result_str = err.read().decode()
        except Exception:
            result_str = ""
        return {
            "success": False,
            "error": f"http请求错误: {getattr(err, 'code', '')} {result_str}",
        }
