from django.urls import path

from .views import (BadgesView, RankingsView, ThankLetterDetailView,
                    ThankLettersView, UserBadgesView)

urlpatterns = [
    path("api/rankings", RankingsView.as_view()),
    path("api/badges", BadgesView.as_view()),
    path("api/users/me/badges", UserBadgesView.as_view()),
    path("api/thank-letters", ThankLettersView.as_view()),
    path("api/thank-letters/<int:letter_id>", ThankLetterDetailView.as_view()),
]
