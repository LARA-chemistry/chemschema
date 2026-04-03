"""
Unit tests for the gRPC servicer (ChemSchemaServicer).

These tests exercise the servicer methods directly — no running gRPC server
is needed.  Simple namespace objects act as proto request stubs, and a tiny
context stub satisfies the servicer's ``context`` parameter.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from django.test import TestCase

from chemschema.grpc_servicer import ChemSchemaServicer


# ── Helpers ───────────────────────────────────────────────────────────────────


def _ctx():
    """Minimal gRPC context stub (no-ops for all methods)."""
    return SimpleNamespace(
        abort=lambda code, details: None,
        set_code=lambda code: None,
        set_details=lambda details: None,
    )


def _req(**kwargs):
    """Build a proto-request-like object with the given keyword attributes."""
    return SimpleNamespace(**kwargs)


# ── Tests ─────────────────────────────────────────────────────────────────────


class TestChemSchemaServicer(TestCase):
    """Unit-level tests for each ChemSchemaServicer method."""

    def setUp(self):
        self.svc = ChemSchemaServicer()
        self.ctx = _ctx()

    # ── Canonicalize ──────────────────────────────────────────────────────────

    def test_canonicalize_returns_ok_key(self):
        req = _req(smiles="c1ccccc1")
        result = self.svc.Canonicalize(req, self.ctx)
        self.assertIn("ok", result)
        self.assertIn("smiles", result)
        # SMILES must be a non-empty string (canonical or original fallback)
        self.assertIsInstance(result["smiles"], str)
        self.assertTrue(len(result["smiles"]) > 0)

    def test_canonicalize_returns_ok_or_rdkit_error(self):
        """Accepts both success (RDKit present) and graceful failure stub."""
        req = _req(smiles="CCO")
        result = self.svc.Canonicalize(req, self.ctx)
        # ok is True when RDKit is available, False otherwise
        self.assertIsInstance(result["ok"], bool)
        self.assertIn("smiles", result)
        if result["ok"]:
            # RDKit available: ethanol should canonicalize to "CCO"
            self.assertEqual(result["smiles"], "CCO")
        else:
            # Stub mode: original SMILES is echoed back
            self.assertEqual(result["smiles"], "CCO")

    def test_canonicalize_invalid_smiles_handled(self):
        req = _req(smiles="not-a-smiles!!!")
        result = self.svc.Canonicalize(req, self.ctx)
        # Must never raise; ok may be True or False depending on RDKit availability
        self.assertIn("ok", result)

    # ── GetProperties ─────────────────────────────────────────────────────────

    def test_get_properties_returns_ok_key(self):
        req = _req(smiles="CCO")
        result = self.svc.GetProperties(req, self.ctx)
        self.assertIn("ok", result)

    def test_get_properties_returns_properties_key(self):
        req = _req(smiles="c1ccccc1")
        result = self.svc.GetProperties(req, self.ctx)
        self.assertIn("properties", result)

    def test_get_properties_invalid_smiles_handled(self):
        req = _req(smiles="INVALID")
        result = self.svc.GetProperties(req, self.ctx)
        self.assertIn("ok", result)

    # ── Depict2D ──────────────────────────────────────────────────────────────

    def test_depict2d_returns_svg(self):
        req = _req(smiles="C", width=200, height=150)
        result = self.svc.Depict2D(req, self.ctx)
        self.assertIn("svg", result)
        self.assertIn("ok", result)
        self.assertIn("<svg", result["svg"])

    def test_depict2d_uses_default_dimensions(self):
        """Servicer falls back to width=300/height=200 when attrs are absent.

        The stub SVG (returned when RDKit is unavailable) embeds the width and
        height values; validate they reflect the defaults.
        """
        req = _req(smiles="c1ccccc1")
        result = self.svc.Depict2D(req, self.ctx)
        self.assertIn("svg", result)
        svg = result["svg"]
        # Both stub and RDKit SVGs include the dimensions in the <svg> element
        self.assertIn("300", svg)
        self.assertIn("200", svg)

    def test_depict2d_invalid_smiles_handled(self):
        req = _req(smiles="NOTSMILES", width=100, height=100)
        result = self.svc.Depict2D(req, self.ctx)
        self.assertIn("ok", result)

    # ── ConvertFormat ─────────────────────────────────────────────────────────

    def test_convert_format_returns_ok_key(self):
        # Format code 0 = smiles, 1 = mol
        req = _req(data="CCO", from_format=0, to_format=1)
        result = self.svc.ConvertFormat(req, self.ctx)
        self.assertIn("ok", result)
        self.assertIn("data", result)

    def test_convert_format_same_format(self):
        req = _req(data="c1ccccc1", from_format=0, to_format=0)
        result = self.svc.ConvertFormat(req, self.ctx)
        self.assertIn("ok", result)

    def test_convert_format_inchi(self):
        req = _req(data="CCO", from_format=0, to_format=3)  # smiles -> inchi
        result = self.svc.ConvertFormat(req, self.ctx)
        self.assertIn("ok", result)
        self.assertIn("data", result)
        if result["ok"]:
            # RDKit available: result should be a valid InChI string
            self.assertTrue(
                result["data"].startswith("InChI="),
                f"Expected InChI string, got: {result['data']!r}",
            )

    # ── Search ────────────────────────────────────────────────────────────────

    def test_search_returns_results_key(self):
        req = _req(query="CC", search_type=0, threshold=0.7, max_results=10)
        result = self.svc.Search(req, self.ctx)
        self.assertIn("results", result)
        self.assertIn("ok", result)
        # results must be a list
        self.assertIsInstance(result["results"], list)

    def test_search_ok_is_true(self):
        req = _req(query="benzene", search_type=0, threshold=0.7, max_results=50)
        result = self.svc.Search(req, self.ctx)
        self.assertTrue(result["ok"])
        # Current stub always returns an empty list; it must not exceed max_results
        self.assertLessEqual(len(result["results"]), 50)

    # ── Format name helper ────────────────────────────────────────────────────

    def test_format_name_known_codes(self):
        expected = {
            0: "smiles",
            1: "mol",
            2: "sdf",
            3: "inchi",
            4: "inchikey",
            5: "cml",
            6: "rxn",
            7: "rsmiles",
        }
        for code, name in expected.items():
            self.assertEqual(self.svc._format_name(code), name)

    def test_format_name_unknown_defaults_to_smiles(self):
        self.assertEqual(self.svc._format_name(999), "smiles")

    # ── Server factory ────────────────────────────────────────────────────────

    def test_create_grpc_server_returns_or_raises(self):
        """create_grpc_server must either return a server or raise ImportError."""
        from chemschema.grpc_servicer import create_grpc_server

        try:
            server = create_grpc_server(port=0)
            # grpcio present: server should have start() method
            self.assertTrue(callable(getattr(server, "start", None)))
        except ImportError:
            pass  # grpcio not installed – expected in CI without the extra
