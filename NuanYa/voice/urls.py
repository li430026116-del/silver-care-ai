from django.urls import path

from .views import (VoiceCleanupView, VoiceSummarizeView, VoiceTranscribeView,
                    VoiceUploadTranscribeSummarizeView)

urlpatterns = [
    path("api/voice/transcribe", VoiceTranscribeView.as_view()),
    path("api/voice/summarize", VoiceSummarizeView.as_view()),
    path(
        "api/voice/upload_transcribe_summarize",
        VoiceUploadTranscribeSummarizeView.as_view(),
    ),
    path("api/voice/cleanup", VoiceCleanupView.as_view()),
]
