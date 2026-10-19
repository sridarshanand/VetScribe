import os

from django.db import connection
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_services import AIServiceError, api_key_configured, extract_fields, transcribe_audio
from .models import VetRecord
from .sample_data import SAMPLE_NOTES
from .serializers import VetRecordSerializer

MAX_AUDIO_BYTES = 25 * 1024 * 1024
ALLOWED_AUDIO_EXT = {"flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"}


def error(message, code):
    return Response({"error": message}, status=code)


class HealthView(APIView):
    """GET /api/health/ - quick check that Django, the database and the API key are OK."""

    def get(self, request):
        try:
            connection.ensure_connection()
            db_ok = True
        except Exception:
            db_ok = False
        return Response({"status": "ok", "database": db_ok, "openai_key_configured": api_key_configured()})


class SamplesView(APIView):
    """GET /api/samples/ - example notes you can load into the app to test without a microphone."""

    def get(self, request):
        return Response(SAMPLE_NOTES)


class TranscribeView(APIView):
    """POST /api/transcribe/ (multipart, field name 'audio') -> {"text": "..."}"""

    parser_classes = [MultiPartParser]

    def post(self, request):
        audio = request.FILES.get("audio")
        if audio is None:
            return error("No audio file was received. Record or choose an audio file first.", 400)
        if audio.size < 1000:
            return error("The recording is empty or too short. Please record again.", 400)
        if audio.size > MAX_AUDIO_BYTES:
            return error("The audio file is larger than 25 MB. Please record a shorter clip.", 413)
        ext = os.path.splitext(audio.name or "")[1].lstrip(".").lower()
        if ext not in ALLOWED_AUDIO_EXT:
            return error(f"Unsupported audio type '.{ext}'. Use webm, mp4, m4a, mp3, wav, ogg or flac.", 415)
        content_type = (audio.content_type or "audio/webm").split(";")[0]
        try:
            text = transcribe_audio(audio.read(), audio.name, content_type)
        except AIServiceError as exc:
            return error(exc.message, exc.status)
        return Response({"text": text})


class ExtractView(APIView):
    """POST /api/extract/ {"text": "...", "source": "text|voice"} -> fields + flagged_fields + evidence"""

    def post(self, request):
        text = str(request.data.get("text") or "").strip()
        source = request.data.get("source") if request.data.get("source") in ("text", "voice") else "text"
        if len(text) < 15:
            return error("Please type, paste or record a longer note (at least 15 characters).", 400)
        if len(text) > 20000:
            return error("The note is too long (limit 20,000 characters). Please split it.", 400)
        try:
            result = extract_fields(text, source)
        except AIServiceError as exc:
            return error(exc.message, exc.status)
        return Response(result)


class VetRecordViewSet(viewsets.ModelViewSet):
    """Full CRUD: GET/POST /api/records/, GET/PUT/PATCH/DELETE /api/records/<id>/ (supports ?search= and ?status=)"""

    serializer_class = VetRecordSerializer

    def get_queryset(self):
        qs = VetRecord.objects.all()
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(animal_name__icontains=search) | Q(owner_name__icontains=search)
                | Q(species__icontains=search) | Q(diagnosis__icontains=search)
            )
        record_status = self.request.query_params.get("status")
        if record_status in ("draft", "validated"):
            qs = qs.filter(status=record_status)
        return qs
