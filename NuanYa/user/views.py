from math import ceil

from qa.models import Answer, OlderQuestion
from qa.serializers import AnswerSerializer, OlderQuestionSerializer
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OlderFavorite, PointsRecord
from .serializers import (ExpertiseTagsUpdateSerializer,
                          OlderFavoriteSerializer, PointsRecordSerializer,
                          UserSerializer, UserSettingsSerializer,
                          UserSettingsUpdateSerializer)
from .utils import ensure_user_settings, get_public_user


class UserInfoView(APIView):
    def get(self, request):
        user = get_public_user()
        data = UserSerializer(user).data
        return Response(
            {"code": 200, "message": "获取用户信息成功", "data": data},
            status=status.HTTP_200_OK,
        )


class MyFavoritesView(APIView):
    """老人端获取收藏列表接口"""

    def get(self, request):
        user = get_public_user()
        favorites = OlderFavorite.objects.filter(user=user).order_by("-create_time")
        data = OlderFavoriteSerializer(favorites, many=True).data
        return Response(
            {"code": 200, "message": "获取我的收藏列表成功", "data": data},
            status=status.HTTP_200_OK,
        )


class MyAnswersView(APIView):
    def get(self, request):
        user = get_public_user()
        answers = (
            Answer.objects.filter(user=user)
            .select_related("question")
            .order_by("-create_time")
        )
        data = AnswerSerializer(answers, many=True).data
        return Response(
            {"code": 200, "message": "获取我的回答列表成功", "data": data},
            status=status.HTTP_200_OK,
        )


class MyQuestionsView(APIView):
    def get(self, request):
        user = get_public_user()
        questions = OlderQuestion.objects.filter(user=user).order_by("-create_time")
        data = OlderQuestionSerializer(questions, many=True).data
        return Response(
            {"code": 200, "message": "获取我的提问列表成功", "data": data},
            status=status.HTTP_200_OK,
        )


class PointsRecordsView(APIView):
    def get(self, request):
        user = get_public_user()
        # Sanitize pagination inputs and cap page size to prevent excessive queries
        try:
            page = int(request.query_params.get("page", 1))
        except (TypeError, ValueError):
            page = 1
        try:
            size = int(request.query_params.get("size", 10))
        except (TypeError, ValueError):
            size = 10
        page = max(1, page)
        size = max(1, min(size, 100))

        qs = PointsRecord.objects.filter(user=user).order_by("-create_time")
        total = qs.count()
        total_page = ceil(total / size)
        start = (page - 1) * size
        end = start + size
        page_records = qs[start:end]
        data = PointsRecordSerializer(page_records, many=True).data
        return Response(
            {
                "code": 200,
                "message": "获取积分记录成功",
                "data": data,
                "page_info": {
                    "page": page,
                    "size": size,
                    "total": total,
                    "total_page": total_page,
                },
            },
            status=status.HTTP_200_OK,
        )


class SettingsView(APIView):
    def get(self, request):
        user = get_public_user()
        settings = ensure_user_settings(user)
        data = UserSettingsSerializer(settings).data
        return Response(
            {"code": 200, "message": "获取设置信息成功", "data": data},
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        user = get_public_user()
        settings = ensure_user_settings(user)
        serializer = UserSettingsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        settings.sound = serializer.validated_data["sound"]
        settings.notification = serializer.validated_data["notification"]
        settings.save(update_fields=["sound", "notification"])
        data = UserSettingsSerializer(settings).data
        return Response(
            {"code": 200, "message": "更新设置信息成功", "data": data},
            status=status.HTTP_200_OK,
        )


class ExpertiseTagsView(APIView):
    """用户擅长领域标签管理"""

    def get(self, request):
        """获取用户擅长领域标签"""
        user = get_public_user()
        return Response(
            {
                "code": 200,
                "message": "获取擅长领域成功",
                "data": {"expertise_tags": user.expertise_tags},
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        """更新用户擅长领域标签"""
        user = get_public_user()
        serializer = ExpertiseTagsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.expertise_tags = serializer.validated_data["expertise_tags"]
        user.save(update_fields=["expertise_tags"])

        return Response(
            {
                "code": 200,
                "message": "更新擅长领域成功",
                "data": {"expertise_tags": user.expertise_tags},
            },
            status=status.HTTP_200_OK,
        )
