"""
Initial migration for ChemSchema.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MoleculeRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name",              models.CharField(blank=True, default="", max_length=255)),
                ("smiles",            models.TextField(help_text="Canonical SMILES string")),
                ("molfile",           models.TextField(blank=True, default="", help_text="MDL MOL V2000 block")),
                ("inchi",             models.TextField(blank=True, default="", help_text="Standard InChI string")),
                ("inchikey",          models.CharField(blank=True, db_index=True, default="", help_text="InChIKey", max_length=27)),
                ("molecular_formula", models.CharField(blank=True, default="", max_length=100)),
                ("molecular_weight",  models.FloatField(blank=True, null=True)),
                ("created_at",        models.DateTimeField(auto_now_add=True)),
                ("updated_at",        models.DateTimeField(auto_now=True)),
                ("properties",        models.JSONField(blank=True, default=dict)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Molecule", "verbose_name_plural": "Molecules"},
        ),
        migrations.CreateModel(
            name="ReactionRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name",            models.CharField(blank=True, default="", max_length=255)),
                ("reaction_smiles", models.TextField(help_text="Reaction SMILES (reactants>agents>products)")),
                ("rxn_block",       models.TextField(blank=True, default="", help_text="MDL RXN block")),
                ("created_at",      models.DateTimeField(auto_now_add=True)),
                ("updated_at",      models.DateTimeField(auto_now=True)),
                ("properties",      models.JSONField(blank=True, default=dict)),
                (
                    "reactants",
                    models.ManyToManyField(
                        blank=True,
                        related_name="reactions_as_reactant",
                        to="chemschema.moleculerecord",
                    ),
                ),
                (
                    "products",
                    models.ManyToManyField(
                        blank=True,
                        related_name="reactions_as_product",
                        to="chemschema.moleculerecord",
                    ),
                ),
                (
                    "agents",
                    models.ManyToManyField(
                        blank=True,
                        related_name="reactions_as_agent",
                        to="chemschema.moleculerecord",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Reaction", "verbose_name_plural": "Reactions"},
        ),
    ]
