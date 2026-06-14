"""
URL configuration for nuanya project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("qa.urls")),
    path("", include("user.urls")),
    path("", include("honors.urls")),
    path("", include("voice.urls")),
    path("api/", include("mominteractions.urls")),  # 添加妈妈端路由
    # 前端 Demo 页面（同源访问，避免跨域问题）
    path(
        "demo/",
        RedirectView.as_view(url="/demo-static/nuanya_demo.html", permanent=False),
    ),
]

# 在开发模式下，提供上传媒体文件的访问路由
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # 为前端 demo 提供静态资源访问（图片等）
    urlpatterns += static("demo-static/", document_root=settings.DEMO_STATIC_ROOT)
