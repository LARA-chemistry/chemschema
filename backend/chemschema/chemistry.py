"""
Chemistry utility functions.

Provides format conversion, property calculation, depiction, and search
using RDKit when available, with graceful fallback stubs when it is not
installed.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── RDKit availability check ──────────────────────────────────────────────────

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, Descriptors, Draw, inchi as rdInchi
    from rdkit.Chem import rdMolDescriptors

    RDKIT_AVAILABLE = True
except ImportError:
    RDKIT_AVAILABLE = False
    logger.info("RDKit not installed – chemistry operations will use fallback stubs.")


# ── Conversion ────────────────────────────────────────────────────────────────


def convert_format(data: str, from_format: str, to_format: str) -> dict[str, Any]:
    """Convert a chemical structure between formats."""
    if not RDKIT_AVAILABLE:
        return {"data": data, "ok": False, "error": "RDKit not installed"}

    try:
        mol = _load_mol(data, from_format)
        if mol is None:
            return {"data": "", "ok": False, "error": f"Could not parse {from_format} input"}
        result = _write_mol(mol, to_format)
        return {"data": result, "ok": True, "error": ""}
    except ValueError:
        logger.warning("convert_format: unsupported format requested")
        return {"data": "", "ok": False, "error": "Unsupported chemistry file format"}
    except Exception:
        logger.exception("convert_format error")
        return {"data": "", "ok": False, "error": "An error occurred during format conversion"}


def canonicalize(smiles: str) -> dict[str, Any]:
    """Return the canonical SMILES for the given input SMILES."""
    if not RDKIT_AVAILABLE:
        return {"smiles": smiles, "ok": False, "error": "RDKit not installed"}

    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {"smiles": "", "ok": False, "error": "Invalid SMILES"}
        canon = Chem.MolToSmiles(mol)
        return {"smiles": canon, "ok": True, "error": ""}
    except Exception:
        logger.exception("canonicalize error")
        return {"smiles": "", "ok": False, "error": "An error occurred during canonicalization"}


def get_properties(smiles: str) -> dict[str, Any]:
    """Compute molecular properties for a SMILES string."""
    if not RDKIT_AVAILABLE:
        return {
            "properties": _stub_properties(smiles),
            "ok": False,
            "error": "RDKit not installed",
        }

    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {"properties": {}, "ok": False, "error": "Invalid SMILES"}

        # Add Hs for exact MW
        mol_h = Chem.AddHs(mol)
        AllChem.EmbedMolecule(mol_h, AllChem.ETKDGv3())

        inc = rdInchi.MolToInchi(mol) or ""
        inchikey = rdInchi.InchiToInchiKey(inc) if inc else ""

        props = {
            "molecular_weight": round(Descriptors.MolWt(mol), 4),
            "molecular_formula": rdMolDescriptors.CalcMolFormula(mol),
            "exact_molecular_weight": round(Descriptors.ExactMolWt(mol), 6),
            "logp": round(Descriptors.MolLogP(mol), 3),
            "num_rotatable_bonds": rdMolDescriptors.CalcNumRotatableBonds(mol),
            "num_h_donors": rdMolDescriptors.CalcNumHBD(mol),
            "num_h_acceptors": rdMolDescriptors.CalcNumHBA(mol),
            "num_rings": rdMolDescriptors.CalcNumRings(mol),
            "num_aromatic_rings": rdMolDescriptors.CalcNumAromaticRings(mol),
            "inchi": inc,
            "inchikey": inchikey,
            "canonical_smiles": Chem.MolToSmiles(mol),
        }
        return {"properties": props, "ok": True, "error": ""}
    except Exception:
        logger.exception("get_properties error")
        return {"properties": {}, "ok": False, "error": "An error occurred computing properties"}


def depict_2d(smiles: str, width: int = 300, height: int = 200) -> dict[str, Any]:
    """Generate an SVG depiction for a SMILES string."""
    if not RDKIT_AVAILABLE:
        return {"svg": _stub_svg(smiles, width, height), "ok": True, "error": ""}

    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {"svg": "", "ok": False, "error": "Invalid SMILES"}

        AllChem.Compute2DCoords(mol)
        drawer = Draw.MolDraw2DSVG(width, height)
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()
        svg = drawer.GetDrawingText()
        return {"svg": svg, "ok": True, "error": ""}
    except Exception:
        logger.exception("depict_2d error")
        return {"svg": "", "ok": False, "error": "An error occurred during 2D depiction"}


# ── Fallback stubs ────────────────────────────────────────────────────────────


def _stub_properties(smiles: str) -> dict:
    """Return empty/zero properties when RDKit is not available."""
    return {
        "molecular_weight": 0.0,
        "molecular_formula": "",
        "exact_molecular_weight": 0.0,
        "logp": 0.0,
        "num_rotatable_bonds": 0,
        "num_h_donors": 0,
        "num_h_acceptors": 0,
        "num_rings": 0,
        "num_aromatic_rings": 0,
        "inchi": "",
        "inchikey": "",
        "canonical_smiles": smiles,
    }


def _stub_svg(smiles: str, width: int, height: int) -> str:
    """Return a minimal placeholder SVG when RDKit is not available."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">'
        f'<text x="10" y="20" font-family="monospace" font-size="12" fill="#666">{smiles}</text>'
        f"</svg>"
    )


# ── RDKit format helpers ──────────────────────────────────────────────────────


def _load_mol(data: str, fmt: str) -> Optional[Any]:
    """Load an RDKit Mol from a string in the given format."""
    fmt = fmt.lower()
    if fmt == "smiles":
        return Chem.MolFromSmiles(data)
    if fmt in ("mol", "molfile"):
        return Chem.MolFromMolBlock(data)
    if fmt == "sdf":
        suppl = Chem.SDMolSupplier()
        suppl.SetData(data)
        mols = [m for m in suppl if m is not None]
        return mols[0] if mols else None
    if fmt == "inchi":
        return rdInchi.MolFromInchi(data)
    raise ValueError(f"Unsupported input format: {fmt}")


def _write_mol(mol, fmt: str) -> str:
    """Serialise an RDKit Mol to the given format."""
    fmt = fmt.lower()
    if fmt == "smiles":
        return Chem.MolToSmiles(mol)
    if fmt in ("mol", "molfile"):
        return Chem.MolToMolBlock(mol)
    if fmt == "sdf":
        return Chem.MolToMolBlock(mol) + "\n$$$$\n"
    if fmt == "inchi":
        return rdInchi.MolToInchi(mol) or ""
    if fmt == "inchikey":
        inc = rdInchi.MolToInchi(mol) or ""
        return rdInchi.InchiToInchiKey(inc) if inc else ""
    raise ValueError(f"Unsupported output format: {fmt}")
