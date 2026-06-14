from django.urls import path

from .views import (ExpertiseTagsView, MyAnswersView, MyFavoritesView,
                    MyQuestionsView, PointsRecordsView, SettingsView,
                    UserInfoView)

urlpatterns = [
    path("api/users/me", UserInfoView.as_view()),
    path("api/users/me/answers", MyAnswersView.as_view()),
    path("api/users/me/questions", MyQuestionsView.as_view()),
    path("api/users/me/favorites", MyFavoritesView.as_view()),
    path("api/users/me/points_records", PointsRecordsView.as_view()),
    path("api/settings", SettingsView.as_view()),
    path("api/users/me/expertise_tags", ExpertiseTagsView.as_view()),
]
