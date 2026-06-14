from django.utils import timezone

from .models import PointsRecord, User, UserSettings

DEFAULT_ANSWER_POINTS = 50


def get_public_user():
    user, created = User.objects.get_or_create(
        id=1,
        defaults={
            "name": "共享育儿专家",
            "role": "育儿专家",
            "join_time": timezone.now(),
            "points": 1280,
            "answer_count": 24,
            "like_count": 156,
            "help_count": 42,
        },
    )
    return user


def ensure_user_settings(user: User):
    settings, _ = UserSettings.objects.get_or_create(
        user=user,
        defaults={
            "sound": UserSettings.SOUND_ON,
            "notification": UserSettings.NOTIF_ON,
        },
    )
    return settings


def award_points_for_answer(user: User, answer):
    # Increase points and answer count, create a points record
    user.points = (user.points or 0) + DEFAULT_ANSWER_POINTS
    user.answer_count = (user.answer_count or 0) + 1
    user.save(update_fields=["points", "answer_count"])
    PointsRecord.objects.create(
        user=user,
        points=DEFAULT_ANSWER_POINTS,
        reason="回答问题",
        related_answer=answer,
        create_time=timezone.now(),
    )
