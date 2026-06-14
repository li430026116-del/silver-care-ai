from rest_framework import serializers

from .models import OlderFavorite, PointsRecord, User, UserSettings


class OlderFavoriteSerializer(serializers.ModelSerializer):
    answer_id = serializers.IntegerField(source="answer.id", read_only=True)
    question_id = serializers.IntegerField(source="answer.question.id", read_only=True)
    question_title = serializers.CharField(
        source="answer.question.title", read_only=True
    )
    answer_text = serializers.CharField(source="answer.answer_text", read_only=True)
    mom_name = serializers.CharField(source="answer.mom.name", read_only=True)

    class Meta:
        model = OlderFavorite
        fields = [
            "id",
            "answer_id",
            "question_id",
            "question_title",
            "answer_text",
            "mom_name",
            "create_time",
        ]


class UserSerializer(serializers.ModelSerializer):
    answer_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "role",
            "join_time",
            "points",
            "answer_count",
            "expertise_tags",
        ]

    def get_answer_count(self, obj):
        """动态计算用户的实际回答数量"""
        return obj.answers.count()


class PointsRecordSerializer(serializers.ModelSerializer):
    related_answer_id = serializers.IntegerField(allow_null=True, read_only=True)

    class Meta:
        model = PointsRecord
        fields = ["id", "points", "reason", "related_answer_id", "create_time"]


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ["sound", "notification"]


class UserSettingsUpdateSerializer(serializers.Serializer):
    sound = serializers.ChoiceField(choices=["on", "off"])
    notification = serializers.ChoiceField(choices=["on", "off"])


class ExpertiseTagsUpdateSerializer(serializers.Serializer):
    """更新用户擅长领域标签的序列化器"""

    expertise_tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        allow_empty=True,
        help_text="用户擅长的领域标签列表",
    )
