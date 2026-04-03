"""
Data models for ChemSchema.

Molecules and reactions can optionally be persisted to the database.
The full chemistry processing is done in-memory via RDKit (optional
dependency); the models store the serialised representation only.
"""

from django.db import models


class MoleculeRecord(models.Model):
    """A molecule stored in the ChemSchema registry."""

    name = models.CharField(max_length=255, blank=True, default="")
    smiles = models.TextField(help_text="Canonical SMILES string")
    molfile = models.TextField(blank=True, default="", help_text="MDL MOL V2000 block")
    inchi = models.TextField(blank=True, default="", help_text="Standard InChI string")
    inchikey = models.CharField(
        max_length=27, blank=True, default="", db_index=True, help_text="InChIKey"
    )
    molecular_formula = models.CharField(max_length=100, blank=True, default="")
    molecular_weight = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Arbitrary key=value properties (stored as JSON)
    properties = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Molecule"
        verbose_name_plural = "Molecules"

    def __str__(self) -> str:
        return self.name or self.smiles or f"Molecule #{self.pk}"


class ReactionRecord(models.Model):
    """A chemical reaction stored in the registry."""

    name = models.CharField(max_length=255, blank=True, default="")
    reaction_smiles = models.TextField(
        help_text="Reaction SMILES (reactants>agents>products)"
    )
    rxn_block = models.TextField(blank=True, default="", help_text="MDL RXN block")

    reactants = models.ManyToManyField(
        MoleculeRecord,
        related_name="reactions_as_reactant",
        blank=True,
    )
    products = models.ManyToManyField(
        MoleculeRecord,
        related_name="reactions_as_product",
        blank=True,
    )
    agents = models.ManyToManyField(
        MoleculeRecord,
        related_name="reactions_as_agent",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    properties = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Reaction"
        verbose_name_plural = "Reactions"

    def __str__(self) -> str:
        return self.name or self.reaction_smiles or f"Reaction #{self.pk}"
