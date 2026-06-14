import glob
import os
import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import (summarize_text_with_deepseek,
                       transcribe_audio_wav_16000_mono)


class VoiceTranscribeView(APIView):
    """
    语音转文字：接收本地文件路径（WAV 16kHz/单声道/PCM16），调用百度ASR。
    请求JSON：{"audio_file_path": "E:/python/voice/test1.wav"}
    返回：{"code":200, "message":"识别成功", "data": {"result": ["文本..."]}}
    """

    def post(self, request):
        audio_file_path = request.data.get("audio_file_path")
        if not audio_file_path:
            return Response(
                {"code": 400, "message": "缺少 audio_file_path", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not os.path.isfile(audio_file_path):
            return Response(
                {"code": 400, "message": "音频文件不存在或路径无效", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = transcribe_audio_wav_16000_mono(audio_file_path)
        if result.get("success"):
            return Response(
                {
                    "code": 200,
                    "message": "识别成功",
                    "data": {"result": result.get("result")},
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "code": 500,
                    "message": "识别失败",
                    "data": {"error": result.get("error")},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VoiceSummarizeView(APIView):
    """
    AI总结：接收原文文本，调用 DeepSeek 生成总结。
    请求JSON：{"text": "需要总结的文本..."}
    返回：{"code":200, "message":"总结成功", "data": {"summary": "..."}}
    """

    def post(self, request):
        text = request.data.get("text", "")
        if not text or not str(text).strip():
            return Response(
                {"code": 400, "message": "缺少 text 或为空", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 允许可选调参：temperature/max_tokens/timeout/truncate_chars/system_prompt
        def clamp_float(v, lo, hi, default):
            try:
                f = float(v)
                return max(lo, min(hi, f))
            except Exception:
                return default

        def clamp_int(v, lo, hi, default):
            try:
                i = int(v)
                return max(lo, min(hi, i))
            except Exception:
                return default

        temperature = clamp_float(request.data.get("temperature"), 0.0, 1.0, 0.6)
        max_tokens = clamp_int(request.data.get("max_tokens"), 128, 2000, 600)
        timeout = clamp_int(request.data.get("timeout"), 10, 120, 60)
        truncate_chars = clamp_int(request.data.get("truncate_chars"), 500, 20000, 6000)
        system_prompt = request.data.get("system_prompt")

        summary = summarize_text_with_deepseek(
            text,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
            truncate_chars=truncate_chars,
            system_prompt=system_prompt,
        )
        if (
            summary.startswith("错误：")
            or summary.startswith("请求 DeepSeek API 失败")
            or summary.startswith("解析 API 响应失败")
        ):
            return Response(
                {"code": 500, "message": "总结失败", "data": {"error": summary}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {"code": 200, "message": "总结成功", "data": {"summary": summary}},
            status=status.HTTP_200_OK,
        )


class VoiceUploadTranscribeSummarizeView(APIView):
    """
    上传语音并自动处理：保存文件 -> 语音转文字 -> DeepSeek总结。
    - 接收 multipart/form-data：字段名 `file` （要求 WAV/16kHz/单声道/PCM16）
    - 返回：{"code":200, "message":"处理成功", "data": {"transcript": "...", "summary": "...", "file_url": "..."}}
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {
                    "code": 400,
                    "message": "缺少文件，请使用字段名 file 进行上传",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 简单校验扩展名
        original_name = upload.name
        ext = os.path.splitext(original_name)[1].lower()
        if ext != ".wav":
            return Response(
                {
                    "code": 400,
                    "message": "仅支持 WAV 格式，请先转换为 16kHz/单声道/PCM16",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 保存到 MEDIA_ROOT/voice/
        media_root = getattr(settings, "MEDIA_ROOT", None)
        if not media_root:
            return Response(
                {
                    "code": 500,
                    "message": "服务未配置媒体目录（MEDIA_ROOT）",
                    "data": None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        save_dir = os.path.join(media_root, "voice")
        os.makedirs(save_dir, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        save_path = os.path.join(save_dir, filename)

        try:
            with open(save_path, "wb") as f:
                for chunk in upload.chunks():
                    f.write(chunk)
        except Exception as e:
            return Response(
                {"code": 500, "message": f"保存文件失败：{e}", "data": None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 调用百度 ASR
        asr_result = transcribe_audio_wav_16000_mono(save_path)
        if not asr_result.get("success"):
            return Response(
                {
                    "code": 500,
                    "message": "语音识别失败",
                    "data": {"error": asr_result.get("error"), "file_path": save_path},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 拼接识别结果
        result_lines = asr_result.get("result") or []
        transcript_text = "\n".join([str(x) for x in result_lines if x])

        # DeepSeek 总结（支持调参透传）
        temperature = request.data.get("temperature")
        max_tokens = request.data.get("max_tokens")
        timeout = request.data.get("timeout")
        truncate_chars = request.data.get("truncate_chars")
        system_prompt = request.data.get("system_prompt")

        def clamp_float(v, lo, hi, default):
            try:
                f = float(v)
                return max(lo, min(hi, f))
            except Exception:
                return default

        def clamp_int(v, lo, hi, default):
            try:
                i = int(v)
                return max(lo, min(hi, i))
            except Exception:
                return default

        summary = summarize_text_with_deepseek(
            transcript_text,
            temperature=clamp_float(temperature, 0.0, 1.0, 0.6),
            max_tokens=clamp_int(max_tokens, 128, 2000, 600),
            timeout=clamp_int(timeout, 10, 120, 60),
            truncate_chars=clamp_int(truncate_chars, 500, 20000, 6000),
            system_prompt=system_prompt,
        )

        # 检查summary是否为None或空字符串
        if summary is None:
            return Response(
                {
                    "code": 500,
                    "message": "总结失败",
                    "data": {
                        "error": "DeepSeek API 返回空结果",
                        "file_path": save_path,
                        "transcript": transcript_text,
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 确保summary是字符串类型
        summary = str(summary).strip() if summary else ""

        if not summary:
            return Response(
                {
                    "code": 500,
                    "message": "总结失败",
                    "data": {
                        "error": "DeepSeek API 返回空内容",
                        "file_path": save_path,
                        "transcript": transcript_text,
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 检查是否为错误信息
        if (
            summary.startswith("错误：")
            or summary.startswith("请求 DeepSeek API 失败")
            or summary.startswith("解析 API 响应失败")
        ):
            return Response(
                {
                    "code": 500,
                    "message": "总结失败",
                    "data": {
                        "error": summary,
                        "file_path": save_path,
                        "transcript": transcript_text,
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 计算可公开访问的 URL（如配置了 MEDIA_URL）
        media_url = getattr(settings, "MEDIA_URL", "")
        file_url = f"{media_url}voice/{filename}" if media_url else save_path

        return Response(
            {
                "code": 200,
                "message": "处理成功",
                "data": {
                    "transcript": transcript_text,
                    "summary": summary,
                    "file_url": file_url,
                },
            },
            status=status.HTTP_200_OK,
        )


class VoiceCleanupView(APIView):
    """
    清理未确认的音频文件：删除media/voice文件夹中的所有音频文件
    用于录音结束后用户未确认上传时的隐私保护
    """

    def post(self, request):
        try:
            media_root = getattr(settings, "MEDIA_ROOT", None)
            if not media_root:
                return Response(
                    {
                        "code": 500,
                        "message": "服务未配置媒体目录（MEDIA_ROOT）",
                        "data": None,
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            voice_dir = os.path.join(media_root, "voice")
            if not os.path.exists(voice_dir):
                return Response(
                    {
                        "code": 200,
                        "message": "音频目录不存在，无需清理",
                        "data": {"deleted_count": 0},
                    },
                    status=status.HTTP_200_OK,
                )

            # 获取所有音频文件
            audio_patterns = [
                os.path.join(voice_dir, "*.wav"),
                os.path.join(voice_dir, "*.mp3"),
                os.path.join(voice_dir, "*.m4a"),
                os.path.join(voice_dir, "*.ogg"),
                os.path.join(voice_dir, "*.flac"),
            ]

            deleted_count = 0
            deleted_files = []

            for pattern in audio_patterns:
                files = glob.glob(pattern)
                for file_path in files:
                    try:
                        os.remove(file_path)
                        deleted_count += 1
                        deleted_files.append(os.path.basename(file_path))
                    except OSError as e:
                        # 记录删除失败的文件，但继续处理其他文件
                        print(f"删除文件失败: {file_path}, 错误: {e}")

            return Response(
                {
                    "code": 200,
                    "message": f"成功删除 {deleted_count} 个音频文件",
                    "data": {
                        "deleted_count": deleted_count,
                        "deleted_files": deleted_files,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "code": 500,
                    "message": f"清理音频文件时发生错误：{str(e)}",
                    "data": None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
