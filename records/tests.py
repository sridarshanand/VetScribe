from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from . import ai_services
from .models import VetRecord


class NormalizeTests(SimpleTestCase):
    def test_missing_fields_stay_empty(self):
        raw = {"fields": {"animal_name": "Bella", "species": "dog"}, "evidence": {"animal_name": "Bella", "species": "dog"}}
        out = ai_services.normalize_extraction(raw, "Bella is a dog.")
        self.assertEqual(out["fields"]["breed"], "")
        self.assertEqual(out["fields"]["symptoms"], [])
        self.assertIsNone(out["fields"]["weight_value"])
        self.assertEqual(out["flagged_fields"], [])

    def test_quote_not_in_note_is_flagged(self):
        raw = {"fields": {"breed": "Beagle"}, "evidence": {"breed": "a beagle puppy"}}
        out = ai_services.normalize_extraction(raw, "Bella is a dog.")
        self.assertEqual([f["field"] for f in out["flagged_fields"]], ["breed"])

    def test_invented_weight_is_flagged(self):
        raw = {"fields": {"weight_value": 12, "weight_unit": "kg"}, "evidence": {"weight_value": "dog"}}
        out = ai_services.normalize_extraction(raw, "A dog with no weight taken.")
        self.assertIn("weight_value", [f["field"] for f in out["flagged_fields"]])

    def test_invalid_enum_is_dropped(self):
        out = ai_services.normalize_extraction({"fields": {"sex": "boy"}}, "x")
        self.assertEqual(out["fields"]["sex"], "")

    def test_ai_uncertain_field_is_flagged(self):
        raw = {"fields": {"age": "8 years"}, "evidence": {"age": "around 8"}, "uncertain_fields": [{"field": "age", "reason": "said maybe"}]}
        out = ai_services.normalize_extraction(raw, "maybe around 8 years old")
        self.assertEqual(out["flagged_fields"][0]["reason"], "said maybe")


class ApiTests(APITestCase):
    def test_health(self):
        self.assertEqual(self.client.get("/api/health/").status_code, 200)

    def test_extract_rejects_short_text(self):
        res = self.client.post("/api/extract/", {"text": "hi"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    @patch("records.views.extract_fields")
    def test_extract_returns_result(self, mocked):
        mocked.return_value = {"fields": {"animal_name": "Bella"}, "flagged_fields": [], "evidence": {}}
        res = self.client.post("/api/extract/", {"text": "Bella the dog came in today."}, format="json")
        self.assertEqual(res.json()["fields"]["animal_name"], "Bella")

    @patch("records.views.transcribe_audio", return_value="Bella is a dog")
    def test_transcribe(self, _):
        audio = SimpleUploadedFile("recording.webm", b"x" * 2000, content_type="audio/webm")
        res = self.client.post("/api/transcribe/", {"audio": audio}, format="multipart")
        self.assertEqual(res.json()["text"], "Bella is a dog")

    def test_transcribe_requires_file(self):
        self.assertEqual(self.client.post("/api/transcribe/", {}, format="multipart").status_code, 400)

    def test_create_list_update_delete(self):
        res = self.client.post("/api/records/", {"animal_name": "Rex", "species": "Dog", "owner_name": "Sam"}, format="json")
        self.assertEqual(res.status_code, 201)
        rid = res.json()["id"]
        self.assertEqual(len(self.client.get("/api/records/?search=rex").json()), 1)
        res = self.client.put(f"/api/records/{rid}/", {"animal_name": "Rexy", "species": "Dog", "owner_name": "Sam"}, format="json")
        self.assertEqual(res.json()["animal_name"], "Rexy")
        self.assertEqual(self.client.delete(f"/api/records/{rid}/").status_code, 204)

    def test_cannot_validate_with_open_flags(self):
        data = {"animal_name": "Rex", "species": "Dog", "owner_name": "Sam", "status": "validated",
                "flagged_fields": [{"field": "age", "reason": "unsure"}]}
        res = self.client.post("/api/records/", data, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("flagged_fields", res.json())

    def test_cannot_validate_without_required(self):
        res = self.client.post("/api/records/", {"animal_name": "Rex", "status": "validated"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_weight_needs_unit(self):
        res = self.client.post("/api/records/", {"weight_value": "5"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(VetRecord.objects.count(), 0)
