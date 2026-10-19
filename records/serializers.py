from rest_framework import serializers

from .models import VetRecord

MED_KEYS = ["name", "dose", "route", "frequency", "duration"]
REQUIRED_TO_VALIDATE = {"animal_name": "Animal name", "species": "Species", "owner_name": "Owner name"}


class VetRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = VetRecord
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def _string_list(self, value, label):
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{label} must be a list.")
        cleaned = []
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError(f"Every {label.lower()} entry must be text.")
            if item.strip():
                cleaned.append(item.strip())
        return cleaned

    def validate_symptoms(self, value):
        return self._string_list(value, "Symptoms")

    def validate_tests(self, value):
        return self._string_list(value, "Tests")

    def validate_medications(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Medications must be a list.")
        cleaned = []
        for i, item in enumerate(value, 1):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"Medication #{i} is not valid.")
            row = {k: str(item.get(k) or "").strip() for k in MED_KEYS}
            if not any(row.values()):
                continue
            if not row["name"]:
                raise serializers.ValidationError(f"Medication #{i} needs a drug name.")
            cleaned.append(row)
        return cleaned

    def validate_flagged_fields(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Flagged fields must be a list.")
        for item in value:
            if not isinstance(item, dict) or "field" not in item:
                raise serializers.ValidationError("Each flag needs a 'field' and a 'reason'.")
        return value

    def validate_weight_value(self, value):
        if value is not None and not (0 < value <= 2000):
            raise serializers.ValidationError("Weight must be greater than 0 and at most 2000.")
        return value

    def validate(self, attrs):
        def current(name, default=""):
            if name in attrs:
                return attrs[name]
            return getattr(self.instance, name, default) if self.instance else default

        if current("weight_value", None) is not None and not current("weight_unit"):
            raise serializers.ValidationError({"weight_unit": "Choose kg or lb for the weight."})

        if current("status", "draft") == "validated":
            missing = [label for key, label in REQUIRED_TO_VALIDATE.items() if not current(key)]
            if missing:
                raise serializers.ValidationError(
                    {"status": f"Cannot validate yet. Please fill in: {', '.join(missing)}."}
                )
            if current("flagged_fields", []):
                raise serializers.ValidationError(
                    {"flagged_fields": "Review every flagged field (edit it or click 'Looks correct') before validating."}
                )
        return attrs
