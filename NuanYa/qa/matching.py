"""
问题匹配算法模块
根据用户的擅长领域标签匹配相关问题
"""


from django.utils import timezone

from .models import Question


def match_questions_to_user(user_expertise_tags):
    """
    根据用户擅长领域标签匹配问题并排序

    Args:
        user_expertise_tags (list): 用户擅长的领域标签列表

    Returns:
        QuerySet: 匹配的问题查询集，按优先级和时间排序
    """
    if not user_expertise_tags:
        # 如果用户没有设置擅长领域，返回所有未回答的问题
        return Question.objects.filter(answers__isnull=True).order_by("-create_time")

    # 获取当前时间
    current_time = timezone.now()

    # 获取所有未回答的问题
    questions = Question.objects.filter(answers__isnull=True)

    # 获取分类映射
    category_mapping = get_category_mapping()
    matched_categories = []

    # 根据用户标签找到对应的问题分类
    for tag in user_expertise_tags:
        if tag in category_mapping:
            matched_categories.extend(category_mapping[tag])

    matched_questions = []

    for question in questions:
        is_matched = False

        # 检查标签匹配
        question_tags = question.tags if isinstance(question.tags, list) else []
        if set(question_tags) & set(user_expertise_tags):
            is_matched = True

        # 检查分类匹配
        if (
            not is_matched
            and matched_categories
            and question.category in matched_categories
        ):
            is_matched = True

        if is_matched:
            # 计算时间差
            time_diff = current_time - question.create_time
            days_diff = time_diff.days

            # 确定优先级
            if days_diff <= 1:
                priority = 1
            elif 1 < days_diff <= 5:
                priority = 2
            else:
                priority = 3

            matched_questions.append(
                {
                    "question": question,
                    "priority": priority,
                    "create_time": question.create_time,
                }
            )

    # 排序：先优先级升序，再时间升序
    matched_questions.sort(key=lambda x: (x["priority"], x["create_time"]))

    # 如果没有匹配到任何问题，返回所有未回答的问题
    if not matched_questions:
        return Question.objects.filter(answers__isnull=True).order_by("-create_time")

    # 返回排序后的问题列表
    return [item["question"] for item in matched_questions]


def get_category_mapping():
    """
    获取擅长领域标签到问题分类的映射关系

    Returns:
        dict: 标签到分类的映射字典
    """
    return {
        "饮食健康": ["饮食健康", "饮食", "营养", "辅食"],
        "睡眠问题": ["睡眠问题", "睡眠", "夜醒", "作息"],
        "行为培养": ["行为培养", "习惯", "自律", "教育"],
        "病护应对": ["病护应对", "健康", "疾病", "护理"],
        "知识启蒙": ["知识启蒙", "学习", "认知", "智力"],
        "趣味陪伴": ["趣味陪伴", "游戏", "娱乐", "互动"],
    }


def match_questions_by_category(user_expertise_tags):
    """
    根据用户擅长领域标签和分类匹配问题

    Args:
        user_expertise_tags (list): 用户擅长的领域标签列表

    Returns:
        QuerySet: 匹配的问题查询集
    """
    if not user_expertise_tags:
        return Question.objects.filter(answers__isnull=True).order_by("-create_time")

    category_mapping = get_category_mapping()
    matched_categories = []

    # 根据用户标签找到对应的问题分类
    for tag in user_expertise_tags:
        if tag in category_mapping:
            matched_categories.extend(category_mapping[tag])

    if not matched_categories:
        return Question.objects.filter(answers__isnull=True).order_by("-create_time")

    # 获取匹配分类的问题
    questions = Question.objects.filter(
        answers__isnull=True, category__in=matched_categories
    )

    # 按创建时间排序
    return questions.order_by("-create_time")
