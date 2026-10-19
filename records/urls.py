from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExtractView, HealthView, SamplesView, TranscribeView, VetRecordViewSet

router = DefaultRouter()
router.register("records", VetRecordViewSet, basename="record")

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("samples/", SamplesView.as_view()),
    path("transcribe/", TranscribeView.as_view()),
    path("extract/", ExtractView.as_view()),
    path("", include(router.urls)),
]
