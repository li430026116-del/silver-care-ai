from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from user.utils import get_public_user

from .models import Badge, ThankLetter, UserBadge
from .serializers import (BadgeSerializer, ThankLetterSerializer,
                          UserBadgeSerializer)


class RankingsView(APIView):
    def get(self, request):
        user = get_public_user()
        return Response(
            {
                "code": 200,
                "message": "获取排行榜成功",
                "data": [
                    {
                        "user_id": user.id,
                        "name": user.name,
                        "role": user.role,
                        "rank": 1,
                        "points": user.points,
                    }
                ],
            },
            status=status.HTTP_200_OK,
        )


class BadgesView(APIView):
    def get(self, request):
        badges = Badge.objects.all()
        data = BadgeSerializer(badges, many=True).data
        return Response(
            {"code": 200, "message": "获取成就徽章列表成功", "data": data},
            status=status.HTTP_200_OK,
        )


class UserBadgesView(APIView):
    def get(self, request):
        user = get_public_user()
        user_badges = (
            UserBadge.objects.filter(user=user)
            .select_related("badge")
            .order_by("-obtain_time")
        )
        data = UserBadgeSerializer(user_badges, many=True).data
        return Response(
            {"code": 200, "message": "获取用户已获得的徽章成功", "data": data},
            status=status.HTTP_200_OK,
        )


class ThankLettersView(APIView):
    """感谢信列表视图"""

    def get(self, request):
        """获取感谢信列表"""
        # 获取查询参数
        is_featured = request.query_params.get("featured", None)
        category = request.query_params.get("category", None)

        # 构建查询集
        queryset = ThankLetter.objects.all()

        # 根据参数过滤
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == "true")

        if category:
            queryset = queryset.filter(help_category=category)

        # 序列化数据
        data = ThankLetterSerializer(queryset, many=True).data

        return Response(
            {"code": 200, "message": "获取感谢信列表成功", "data": data},
            status=status.HTTP_200_OK,
        )


class ThankLetterDetailView(APIView):
    """感谢信详情视图"""

    def get(self, request, letter_id):
        """获取单个感谢信详情"""
        try:
            thank_letter = ThankLetter.objects.get(id=letter_id)
            data = ThankLetterSerializer(thank_letter).data
            return Response(
                {"code": 200, "message": "获取感谢信详情成功", "data": data},
                status=status.HTTP_200_OK,
            )
        except ThankLetter.DoesNotExist:
            return Response(
                {"code": 404, "message": "感谢信不存在", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )
