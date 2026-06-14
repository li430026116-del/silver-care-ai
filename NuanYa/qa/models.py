from django.db import models
from django.utils import timezone


class Question(models.Model):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    content = models.TextField()
    tags = models.JSONField(default=list, blank=True)  # 改为JSONField支持列表
    create_time = models.DateTimeField(default=timezone.now)

    # 新增字段支持妈妈端提问
    baby_age_months = models.IntegerField(
        null=True, blank=True, verbose_name="宝宝月龄"
    )
    urgency_level = models.CharField(
        max_length=20,
        default="normal",
        choices=[("low", "不急"), ("normal", "一般"), ("high", "紧急")],
        verbose_name="紧急程度",
    )
    asker_type = models.CharField(
        max_length=20,
        default="elder",
        choices=[("elder", "老人端"), ("mom", "妈妈端")],
        verbose_name="提问者类型",
    )
    asker_id = models.IntegerField(null=True, blank=True, verbose_name="提问者ID")

    def __str__(self):
        return f"{self.title}"


class Answer(models.Model):
    # user set to id=1 from user app
    user = models.ForeignKey(
        "user.User", on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="answers"
    )
    answer_text = models.TextField()
    create_time = models.DateTimeField(default=timezone.now)
    like_count = models.IntegerField(default=0)
    voice_record = models.ForeignKey(
        "voice.VoiceRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="answers",
    )
    is_best = models.BooleanField(
        default=False, verbose_name="是否为最佳答案"
    )  # 新增字段

    def __str__(self):
        return f"Answer #{self.id} by User {self.user_id}"


class OlderQuestion(models.Model):
    user = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        related_name="older_questions",
        verbose_name="提问的老人",
    )
    title = models.CharField(max_length=255, verbose_name="问题标题")
    content = models.TextField(verbose_name="问题内容")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="提问时间")

    class Meta:
        db_table = "older_questions"
        verbose_name = "老人问题"
        verbose_name_plural = "老人问题"
        ordering = ["-create_time"]

    def __str__(self):
        return f"{self.title} by {self.user.name}"
