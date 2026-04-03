"""
REST API serialisers for ChemSchema.
"""

from rest_framework import serializers

from .models import MoleculeRecord, ReactionRecord


class MoleculeRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoleculeRecord
        fields = [
            "id",
            "name",
            "smiles",
            "molfile",
            "inchi",
            "inchikey",
            "molecular_formula",
            "molecular_weight",
            "properties",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReactionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReactionRecord
        fields = [
            "id",
            "name",
            "reaction_smiles",
            "rxn_block",
            "reactants",
            "products",
            "agents",
            "properties",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ── Chemistry operation serialisers ──────────────────────────────────────────

class ConvertRequestSerializer(serializers.Serializer):
    data = serializers.CharField()
    from_format = serializers.ChoiceField(
        choices=["smiles", "mol", "sdf", "inchi", "inchikey", "cml", "rxn", "rsmiles"]
    )
    to_format = serializers.ChoiceField(
        choices=["smiles", "mol", "sdf", "inchi", "inchikey", "cml", "rxn", "rsmiles"]
    )


class ConvertResponseSerializer(serializers.Serializer):
    data = serializers.CharField()
    ok = serializers.BooleanField()
    error = serializers.CharField(allow_blank=True, default="")


class CanonicalizeSerializer(serializers.Serializer):
    smiles = serializers.CharField()


class CanonicalizeResponseSerializer(serializers.Serializer):
    smiles = serializers.CharField()
    ok = serializers.BooleanField()
    error = serializers.CharField(allow_blank=True, default="")


class PropertiesRequestSerializer(serializers.Serializer):
    smiles = serializers.CharField()


class MolecularPropertiesSerializer(serializers.Serializer):
    molecular_weight = serializers.FloatField()
    molecular_formula = serializers.CharField()
    exact_molecular_weight = serializers.FloatField()
    logp = serializers.FloatField()
    num_rotatable_bonds = serializers.IntegerField()
    num_h_donors = serializers.IntegerField()
    num_h_acceptors = serializers.IntegerField()
    num_rings = serializers.IntegerField()
    num_aromatic_rings = serializers.IntegerField()
    inchi = serializers.CharField(allow_blank=True)
    inchikey = serializers.CharField(allow_blank=True)
    canonical_smiles = serializers.CharField(allow_blank=True)


class PropertiesResponseSerializer(serializers.Serializer):
    properties = MolecularPropertiesSerializer()
    ok = serializers.BooleanField()
    error = serializers.CharField(allow_blank=True, default="")


class Depict2DRequestSerializer(serializers.Serializer):
    smiles = serializers.CharField()
    width = serializers.IntegerField(default=300, min_value=50, max_value=2000)
    height = serializers.IntegerField(default=200, min_value=50, max_value=2000)


class Depict2DResponseSerializer(serializers.Serializer):
    svg = serializers.CharField(allow_blank=True)
    ok = serializers.BooleanField()
    error = serializers.CharField(allow_blank=True, default="")


class SearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField()
    search_type = serializers.ChoiceField(
        choices=["substructure", "similarity", "exact"],
        default="substructure",
    )
    threshold = serializers.FloatField(default=0.7, min_value=0.0, max_value=1.0)
    max_results = serializers.IntegerField(default=50, min_value=1, max_value=1000)


class SearchResultSerializer(serializers.Serializer):
    molecule_id = serializers.CharField()
    smiles = serializers.CharField()
    name = serializers.CharField(allow_blank=True)
    score = serializers.FloatField()


class SearchResponseSerializer(serializers.Serializer):
    results = SearchResultSerializer(many=True)
    ok = serializers.BooleanField()
    error = serializers.CharField(allow_blank=True, default="")
