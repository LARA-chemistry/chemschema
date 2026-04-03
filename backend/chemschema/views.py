"""
REST API views for ChemSchema.
"""

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .chemistry import canonicalize, convert_format, depict_2d, get_properties
from .models import MoleculeRecord, ReactionRecord
from .serializers import (
    CanonicalizeSerializer,
    ConvertRequestSerializer,
    Depict2DRequestSerializer,
    MoleculeRecordSerializer,
    PropertiesRequestSerializer,
    ReactionRecordSerializer,
    SearchRequestSerializer,
)


# ── Molecule registry CRUD ────────────────────────────────────────────────────


class MoleculeViewSet(viewsets.ModelViewSet):
    """CRUD operations for the molecule registry."""

    queryset = MoleculeRecord.objects.all()
    serializer_class = MoleculeRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        name = self.request.query_params.get("name")
        if name:
            qs = qs.filter(name__icontains=name)
        formula = self.request.query_params.get("formula")
        if formula:
            qs = qs.filter(molecular_formula__iexact=formula)
        return qs

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request: Request) -> Response:
        """Simple text-based search across name, SMILES, and InChIKey."""
        q = request.query_params.get("q", "")
        if not q:
            return Response([], status=status.HTTP_200_OK)
        qs = MoleculeRecord.objects.filter(
            name__icontains=q
        ) | MoleculeRecord.objects.filter(
            smiles__icontains=q
        ) | MoleculeRecord.objects.filter(
            inchikey__iexact=q
        )
        serializer = MoleculeRecordSerializer(qs, many=True)
        return Response(serializer.data)


class ReactionViewSet(viewsets.ModelViewSet):
    """CRUD operations for the reaction registry."""

    queryset = ReactionRecord.objects.all()
    serializer_class = ReactionRecordSerializer


# ── Chemistry operations ──────────────────────────────────────────────────────


class ConvertFormatView(APIView):
    """Convert a molecule between chemistry file formats."""

    def post(self, request: Request) -> Response:
        ser = ConvertRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = convert_format(
            ser.validated_data["data"],
            ser.validated_data["from_format"],
            ser.validated_data["to_format"],
        )
        return Response(result)


class CanonicalizeView(APIView):
    """Canonicalize a SMILES string."""

    def post(self, request: Request) -> Response:
        ser = CanonicalizeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = canonicalize(ser.validated_data["smiles"])
        return Response(result)


class PropertiesView(APIView):
    """Compute molecular properties for a SMILES string."""

    def post(self, request: Request) -> Response:
        ser = PropertiesRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = get_properties(ser.validated_data["smiles"])
        return Response(result)


class Depict2DView(APIView):
    """Generate a 2D SVG depiction from a SMILES string."""

    def post(self, request: Request) -> Response:
        ser = Depict2DRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = depict_2d(
            ser.validated_data["smiles"],
            ser.validated_data.get("width", 300),
            ser.validated_data.get("height", 200),
        )
        return Response(result)


class StructureSearchView(APIView):
    """Search the molecule registry using substructure / similarity matching."""

    def post(self, request: Request) -> Response:
        ser = SearchRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        query = ser.validated_data["query"]
        search_type = ser.validated_data["search_type"]
        max_results = ser.validated_data.get("max_results", 50)

        # Simple text-based fallback search (replace with RDKit fingerprint
        # search for production use)
        qs = MoleculeRecord.objects.filter(smiles__icontains=query)[:max_results]
        results = [
            {
                "molecule_id": str(m.pk),
                "smiles": m.smiles,
                "name": m.name,
                "score": 1.0,
            }
            for m in qs
        ]
        return Response({"results": results, "ok": True, "error": ""})
