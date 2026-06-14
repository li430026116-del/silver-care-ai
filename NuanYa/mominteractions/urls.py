from django.urls import path

from . import views

urlpatterns = [
    # 妈妈用户管理
    path("mom/register/", views.MomRegisterView.as_view(), name="mom_register"),
    path("mom/profile/", views.MomProfileView.as_view(), name="mom_profile"),
    # 感谢信功能
    path(
        "mom/thank-letters/send/",
        views.ThankLetterView.as_view(),
        name="send_thank_letter",
    ),
    path(
        "mom/thank-letters/my/",
        views.MyThankLettersView.as_view(),
        name="my_thank_letters",
    ),
    # 问题相关功能
    path("mom/questions/ask/", views.QuestionView.as_view(), name="ask_question"),
    path("mom/questions/my/", views.MyQuestionsView.as_view(), name="my_questions"),
    path(
        "mom/questions/search/",
        views.QuestionSearchView.as_view(),
        name="search_questions",
    ),
    path(
        "mom/questions/<int:question_id>/",
        views.QuestionDetailView.as_view(),
        name="question_detail",
    ),
    path(
        "mom/questions/<int:question_id>/answers/",
        views.QuestionAnswersView.as_view(),
        name="question_answers",
    ),
    path(
        "mom/questions/<int:question_id>/interactions/",
        views.UserInteractionsView.as_view(),
        name="user_interactions",
    ),
    # 点赞和收藏功能
    path("mom/answers/like/", views.AnswerLikeView.as_view(), name="like_answer"),
    path("mom/answers/unlike/", views.AnswerLikeView.as_view(), name="unlike_answer"),
    path(
        "mom/answers/toggle-like/", views.ToggleLikeView.as_view(), name="toggle_like"
    ),
    path(
        "mom/answers/favorite/",
        views.AnswerFavoriteView.as_view(),
        name="favorite_answer",
    ),
    path(
        "mom/answers/toggle-favorite/",
        views.ToggleFavoriteView.as_view(),
        name="toggle_favorite",
    ),
    path(
        "mom/answers/submit-thanks/",
        views.SubmitThanksView.as_view(),
        name="submit_thanks",
    ),
    path("mom/favorites/", views.FavoriteListView.as_view(), name="get_favorites"),
    # 宝宝常见问题
    path(
        "mom/baby-issues/record/",
        views.BabyIssueView.as_view(),
        name="record_baby_issue",
    ),
    path("mom/baby-issues/", views.BabyIssueListView.as_view(), name="get_baby_issues"),
    # 问题标签
    path(
        "mom/question-tags/", views.QuestionTagView.as_view(), name="get_question_tags"
    ),
]
