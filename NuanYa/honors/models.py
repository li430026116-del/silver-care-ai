from django.db import models


class Badge(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(
        "user.User", on_delete=models.CASCADE, related_name="user_badges"
    )
    badge = models.ForeignKey(
        Badge, on_delete=models.CASCADE, related_name="user_badges"
    )
    obtain_time = models.DateTimeField()

    def __str__(self):
        return f"{self.user_id} - {self.badge_id}"


class ThankLetter(models.Model):
    """感谢信模型"""

    title = models.CharField(max_length=200, verbose_name="感谢信标题")
    content = models.TextField(verbose_name="感谢信内容")
    sender_name = models.CharField(max_length=100, verbose_name="发送者姓名")
    sender_relation = models.CharField(
        max_length=50,
        verbose_name="与受助者关系",
        help_text="如：孩子的妈妈、爸爸、奶奶等",
        default="家长",
    )
    recipient_expert = models.CharField(
        max_length=100, verbose_name="受感谢专家", help_text="被感谢的专家姓名"
    )
    help_category = models.CharField(
        max_length=50,
        verbose_name="帮助类别",
        help_text="如：饮食健康、睡眠问题、性格培养等",
        default="其他",
    )
    create_time = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    is_featured = models.BooleanField(default=False, verbose_name="是否精选显示")

    class Meta:
        verbose_name = "感谢信"
        verbose_name_plural = "感谢信"
        ordering = ["-create_time"]  # 按创建时间倒序排列

    def __str__(self):
        return f"{self.title} - {self.sender_name}"
