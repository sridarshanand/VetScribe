from django.contrib import admin

from .models import VetRecord


@admin.register(VetRecord)
class VetRecordAdmin(admin.ModelAdmin):
    list_display = ("animal_name", "species", "owner_name", "diagnosis", "status", "updated_at")
    list_filter = ("status", "species", "source")
    search_fields = ("animal_name", "owner_name", "diagnosis")
