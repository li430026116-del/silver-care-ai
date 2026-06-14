from django.db import models
from django.utils import timezone


class MomUser(models.Model):
    """妈妈用户模型 - 对应moms表"""

    # id字段自动生成，作为主键
    name = models.CharField(max_length=100, verbose_name="妈妈用户名")
    join_time = models.DateTimeField(
        default=timezone.now, verbose_name="妈妈加入APP的时间"
    )

    class Meta:
        verbose_name = "妈妈用户"
        verbose_name_plural = "妈妈用户"
        db_table = "moms"

    def __str__(self):
        return f"{self.name}"


class MomQuestion(models.Model):
    """妈妈发布的问题表 - 对应mom_questions表"""

    # id字段自动生成，作为主键
    mom = models.ForeignKey(
        MomUser,
        on_delete=models.CASCADE,
        related_name="questions",
        verbose_name="关联发布问题的妈妈用户",
    )
    title = models.CharField(max_length=255, verbose_name="问题标题")
    category = models.CharField(max_length=100, verbose_name="问题分类")
    content = models.TextField(verbose_name="问题详细内容")
    create_time = models.DateTimeField(
        default=timezone.now, verbose_name="问题发布时间"
    )

    class Meta:
        verbose_name = "妈妈问题"
        verbose_name_plural = "妈妈问题"
        db_table = "mom_questions"
        ordering = ["-create_time"]

    def __str__(self):
        return f"{self.mom.name} - {self.title}"


class MomLike(models.Model):
    """妈妈点赞回答表 - 对应mom_likes表"""

    # id字段自动生成，作为主键
    mom = models.ForeignKey(
        MomUser,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name="关联点赞的妈妈用户",
    )
    answer = models.ForeignKey(
        "qa.Answer",
        on_delete=models.CASCADE,
        related_name="mom_likes",
        verbose_name="关联妈妈点赞的老人回答",
    )
    question = models.ForeignKey(
        MomQuestion,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name="关联回答对应的妈妈问题（减少跨表查询）",
        null=True,
        blank=True,
    )
    create_time = models.DateTimeField(default=timezone.now, verbose_name="点赞时间")

    class Meta:
        unique_together = ("mom", "answer")  # 防止重复点赞
        verbose_name = "妈妈点赞"
        verbose_name_plural = "妈妈点赞"
        db_table = "mom_likes"
        ordering = ["-create_time"]

    def __str__(self):
        return f"{self.mom.name} 点赞了回答 #{self.answer.id}"


# 保留一些原有的模型，但进行适配调整
class AnswerFavorite(models.Model):
    """回答收藏记录 - 简化版本，通过answer关联完整回答信息"""

    mom_user = models.ForeignKey(
        MomUser,
        on_delete=models.CASCADE,
        related_name="favorites",
        verbose_name="收藏用户",
    )
    answer = models.ForeignKey(
        "qa.Answer",
        on_delete=models.CASCADE,
        related_name="mom_favorites",
        verbose_name="被收藏回答",
    )
    create_time = models.DateTimeField(default=timezone.now, verbose_name="收藏时间")
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name="收藏标签",
        help_text="用户自定义的收藏分类标签",
    )
    notes = models.TextField(default="", blank=True, verbose_name="收藏备注")

    class Meta:
        unique_together = ("mom_user", "answer")  # 防止重复收藏
        verbose_name = "回答收藏"
        verbose_name_plural = "回答收藏"
        db_table = "mom_favorites"

    def __str__(self):
        return f"{self.mom_user.name} 收藏了回答 #{self.answer.id}"


class QuestionTag(models.Model):
    """问题标签管理 - 保留原有功能"""

    name = models.CharField(max_length=50, unique=True, verbose_name="标签名称")
    category = models.CharField(
        max_length=50,
        verbose_name="标签分类",
        help_text="如：饮食健康、睡眠问题、行为培养等",
    )
    description = models.CharField(
        max_length=200, blank=True, default="", verbose_name="标签描述"
    )
    usage_count = models.IntegerField(default=0, verbose_name="使用次数")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="创建时间")

    class Meta:
        verbose_name = "问题标签"
        verbose_name_plural = "问题标签"
        ordering = ["-usage_count", "name"]
        db_table = "mom_tags"

    def __str__(self):
        return f"{self.name} ({self.category})"


class BabyCommonIssue(models.Model):
    """宝宝常见问题记录 - 简化版本"""

    mom_user = models.ForeignKey(
        MomUser,
        on_delete=models.CASCADE,
        related_name="baby_issues",
        verbose_name="记录用户",
    )
    category = models.CharField(
        max_length=50,
        verbose_name="问题分类",
        choices=[
            ("feeding", "饮食健康"),
            ("sleep", "睡眠问题"),
            ("behavior", "行为培养"),
            ("health", "日常护理"),
            ("development", "知识启蒙"),
            ("play", "趣味陪伴"),
            ("other", "其他"),
        ],
    )
    issue_title = models.CharField(
        max_length=200, verbose_name="问题标题", default="未命名问题"
    )
    issue_description = models.TextField(verbose_name="问题描述", default="暂无描述")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="记录时间")

    class Meta:
        verbose_name = "宝宝常见问题"
        verbose_name_plural = "宝宝常见问题"
        ordering = ["-create_time"]
        db_table = "mom_common_issues"

    def __str__(self):
        return f"{self.mom_user.name}的宝宝 - {self.issue_title}"


class MomThankLetter(models.Model):
    """妈妈发送的感谢信 - 简化版本"""

    mom_user = models.ForeignKey(
        MomUser,
        on_delete=models.CASCADE,
        related_name="sent_thank_letters",
        verbose_name="发送用户",
    )
    expert_user = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        related_name="received_thank_letters",
        verbose_name="感谢的专家",
    )
    title = models.CharField(max_length=200, verbose_name="感谢信标题")
    content = models.TextField(verbose_name="感谢信内容")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="发送时间")

    class Meta:
        verbose_name = "妈妈感谢信"
        verbose_name_plural = "妈妈感谢信"
        ordering = ["-create_time"]
        db_table = "mom_thank_letters"

    def __str__(self):
        return f"{self.mom_user.name} 感谢 {self.expert_user.name} - {self.title}"


class MomAnswer(models.Model):
    mom = models.ForeignKey(
        MomUser,
        on_delete=models.CASCADE,
        related_name="mom_answers",
        verbose_name="回答的妈妈",
    )
    question = models.ForeignKey(
        "qa.OlderQuestion",
        on_delete=models.CASCADE,
        related_name="mom_answers",
        verbose_name="关联的老人问题",
    )
    answer_text = models.TextField(verbose_name="回答内容")
    create_time = models.DateTimeField(default=timezone.now, verbose_name="回答时间")

    class Meta:
        db_table = "mom_answer"
        verbose_name = "妈妈回答"
        verbose_name_plural = "妈妈回答"
        ordering = ["-create_time"]

    def __str__(self):
        return f"Answer by {self.mom.name} on Question #{self.question.id}"
