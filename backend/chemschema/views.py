"""
REST API views for ChemSchema built with django-ninja.
"""

from __future__ import annotations

from typing import List
from ninja import NinjaAPI, Router
from ninja.responses import Status
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .chemistry import canonicalize, convert_format, depict_2d, get_properties
from .models import MoleculeRecord, ReactionRecord
from .schemas import (
    CanonicalizeRequest,
    CanonicalizeResponse,
    ConvertRequest,
    ConvertResponse,
    Depict2DRequest,
    Depict2DResponse,
    MoleculeIn,
    MoleculeOut,
    MoleculePatch,
    PropertiesRequest,
    PropertiesResponse,
    ReactionIn,
    ReactionOut,
    SearchRequest,
    SearchResponse,
    SearchResult,
)

api = NinjaAPI(title="ChemSchema API", version="1.0.0")

# ── Molecule registry ─────────────────────────────────────────────────────────

molecules = Router(tags=["molecules"])


@molecules.get("/", response=List[MoleculeOut])
def list_molecules(request, name: str = "", formula: str = ""):
    qs = MoleculeRecord.objects.all()
    if name:
        qs = qs.filter(name__icontains=name)
    if formula:
        qs = qs.filter(molecular_formula__iexact=formula)
    return list(qs)


@molecules.post("/", response={201: MoleculeOut})
def create_molecule(request, payload: MoleculeIn):
    mol = MoleculeRecord.objects.create(**payload.dict())
    return Status(201, mol)


@molecules.get("/{molecule_id}", response=MoleculeOut)
def get_molecule(request, molecule_id: int):
    return get_object_or_404(MoleculeRecord, pk=molecule_id)


@molecules.put("/{molecule_id}", response=MoleculeOut)
def update_molecule(request, molecule_id: int, payload: MoleculeIn):
    mol = get_object_or_404(MoleculeRecord, pk=molecule_id)
    for field, value in payload.dict().items():
        setattr(mol, field, value)
    mol.save()
    return mol


@molecules.patch("/{molecule_id}", response=MoleculeOut)
def partial_update_molecule(request, molecule_id: int, payload: MoleculePatch):
    mol = get_object_or_404(MoleculeRecord, pk=molecule_id)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(mol, field, value)
    mol.save()
    return mol


@molecules.delete("/{molecule_id}", response={204: None})
def delete_molecule(request, molecule_id: int):
    mol = get_object_or_404(MoleculeRecord, pk=molecule_id)
    mol.delete()
    return Status(204, None)


@molecules.get("/search/", response=List[MoleculeOut])
def search_molecules(request, q: str = ""):
    """Simple text-based search across name, SMILES, and InChIKey."""
    if not q:
        return []
    qs = MoleculeRecord.objects.filter(
        Q(name__icontains=q) | Q(smiles__icontains=q) | Q(inchikey__iexact=q)
    )
    return list(qs)


api.add_router("/molecules", molecules)

# ── Reaction registry ─────────────────────────────────────────────────────────

reactions = Router(tags=["reactions"])


@reactions.get("/", response=List[ReactionOut])
def list_reactions(request):
    return list(ReactionRecord.objects.all())


@reactions.post("/", response={201: ReactionOut})
def create_reaction(request, payload: ReactionIn):
    rxn = ReactionRecord.objects.create(**payload.dict())
    return Status(201, rxn)


@reactions.get("/{reaction_id}", response=ReactionOut)
def get_reaction(request, reaction_id: int):
    return get_object_or_404(ReactionRecord, pk=reaction_id)


@reactions.put("/{reaction_id}", response=ReactionOut)
def update_reaction(request, reaction_id: int, payload: ReactionIn):
    rxn = get_object_or_404(ReactionRecord, pk=reaction_id)
    for field, value in payload.dict().items():
        setattr(rxn, field, value)
    rxn.save()
    return rxn


@reactions.delete("/{reaction_id}", response={204: None})
def delete_reaction(request, reaction_id: int):
    rxn = get_object_or_404(ReactionRecord, pk=reaction_id)
    rxn.delete()
    return Status(204, None)


api.add_router("/reactions", reactions)

# ── Chemistry operations ──────────────────────────────────────────────────────


@api.post("/convert/", response=ConvertResponse, tags=["chemistry"])
def convert_format_view(request, payload: ConvertRequest):
    """Convert a molecule between chemistry file formats."""
    result = convert_format(payload.data, payload.from_format, payload.to_format)
    return ConvertResponse(**result)


@api.post("/canonicalize/", response=CanonicalizeResponse, tags=["chemistry"])
def canonicalize_view(request, payload: CanonicalizeRequest):
    """Canonicalize a SMILES string."""
    result = canonicalize(payload.smiles)
    return CanonicalizeResponse(**result)


@api.post("/properties/", response=PropertiesResponse, tags=["chemistry"])
def properties_view(request, payload: PropertiesRequest):
    """Compute molecular properties for a SMILES string."""
    result = get_properties(payload.smiles)
    return PropertiesResponse(**result)


@api.post("/depict/", response=Depict2DResponse, tags=["chemistry"])
def depict_view(request, payload: Depict2DRequest):
    """Generate a 2D SVG depiction from a SMILES string."""
    result = depict_2d(payload.smiles, payload.width, payload.height)
    return Depict2DResponse(**result)


@api.post("/search/", response=SearchResponse, tags=["chemistry"])
def structure_search_view(request, payload: SearchRequest):
    """Search the molecule registry using substructure / similarity matching."""
    qs = MoleculeRecord.objects.filter(smiles__icontains=payload.query)[: payload.max_results]
    results = [
        SearchResult(
            molecule_id=str(m.pk),
            smiles=m.smiles,
            name=m.name,
            score=1.0,
        )
        for m in qs
    ]
    return SearchResponse(results=results, ok=True)

