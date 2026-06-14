from rest_framework import serializers

from .models import Badge, ThankLetter, UserBadge


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "description"]


class UserBadgeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="badge.name")
    description = serializers.CharField(source="badge.description")

    class Meta:
        model = UserBadge
        fields = ["id", "name", "description", "obtain_time"]


class ThankLetterSerializer(serializers.ModelSerializer):
    """感谢信序列化器"""

    create_time = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model = ThankLetter
        fields = [
            "id",
            "title",
            "content",
            "sender_name",
            "sender_relation",
            "recipient_expert",
            "help_category",
            "create_time",
            "is_featured",
        ]
        read_only_fields = ["id", "create_time"]
