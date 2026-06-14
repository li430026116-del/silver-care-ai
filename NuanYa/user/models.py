from django.db import models
from django.utils import timezone


class User(models.Model):
    # Keep default AutoField; we'll always use id=1 for the public account
    name = models.CharField(max_length=100, default="共享育儿专家")
    role = models.CharField(max_length=50, default="育儿专家")
    join_time = models.DateTimeField(default=timezone.now)
    points = models.IntegerField(default=0)
    answer_count = models.IntegerField(default=0)
    like_count = models.IntegerField(default=0)
    help_count = models.IntegerField(default=0)
    # 老人擅长的领域，存储为JSON格式的标签列表
    expertise_tags = models.JSONField(
        default=list, blank=True, help_text="老人擅长的领域标签"
    )

    def __str__(self):
        return f"User #{self.id} - {self.name}"


class PointsRecord(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="points_records"
    )
    points = models.IntegerField()
    reason = models.CharField(max_length=100)
    related_answer = models.ForeignKey(
        "qa.Answer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="points_records",
    )
    create_time = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.user_id} +{self.points} ({self.reason})"


class UserSettings(models.Model):
    SOUND_ON = "on"
    SOUND_OFF = "off"
    NOTIF_ON = "on"
    NOTIF_OFF = "off"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    sound = models.CharField(
        max_length=5, choices=[(SOUND_ON, "on"), (SOUND_OFF, "off")], default=SOUND_ON
    )
    notification = models.CharField(
        max_length=5, choices=[(NOTIF_ON, "on"), (NOTIF_OFF, "off")], default=NOTIF_ON
    )

    def __str__(self):
        return f"Settings for User {self.user_id}"


class OlderFavorite(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="older_favorites",
        verbose_name="收藏的老人",
    )
    answer = models.ForeignKey(
        "mominteractions.MomAnswer",
        on_delete=models.CASCADE,
        related_name="older_favorites",
        verbose_name="收藏的回答",
    )
    create_time = models.DateTimeField(default=timezone.now, verbose_name="收藏时间")

    class Meta:
        db_table = "older_favorites"
        verbose_name = "老人收藏"
        verbose_name_plural = "老人收藏"
        unique_together = ("user", "answer")

    def __str__(self):
        return f"{self.user.name} 收藏了回答 #{self.answer.id}"
