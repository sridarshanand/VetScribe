from django.db import models


class VetRecord(models.Model):
    SEX_CHOICES = [("male", "Male"), ("female", "Female"), ("unknown", "Unknown")]
    REPRO_CHOICES = [("intact", "Intact"), ("neutered", "Neutered / spayed"), ("unknown", "Unknown")]
    UNIT_CHOICES = [("kg", "kg"), ("lb", "lb")]
    STATUS_CHOICES = [("draft", "Draft"), ("validated", "Validated")]
    SOURCE_CHOICES = [("text", "Typed / pasted"), ("voice", "Voice")]

    # Patient
    animal_name = models.CharField(max_length=120, blank=True)
    species = models.CharField(max_length=80, blank=True)
    breed = models.CharField(max_length=120, blank=True)
    age = models.CharField(max_length=60, blank=True)
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, blank=True)
    reproductive_status = models.CharField(max_length=10, choices=REPRO_CHOICES, blank=True)
    weight_value = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=2, choices=UNIT_CHOICES, blank=True)
    color_markings = models.CharField(max_length=150, blank=True)
    microchip_id = models.CharField(max_length=60, blank=True)

    # Owner
    owner_name = models.CharField(max_length=120, blank=True)
    owner_phone = models.CharField(max_length=40, blank=True)
    owner_email = models.EmailField(blank=True)
    owner_address = models.TextField(blank=True)

    # Visit
    visit_date = models.DateField(null=True, blank=True)
    veterinarian_name = models.CharField(max_length=120, blank=True)
    reason_for_visit = models.TextField(blank=True)

    # History & symptoms
    symptoms = models.JSONField(default=list, blank=True)  # list of strings
    symptom_duration = models.CharField(max_length=120, blank=True)
    medical_history = models.TextField(blank=True)
    vaccination_history = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    diet = models.TextField(blank=True)

    # Examination
    temperature = models.CharField(max_length=40, blank=True)
    heart_rate = models.CharField(max_length=40, blank=True)
    respiratory_rate = models.CharField(max_length=40, blank=True)
    physical_exam = models.TextField(blank=True)

    # Diagnosis & plan
    diagnosis = models.TextField(blank=True)
    tests = models.JSONField(default=list, blank=True)  # list of strings
    procedures = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    medications = models.JSONField(default=list, blank=True)  # list of {name,dose,route,frequency,duration}
    follow_up = models.TextField(blank=True)
    owner_instructions = models.TextField(blank=True)
    additional_notes = models.TextField(blank=True)

    # Review bookkeeping
    original_text = models.TextField(blank=True)
    source = models.CharField(max_length=5, choices=SOURCE_CHOICES, default="text")
    flagged_fields = models.JSONField(default=list, blank=True)  # [{"field": "...", "reason": "..."}]
    ai_extraction = models.JSONField(default=dict, blank=True)  # raw AI output + evidence, for audit
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.animal_name or 'Unnamed'} ({self.species or 'unknown species'}) - {self.owner_name or 'no owner'}"
