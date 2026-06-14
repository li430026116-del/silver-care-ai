from django.urls import path

from .views import AnswerCreateView, ElderUnansweredQuestionsView, UnansweredQuestionsView

urlpatterns = [
    path("api/questions/unanswered", UnansweredQuestionsView.as_view()),
    path("api/elder/questions/unanswered", ElderUnansweredQuestionsView.as_view()),
    path("api/answers", AnswerCreateView.as_view()),
]
