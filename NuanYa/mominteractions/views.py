
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from qa.models import Answer, Question
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from user.models import User

from .models import (AnswerFavorite, BabyCommonIssue, MomLike, MomThankLetter,
                     MomUser)


class SharedMomAccountMixin:
    """共享妈妈账户混入类"""

    @staticmethod
    def get_shared_mom_user():
        """获取或创建共享妈妈账户"""
        mom_user, created = MomUser.objects.get_or_create(
            id=1, defaults={"name": "共享妈妈用户", "join_time": timezone.now()}
        )
        return mom_user


class MomRegisterView(APIView, SharedMomAccountMixin):
    """妈妈用户注册（实际返回共享账户）"""

    def post(self, request):
        try:
            # 直接返回共享账户信息，不创建新用户
            mom_user = self.get_shared_mom_user()

            return Response(
                {
                    "success": True,
                    "message": "注册成功",
                    "data": {
                        "user_id": mom_user.id,
                        "name": mom_user.name,
                        "join_time": mom_user.join_time,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"注册失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MomProfileView(APIView, SharedMomAccountMixin):
    """获取妈妈用户信息"""

    def get(self, request):
        try:
            # 始终返回共享账户信息
            mom_user = self.get_shared_mom_user()

            return Response(
                {
                    "success": True,
                    "data": {
                        "id": mom_user.id,
                        "name": mom_user.name,
                        "join_time": mom_user.join_time,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"获取用户信息失败: {str(e)}"},
                status=status.HTTP_404_NOT_FOUND,
            )


class ThankLetterView(APIView, SharedMomAccountMixin):
    """发送感谢信"""

    def post(self, request):
        try:
            data = request.data
            mom_user = self.get_shared_mom_user()
            expert_user = get_object_or_404(User, id=data.get("elder_user_id"))
            get_object_or_404(Answer, id=data.get("answer_id"))

            # 创建妈妈端感谢信记录
            mom_thank_letter = MomThankLetter.objects.create(
                mom_user=mom_user,
                expert_user=expert_user,
                title=data.get("title"),
                content=data.get("content"),
            )

            # 同步创建老人端感谢信记录（用于老人端显示）
            from honors.models import ThankLetter

            elder_thank_letter = ThankLetter.objects.create(
                title=data.get("title", "来自妈妈的感谢"),
                content=data.get("content"),
                sender_name=mom_user.name,
                sender_relation="家长",
                recipient_expert=(
                    expert_user.name
                    if hasattr(expert_user, "name")
                    else expert_user.username
                ),
                help_category="育儿指导",
                is_featured=False,
            )

            return Response(
                {
                    "success": True,
                    "message": "感谢信发送成功",
                    "data": {
                        "thank_letter_id": mom_thank_letter.id,
                        "elder_thank_letter_id": elder_thank_letter.id,
                        "create_time": mom_thank_letter.create_time,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"发送感谢信失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MyThankLettersView(APIView, SharedMomAccountMixin):
    """获取妈妈发送的感谢信列表"""

    def get(self, request):
        try:
            mom_user = self.get_shared_mom_user()
            page = int(request.GET.get("page", 1))
            page_size = int(request.GET.get("page_size", 10))

            # 获取该妈妈发送的所有感谢信
            thank_letters = MomThankLetter.objects.filter(mom_user=mom_user).order_by(
                "-create_time"
            )

            # 分页
            paginator = Paginator(thank_letters, page_size)
            page_obj = paginator.get_page(page)

            # 序列化数据
            results = []
            for letter in page_obj:
                results.append(
                    {
                        "id": letter.id,
                        "title": letter.title,
                        "content": letter.content,
                        "recipient_name": (
                            letter.expert_user.name
                            if hasattr(letter.expert_user, "name")
                            else letter.expert_user.username
                        ),
                        "created_at": letter.create_time.isoformat(),
                        "question_title": "相关问题",  # 暂时使用固定值，后续可以关联具体问题
                    }
                )

            return Response(
                {
                    "success": True,
                    "message": "获取感谢信列表成功",
                    "data": {
                        "results": results,
                        "total": paginator.count,
                        "page": page,
                        "page_size": page_size,
                        "total_pages": paginator.num_pages,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"获取感谢信列表失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuestionView(APIView, SharedMomAccountMixin):
    """妈妈提问"""

    def post(self, request):
        try:
            data = request.data
            mom_user = self.get_shared_mom_user()

            # 创建问题（关联到老人端的Question模型）
            question = Question.objects.create(
                title=data.get("title"),
                content=data.get("content"),
                category=data.get("category"),
                tags=data.get("tags", []),
                baby_age_months=data.get("baby_age_months"),
                urgency_level=data.get("urgency_level", "normal"),
                # 注意：这里需要一个字段来标识是妈妈提问的，可能需要修改Question模型
                # 暂时用一个特殊标记
                asker_type="mom",
                asker_id=mom_user.id,
            )

            return Response(
                {
                    "success": True,
                    "message": "提问成功",
                    "data": {
                        "question_id": question.id,
                        "title": question.title,
                        "create_time": question.create_time,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"提问失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MyQuestionsView(APIView, SharedMomAccountMixin):
    """获取用户的问题列表"""

    def get(self, request):
        try:
            mom_user = self.get_shared_mom_user()
            page = int(request.GET.get("page", 1))
            page_size = int(request.GET.get("page_size", 10))

            # 获取该用户的所有问题（从Question模型中查找）
            questions = Question.objects.filter(
                asker_type="mom", asker_id=mom_user.id
            ).order_by("-create_time")

            total_count = questions.count()

            # 分页
            start = (page - 1) * page_size
            end = start + page_size
            questions_page = questions[start:end]

            # 格式化返回数据
            questions_data = []
            for question in questions_page:
                # 获取该问题的回答数量
                answer_count = Answer.objects.filter(question=question).count()

                questions_data.append(
                    {
                        "id": question.id,
                        "title": question.title,
                        "category": question.category,
                        "content": question.content,
                        "tags": (
                            question.tags if isinstance(question.tags, list) else []
                        ),
                        "create_time": question.create_time,
                        "answer_count": answer_count,
                        "urgency_level": getattr(question, "urgency_level", "normal"),
                        "baby_age_months": getattr(question, "baby_age_months", 0),
                    }
                )

            return Response(
                {
                    "success": True,
                    "data": {
                        "questions": questions_data,
                        "total_count": total_count,
                        "page": page,
                        "page_size": page_size,
                        "total_pages": (total_count + page_size - 1) // page_size,
                    },
                }
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"获取问题列表失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuestionSearchView(APIView, SharedMomAccountMixin):
    """搜索问题和回答内容"""

    # 定义6个固定的搜索标签
    FIXED_SEARCH_TAGS = [
        "饮食健康",
        "睡眠问题",
        "行为培养",
        "日常护理",
        "知识启蒙",
        "趣味陪伴",
    ]

    def get(self, request):
        try:
            tag = request.GET.get("tag", "")  # 标签搜索
            keyword = request.GET.get("keyword", "")  # 关键词搜索
            page = int(request.GET.get("page", 1))
            page_size = int(request.GET.get("page_size", 10))

            # 验证标签是否在允许的范围内（如果提供了标签）
            if tag and tag not in self.FIXED_SEARCH_TAGS:
                return Response(
                    {
                        "success": False,
                        "message": f'不支持的搜索标签，仅支持: {", ".join(self.FIXED_SEARCH_TAGS)}',
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 构建查询条件
            query = Q()

            # 标签搜索
            if tag:
                query &= Q(tags__contains=[tag]) | Q(category=tag)

            # 关键词搜索 - 搜索问题标题、内容和回答内容
            if keyword:
                keyword_query = (
                    Q(title__icontains=keyword)  # 问题标题包含关键词
                    | Q(content__icontains=keyword)  # 问题内容包含关键词
                    | Q(answers__answer_text__icontains=keyword)  # 回答内容包含关键词
                )
                if query:
                    query &= keyword_query
                else:
                    query = keyword_query

            # 如果既没有标签也没有关键词，返回所有问题
            if not tag and not keyword:
                query = Q()

            # 搜索问题（去重，因为一个问题可能有多个匹配的回答）
            questions = (
                Question.objects.filter(query).distinct().order_by("-create_time")
            )
            total_count = questions.count()

            # 分页
            start = (page - 1) * page_size
            end = start + page_size
            questions_page = questions[start:end]

            # 格式化返回数据
            questions_data = []
            for q in questions_page:
                # 如果是关键词搜索，找出匹配的回答
                matched_answers = []
                if keyword:
                    matching_answers = q.answers.filter(answer_text__icontains=keyword)
                    for answer in matching_answers:
                        matched_answers.append(
                            {
                                "id": answer.id,
                                "content": answer.answer_text,
                                "author": answer.user.name,
                                "create_time": answer.create_time,
                                "like_count": answer.like_count,
                            }
                        )

                questions_data.append(
                    {
                        "id": q.id,
                        "title": q.title,
                        "content": q.content,
                        "category": q.category,
                        "tags": q.tags,
                        "create_time": q.create_time,
                        "answer_count": q.answers.count(),
                        "has_best_answer": q.answers.filter(is_best=True).exists(),
                        "matched_answers": matched_answers,  # 匹配的回答（仅在关键词搜索时有内容）
                    }
                )

            return Response(
                {
                    "success": True,
                    "data": {
                        "questions": questions_data,
                        "total_count": total_count,
                        "page": page,
                        "page_size": page_size,
                        "total_pages": (total_count + page_size - 1) // page_size,
                        "available_tags": self.FIXED_SEARCH_TAGS,  # 返回可用的搜索标签
                        "search_params": {"tag": tag, "keyword": keyword},
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"搜索失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AnswerLikeView(APIView, SharedMomAccountMixin):
    """点赞回答"""

    def post(self, request):
        try:
            answer_id = request.data.get("answer_id")
            if not answer_id:
                return Response(
                    {"success": False, "message": "缺少回答ID"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            answer = get_object_or_404(Answer, id=answer_id)
            mom_user = self.get_shared_mom_user()

            # 检查是否已经点赞
            existing_like = MomLike.objects.filter(
                mom_id=mom_user.id, answer_id=answer.id
            ).first()

            if existing_like:
                return Response(
                    {"success": False, "message": "已经点赞过了"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 创建点赞记录
            MomLike.objects.create(mom_id=mom_user.id, answer_id=answer.id)

            # 更新回答的点赞数
            like_count = MomLike.objects.filter(answer_id=answer.id).count()
            Answer.objects.filter(id=answer_id).update(like_count=like_count)

            return Response(
                {
                    "success": True,
                    "message": "点赞成功",
                    "data": {"like_count": like_count},
                }
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"点赞失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request):
        try:
            answer_id = request.data.get("answer_id")
            if not answer_id:
                return Response(
                    {"success": False, "message": "缺少回答ID"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            answer = get_object_or_404(Answer, id=answer_id)
            mom_user = self.get_shared_mom_user()

            # 查找点赞记录
            like = MomLike.objects.filter(
                mom_id=mom_user.id, answer_id=answer.id
            ).first()

            if not like:
                return Response(
                    {"success": False, "message": "未找到点赞记录"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # 删除点赞记录
            like.delete()

            # 更新回答的点赞数
            like_count = MomLike.objects.filter(answer_id=answer.id).count()
            Answer.objects.filter(id=answer_id).update(like_count=like_count)

            return Response(
                {
                    "success": True,
                    "message": "取消点赞成功",
                    "data": {"like_count": like_count},
                }
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"取消点赞失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ToggleLikeView(APIView, SharedMomAccountMixin):
    """切换点赞状态"""

    def post(self, request):
        try:
            answer_id = request.data.get("answer_id")
            if not answer_id:
                return Response(
                    {"success": False, "message": "缺少回答ID"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            answer = get_object_or_404(Answer, id=answer_id)
            mom_user = self.get_shared_mom_user()

            # 检查是否已经点赞
            existing_like = MomLike.objects.filter(
                mom_id=mom_user.id, answer_id=answer.id
            ).first()

            if existing_like:
                # 取消点赞
                existing_like.delete()
                liked = False
                message = "取消点赞成功"
            else:
                # 添加点赞 - question字段现在是可选的
                MomLike.objects.create(mom_id=mom_user.id, answer_id=answer.id)
                liked = True
                message = "点赞成功"

            # 更新回答的点赞数
            like_count = MomLike.objects.filter(answer_id=answer.id).count()
            Answer.objects.filter(id=answer_id).update(like_count=like_count)

            return Response(
                {
                    "success": True,
                    "message": message,
                    "data": {"liked": liked, "like_count": like_count},
                }
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"操作失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ToggleFavoriteView(APIView, SharedMomAccountMixin):
    """切换收藏状态"""

    def post(self, request):
        try:
            answer_id = request.data.get("answer_id")
            if not answer_id:
                return Response(
                    {"success": False, "message": "缺少回答ID"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            answer = get_object_or_404(Answer, id=answer_id)
            mom_user = self.get_shared_mom_user()

            # 检查是否已经收藏
            existing_favorite = AnswerFavorite.objects.filter(
                mom_user=mom_user, answer=answer
            ).first()

            if existing_favorite:
                # 取消收藏
                existing_favorite.delete()
                favorited = False
                message = "取消收藏成功"
            else:
                # 添加收藏
                AnswerFavorite.objects.create(
                    mom_user=mom_user,
                    answer=answer,
                    tags=request.data.get("tags", []),
                    notes=request.data.get("notes", ""),
                )
                favorited = True
                message = "收藏成功"

            return Response(
                {"success": True, "message": message, "data": {"favorited": favorited}}
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"操作失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SubmitThanksView(APIView, SharedMomAccountMixin):
    """提交感谢信"""

    def post(self, request):
        try:
            answer_id = request.data.get("answer_id")
            content = request.data.get("content")

            if not answer_id or not content:
                return Response(
                    {"success": False, "message": "缺少必要参数"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            answer = get_object_or_404(Answer, id=answer_id)
            mom_user = self.get_shared_mom_user()

            # 创建妈妈端感谢信记录
            mom_thank_letter = MomThankLetter.objects.create(
                mom_user=mom_user,
                expert_user=answer.user,
                title="感谢信",
                content=content,
            )

            # 同步创建老人端感谢信记录（用于老人端显示）
            from honors.models import ThankLetter

            elder_thank_letter = ThankLetter.objects.create(
                title="来自妈妈的感谢",
                content=content,
                sender_name=mom_user.name,
                sender_relation="家长",
                recipient_expert=(
                    answer.user.name
                    if hasattr(answer.user, "name")
                    else answer.user.username
                ),
                help_category="育儿指导",
                is_featured=False,
            )

            return Response(
                {
                    "success": True,
                    "message": "感谢信发送成功",
                    "data": {
                        "thank_letter_id": mom_thank_letter.id,
                        "elder_thank_letter_id": elder_thank_letter.id,
                        "create_time": mom_thank_letter.create_time,
                    },
                }
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"发送失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuestionDetailView(APIView):
    """获取问题详情"""

    def get(self, request, question_id):
        try:
            question = get_object_or_404(Question, id=question_id)

            return Response(
                {
                    "success": True,
                    "data": {
                        "id": question.id,
                        "title": question.title,
                        "content": question.content,
                        "category": question.category,
                        "tags": question.tags,
                        "create_time": question.create_time,
                        "author": getattr(question, "author", "匿名用户"),
                    },
                }
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"获取问题详情失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuestionAnswersView(APIView):
    """获取问题的回答列表"""

    def get(self, request, question_id):
        try:
            question = get_object_or_404(Question, id=question_id)
            answers = Answer.objects.filter(question=question).order_by("-create_time")

            answers_data = []
            for answer in answers:
                answers_data.append(
                    {
                        "id": answer.id,
                        "content": answer.answer_text,
                        "refined_suggestions": getattr(
                            answer, "refined_suggestions", answer.answer_text
                        ),
                        "author": answer.user.name,
                        "avatar": getattr(answer.user, "avatar", ""),
                        "likes_count": getattr(answer, "like_count", 0),
                        "create_time": answer.create_time,
                    }
                )

            return Response({"success": True, "data": answers_data})

        except Exception as e:
            return Response(
                {"success": False, "message": f"获取回答列表失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UserInteractionsView(APIView, SharedMomAccountMixin):
    """获取用户对问题的交互状态"""

    def get(self, request, question_id):
        try:
            question = get_object_or_404(Question, id=question_id)
            mom_user = self.get_shared_mom_user()

            # 获取该问题下所有回答的ID
            answer_ids = list(
                Answer.objects.filter(question=question).values_list("id", flat=True)
            )

            # 获取用户点赞的回答ID
            liked_answer_ids = list(
                MomLike.objects.filter(
                    mom_id=mom_user.id, answer_id__in=answer_ids
                ).values_list("answer_id", flat=True)
            )

            # 获取用户收藏的回答ID
            favorited_answer_ids = list(
                AnswerFavorite.objects.filter(
                    mom_user=mom_user, answer_id__in=answer_ids
                ).values_list("answer_id", flat=True)
            )

            return Response(
                {
                    "success": True,
                    "data": {
                        "likes": liked_answer_ids,
                        "favorites": favorited_answer_ids,
                    },
                }
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"获取交互状态失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AnswerFavoriteView(APIView, SharedMomAccountMixin):
    """收藏回答"""

    def post(self, request):
        try:
            data = request.data
            mom_user = self.get_shared_mom_user()
            answer = get_object_or_404(Answer, id=data.get("answer_id"))

            # 检查是否已经收藏
            existing_favorite = AnswerFavorite.objects.filter(
                mom_user=mom_user, answer=answer
            ).first()
            if existing_favorite:
                return Response(
                    {"success": False, "message": "您已经收藏过这个回答了"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 创建收藏记录
            favorite = AnswerFavorite.objects.create(
                mom_user=mom_user,
                answer=answer,
                tags=data.get("tags", []),
                notes=data.get("notes", ""),
            )

            return Response(
                {
                    "success": True,
                    "message": "收藏成功",
                    "data": {
                        "favorite_id": favorite.id,
                        "create_time": favorite.create_time,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"收藏失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class FavoriteListView(APIView, SharedMomAccountMixin):
    """获取收藏列表"""

    def get(self, request):
        try:
            mom_user = self.get_shared_mom_user()
            tag = request.GET.get("tag", "")
            page = int(request.GET.get("page", 1))
            page_size = int(request.GET.get("page_size", 10))

            # 构建查询条件
            favorites = AnswerFavorite.objects.filter(mom_user=mom_user)
            if tag:
                favorites = favorites.filter(tags__contains=[tag])

            favorites = favorites.order_by("-create_time")
            total_count = favorites.count()

            # 分页
            start = (page - 1) * page_size
            end = start + page_size
            favorites_page = favorites[start:end]

            # 格式化返回数据
            favorites_data = []
            for f in favorites_page:
                favorites_data.append(
                    {
                        "id": f.id,
                        "answer_id": f.answer.id,
                        "question_id": f.answer.question.id,
                        "question_title": f.answer.question.title,
                        "answer_content": f.answer.answer_text,  # 妈妈端显示老人传授的完整知识
                        "expert_name": f.answer.user.name,
                        "category": f.answer.question.category,
                        "tags": f.tags,
                        "notes": f.notes,
                        "create_time": f.create_time,
                    }
                )

            return Response(
                {
                    "success": True,
                    "data": {
                        "favorites": favorites_data,
                        "total_count": total_count,
                        "page": page,
                        "page_size": page_size,
                        "total_pages": (total_count + page_size - 1) // page_size,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"获取收藏列表失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class BabyIssueView(APIView, SharedMomAccountMixin):
    """宝宝常见问题记录"""

    def post(self, request):
        """记录宝宝常见问题"""
        try:
            data = request.data
            mom_user = self.get_shared_mom_user()

            issue = BabyCommonIssue.objects.create(
                mom_user=mom_user,
                issue_title=data.get("issue_title"),
                issue_description=data.get("issue_description"),
                category=data.get("category"),
            )

            return Response(
                {
                    "success": True,
                    "message": "问题记录成功",
                    "data": {"issue_id": issue.id, "create_time": issue.create_time},
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"记录问题失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class BabyIssueListView(APIView, SharedMomAccountMixin):
    """获取宝宝问题记录"""

    def get(self, request):
        try:
            mom_user = self.get_shared_mom_user()
            category = request.GET.get("category", "")
            request.GET.get("is_resolved", "")
            page = int(request.GET.get("page", 1))
            page_size = int(request.GET.get("page_size", 10))

            # 构建查询条件
            issues = BabyCommonIssue.objects.filter(mom_user=mom_user)
            if category:
                issues = issues.filter(category=category)

            issues = issues.order_by("-create_time")
            total_count = issues.count()

            # 分页
            start = (page - 1) * page_size
            end = start + page_size
            issues_page = issues[start:end]

            # 格式化返回数据
            issues_data = []
            for issue in issues_page:
                issues_data.append(
                    {
                        "id": issue.id,
                        "issue_title": issue.issue_title,
                        "issue_description": issue.issue_description,
                        "category": issue.category,
                        "create_time": issue.create_time,
                    }
                )

            return Response(
                {
                    "success": True,
                    "data": {
                        "issues": issues_data,
                        "total_count": total_count,
                        "page": page,
                        "page_size": page_size,
                        "total_pages": (total_count + page_size - 1) // page_size,
                    },
                }
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"获取问题记录失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class QuestionTagView(APIView):
    """获取问题标签列表（返回6个固定标签）"""

    # 定义6个固定的标签
    FIXED_TAGS = [
        {
            "id": 1,
            "name": "饮食健康",
            "category": "健康",
            "description": "宝宝饮食营养、喂养方式等相关问题",
            "usage_count": 0,
        },
        {
            "id": 2,
            "name": "睡眠问题",
            "category": "生活",
            "description": "宝宝睡眠习惯、作息调整等相关问题",
            "usage_count": 0,
        },
        {
            "id": 3,
            "name": "行为培养",
            "category": "教育",
            "description": "宝宝行为习惯、性格培养等相关问题",
            "usage_count": 0,
        },
        {
            "id": 4,
            "name": "日常护理",
            "category": "健康",
            "description": "宝宝日常护理、健康保健等相关问题",
            "usage_count": 0,
        },
        {
            "id": 5,
            "name": "知识启蒙",
            "category": "教育",
            "description": "宝宝早期教育、智力开发等相关问题",
            "usage_count": 0,
        },
        {
            "id": 6,
            "name": "趣味陪伴",
            "category": "生活",
            "description": "亲子互动、游戏娱乐等相关问题",
            "usage_count": 0,
        },
    ]

    def get(self, request):
        try:
            category = request.GET.get("category", "")

            # 根据category过滤固定标签
            tags_data = self.FIXED_TAGS
            if category:
                tags_data = [
                    tag for tag in self.FIXED_TAGS if tag["category"] == category
                ]

            return Response({"success": True, "data": {"tags": tags_data}})
        except Exception as e:
            return Response(
                {"success": False, "message": f"获取标签列表失败: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
