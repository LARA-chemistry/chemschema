"""
Pydantic schemas for the ChemSchema django-ninja API.
"""

from __future__ import annotations

from typing import Any, Literal, Optional
from ninja import Schema, ModelSchema
from .models import MoleculeRecord, ReactionRecord


# ── Registry schemas ──────────────────────────────────────────────────────────


class MoleculeIn(Schema):
    name: str = ""
    smiles: str
    molfile: str = ""
    inchi: str = ""
    inchikey: str = ""
    molecular_formula: str = ""
    molecular_weight: Optional[float] = None
    properties: dict[str, Any] = {}


class MoleculeOut(ModelSchema):
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


class MoleculePatch(Schema):
    name: Optional[str] = None
    smiles: Optional[str] = None
    molfile: Optional[str] = None
    inchi: Optional[str] = None
    inchikey: Optional[str] = None
    molecular_formula: Optional[str] = None
    molecular_weight: Optional[float] = None
    properties: Optional[dict[str, Any]] = None


class ReactionIn(Schema):
    name: str = ""
    reaction_smiles: str
    rxn_block: str = ""
    properties: dict[str, Any] = {}


class ReactionOut(ModelSchema):
    class Meta:
        model = ReactionRecord
        fields = [
            "id",
            "name",
            "reaction_smiles",
            "rxn_block",
            "properties",
            "created_at",
            "updated_at",
        ]


# ── Chemistry operation schemas ───────────────────────────────────────────────

ChemFormat = Literal[
    "smiles", "mol", "sdf", "inchi", "inchikey", "cml", "rxn", "rsmiles"
]
SearchType = Literal["substructure", "similarity", "exact"]


class ConvertRequest(Schema):
    data: str
    from_format: ChemFormat
    to_format: ChemFormat


class ConvertResponse(Schema):
    data: str
    ok: bool
    error: str = ""


class CanonicalizeRequest(Schema):
    smiles: str


class CanonicalizeResponse(Schema):
    smiles: str
    ok: bool
    error: str = ""


class PropertiesRequest(Schema):
    smiles: str


class MolecularProperties(Schema):
    molecular_weight: float = 0.0
    molecular_formula: str = ""
    exact_molecular_weight: float = 0.0
    logp: float = 0.0
    num_rotatable_bonds: int = 0
    num_h_donors: int = 0
    num_h_acceptors: int = 0
    num_rings: int = 0
    num_aromatic_rings: int = 0
    inchi: str = ""
    inchikey: str = ""
    canonical_smiles: str = ""


class PropertiesResponse(Schema):
    properties: dict[str, Any]
    ok: bool
    error: str = ""


class Depict2DRequest(Schema):
    smiles: str
    width: int = 300
    height: int = 200


class Depict2DResponse(Schema):
    svg: str
    ok: bool
    error: str = ""


class SearchRequest(Schema):
    query: str
    search_type: SearchType = "substructure"
    threshold: float = 0.7
    max_results: int = 50


class SearchResult(Schema):
    molecule_id: str
    smiles: str
    name: str = ""
    score: float


class SearchResponse(Schema):
    results: list[SearchResult]
    ok: bool
    error: str = ""
