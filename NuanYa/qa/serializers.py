from rest_framework import serializers

from .models import Answer, OlderQuestion, Question


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "title", "category", "content", "tags", "create_time"]


class OlderQuestionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)

    class Meta:
        model = OlderQuestion
        fields = ["id", "user_name", "title", "content", "create_time"]


class AnswerQuestionBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "title", "category"]


class AnswerSerializer(serializers.ModelSerializer):
    question = AnswerQuestionBriefSerializer(read_only=True)
    voice_record_id = serializers.IntegerField(allow_null=True, read_only=True)

    class Meta:
        model = Answer
        fields = ["id", "question", "answer_text", "create_time", "voice_record_id"]


class AnswerCreateSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer_text = serializers.CharField()
    # 兼容两种传法：直接说明（voice_file），或明确 url/format
    voice_file = serializers.CharField(required=False)
    voice_file_url = serializers.CharField(required=False)
    voice_format = serializers.CharField(required=False)
