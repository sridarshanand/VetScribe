"""Example notes for testing (loaded in the UI) and example records (loaded with `manage.py load_samples`)."""

SAMPLE_NOTES = [
    {
        "id": "dog-gastro",
        "title": "Dog - vomiting (complete note)",
        "text": (
            "Visit on 2025-03-14. Patient is Bella, a three year old spayed female Labrador Retriever, "
            "weight 28 kg, golden coat. Owner is Priya Sharma, phone 98765 43210, 12 MG Road, Bengaluru. "
            "Bella has been vomiting for two days, refusing food and is lethargic. History of a skin allergy "
            "last year, vaccinations up to date. Temperature 39.4, heart rate 110. Mild abdominal pain on palpation. "
            "Suspected gastroenteritis. Ran a CBC and chemistry panel, results pending. Started ondansetron 4 mg "
            "orally twice daily for 3 days and a bland diet. Recheck in 3 days. Seen by Dr. Mehta."
        ),
    },
    {
        "id": "cat-uncertain",
        "title": "Cat - vague note (shows review flags)",
        "text": (
            "Cat named Whiskers, maybe around 8 years old, orange tabby, male I think. Owner Rahul called about "
            "sneezing and watery eyes for about a week. No weight taken today. Might be an upper respiratory "
            "infection but not confirmed. Prescribed amoxicillin, dose to be confirmed. Come back if no improvement."
        ),
    },
    {
        "id": "rabbit-checkup",
        "title": "Rabbit - routine check",
        "text": (
            "Quick note: Coco, six month old female Holland Lop rabbit, 1.2 kg. Owner Anita Desai, email "
            "anita.desai@example.com. Presented for routine check and vaccination. Eating well, normal droppings. "
            "RHDV2 vaccine given today. Next vaccine due in 12 months."
        ),
    },
]

SAMPLE_RECORDS = [
    {
        "animal_name": "Bella", "species": "Dog", "breed": "Labrador Retriever", "age": "3 years",
        "sex": "female", "reproductive_status": "neutered", "weight_value": "28.00", "weight_unit": "kg",
        "color_markings": "Golden", "owner_name": "Priya Sharma", "owner_phone": "98765 43210",
        "owner_address": "12 MG Road, Bengaluru", "visit_date": "2025-03-14", "veterinarian_name": "Dr. Mehta",
        "reason_for_visit": "Vomiting for two days", "symptoms": ["Vomiting", "Refusing food", "Lethargy"],
        "symptom_duration": "2 days", "medical_history": "Skin allergy last year",
        "vaccination_history": "Up to date", "temperature": "39.4", "heart_rate": "110",
        "physical_exam": "Mild abdominal pain on palpation", "diagnosis": "Suspected gastroenteritis",
        "tests": ["CBC (results pending)", "Chemistry panel (results pending)"], "treatment": "Bland diet",
        "medications": [{"name": "Ondansetron", "dose": "4 mg", "route": "oral", "frequency": "twice daily", "duration": "3 days"}],
        "follow_up": "Recheck in 3 days", "status": "validated", "source": "text",
    },
    {
        "animal_name": "Coco", "species": "Rabbit", "breed": "Holland Lop", "age": "6 months", "sex": "female",
        "weight_value": "1.20", "weight_unit": "kg", "owner_name": "Anita Desai",
        "owner_email": "anita.desai@example.com", "reason_for_visit": "Routine check and vaccination",
        "medical_history": "", "physical_exam": "Eating well, normal droppings",
        "treatment": "RHDV2 vaccine given", "follow_up": "Next vaccine due in 12 months",
        "status": "draft", "source": "text",
    },
]
