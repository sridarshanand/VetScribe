from django.core.management.base import BaseCommand

from records.models import VetRecord
from records.sample_data import SAMPLE_RECORDS


class Command(BaseCommand):
    help = "Insert sample veterinary records (safe to run more than once)."

    def handle(self, *args, **options):
        created = 0
        for data in SAMPLE_RECORDS:
            _, was_created = VetRecord.objects.get_or_create(
                animal_name=data["animal_name"], owner_name=data["owner_name"], defaults=data
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Sample records ready ({created} new)."))
