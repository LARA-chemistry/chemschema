"""
Django admin registrations for ChemSchema.
"""

from django.contrib import admin

from .models import MoleculeRecord, ReactionRecord


@admin.register(MoleculeRecord)
class MoleculeRecordAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "smiles", "molecular_formula", "molecular_weight", "created_at"]
    list_filter  = ["created_at"]
    search_fields = ["name", "smiles", "inchikey", "molecular_formula"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ReactionRecord)
class ReactionRecordAdmin(admin.ModelAdmin):
    list_display  = ["id", "name", "reaction_smiles", "created_at"]
    list_filter   = ["created_at"]
    search_fields = ["name", "reaction_smiles"]
    readonly_fields = ["created_at", "updated_at"]
    filter_horizontal = ["reactants", "products", "agents"]
