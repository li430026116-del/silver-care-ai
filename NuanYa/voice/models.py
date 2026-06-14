from django.db import models
from django.utils import timezone


class VoiceRecord(models.Model):
    STATUS_PENDING = "pending"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"

    user = models.ForeignKey(
        "user.User", on_delete=models.CASCADE, related_name="voice_records"
    )
    question = models.ForeignKey(
        "qa.Question", on_delete=models.CASCADE, related_name="voice_records"
    )
    voice_file_url = models.CharField(max_length=512, blank=True, default="")
    voice_format = models.CharField(max_length=20, blank=True, default="")
    transcribe_status = models.CharField(max_length=20, default=STATUS_PENDING)
    transcribed_text = models.TextField(blank=True, null=True)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"VoiceRecord #{self.id} ({self.transcribe_status})"
