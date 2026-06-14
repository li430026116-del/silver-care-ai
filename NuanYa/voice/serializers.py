from rest_framework import serializers

from .models import VoiceRecord


class VoiceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceRecord
        fields = [
            "id",
            "user",
            "question",
            "voice_file_url",
            "voice_format",
            "transcribe_status",
            "transcribed_text",
            "create_time",
            "update_time",
        ]
