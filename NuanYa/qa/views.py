from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from user.utils import award_points_for_answer, get_public_user
from voice.models import VoiceRecord

from .matching import match_questions_to_user
from .models import Answer, OlderQuestion, Question
from .serializers import (AnswerCreateSerializer, OlderQuestionSerializer,
                          QuestionSerializer)


class UnansweredQuestionsView(APIView):
    def get(self, request):
        # 妈妈端的“我要解答”展示的是 OlderQuestion 表中的内容
        questions = OlderQuestion.objects.all().order_by("-create_time")

        data = OlderQuestionSerializer(questions, many=True).data
        return Response(
            {"code": 200, "message": "获取待回答问题列表成功", "data": data},
            status=status.HTTP_200_OK,
        )


class ElderUnansweredQuestionsView(APIView):
    def get(self, request):
        user = get_public_user()

        if hasattr(user, "expertise_tags") and user.expertise_tags:
            questions = match_questions_to_user(user.expertise_tags)
        else:
            questions = Question.objects.filter(answers__isnull=True).order_by(
                "-create_time"
            )

        data = QuestionSerializer(questions, many=True).data
        return Response(
            {"code": 200, "message": "获取待回答问题列表成功", "data": data},
            status=status.HTTP_200_OK,
        )


class AnswerCreateView(APIView):
    def post(self, request):
        serializer = AnswerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question_id = serializer.validated_data["question_id"]
        answer_text = serializer.validated_data["answer_text"]

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response(
                {"code": 404, "message": "问题不存在", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = get_public_user()

        voice_record = None
        voice_file_url = serializer.validated_data.get("voice_file_url")
        voice_format = serializer.validated_data.get("voice_format")
        voice_file_meta = serializer.validated_data.get("voice_file")
        if voice_file_url or voice_format or voice_file_meta:
            voice_record = VoiceRecord.objects.create(
                user=user,
                question=question,
                voice_file_url=voice_file_url or "",
                voice_format=voice_format
                or (voice_file_meta[:3].lower() if voice_file_meta else ""),
                transcribe_status=VoiceRecord.STATUS_PENDING,
            )

        answer = Answer.objects.create(
            user=user,
            question=question,
            answer_text=answer_text,
            voice_record=voice_record,
        )

        # Award points and update counters
        award_points_for_answer(user, answer)

        return Response(
            {
                "code": 200,
                "message": "语音提交成功，后端已开始转写并生成回答",
                "data": {
                    "answer_id": answer.id,
                    "voice_record_id": voice_record.id if voice_record else None,
                    "user_id": user.id,
                    "question_id": question.id,
                    "create_time": answer.create_time.isoformat(),
                },
            },
            status=status.HTTP_200_OK,
        )
