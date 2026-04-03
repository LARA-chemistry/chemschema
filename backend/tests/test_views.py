"""
Tests for the ChemSchema REST API.
"""

import json

import pytest
from django.test import TestCase
from rest_framework.test import APIClient

from chemschema.models import MoleculeRecord


class TestMoleculeAPI(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_list_molecules_empty(self):
        res = self.client.get("/api/v1/molecules/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 0)

    def test_create_molecule(self):
        payload = {"name": "Benzene", "smiles": "c1ccccc1"}
        res = self.client.post("/api/v1/molecules/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["smiles"], "c1ccccc1")
        self.assertEqual(data["name"], "Benzene")

    def test_retrieve_molecule(self):
        mol = MoleculeRecord.objects.create(name="Ethanol", smiles="CCO")
        res = self.client.get(f"/api/v1/molecules/{mol.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["smiles"], "CCO")

    def test_update_molecule(self):
        mol = MoleculeRecord.objects.create(name="Foo", smiles="C")
        res = self.client.patch(
            f"/api/v1/molecules/{mol.pk}/",
            {"name": "Methane"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Methane")

    def test_delete_molecule(self):
        mol = MoleculeRecord.objects.create(name="ToDelete", smiles="C")
        res = self.client.delete(f"/api/v1/molecules/{mol.pk}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(MoleculeRecord.objects.filter(pk=mol.pk).exists())


class TestChemistryEndpoints(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_canonicalize_returns_response(self):
        res = self.client.post(
            "/api/v1/canonicalize/",
            {"smiles": "c1ccccc1"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("smiles", data)
        self.assertIn("ok", data)

    def test_properties_returns_response(self):
        res = self.client.post(
            "/api/v1/properties/",
            {"smiles": "CCO"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ok", data)

    def test_depict_returns_svg_stub(self):
        res = self.client.post(
            "/api/v1/depict/",
            {"smiles": "C", "width": 200, "height": 150},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("svg", data)
        self.assertIn("ok", data)

    def test_convert_returns_response(self):
        res = self.client.post(
            "/api/v1/convert/",
            {"data": "CCO", "from_format": "smiles", "to_format": "mol"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ok", data)

    def test_search_returns_response(self):
        MoleculeRecord.objects.create(name="Aspirin", smiles="CC(=O)Oc1ccccc1C(=O)O")
        res = self.client.post(
            "/api/v1/search/",
            {"query": "CC", "search_type": "substructure"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("results", data)
        self.assertTrue(data["ok"])


class TestChemistryModule(TestCase):
    """Unit tests for the chemistry.py module (without RDKit)."""

    def test_canonicalize_stub(self):
        from chemschema.chemistry import canonicalize

        result = canonicalize("c1ccccc1")
        self.assertIn("smiles", result)
        self.assertIn("ok", result)

    def test_get_properties_stub(self):
        from chemschema.chemistry import get_properties

        result = get_properties("CCO")
        self.assertIn("ok", result)

    def test_depict_stub_returns_svg(self):
        from chemschema.chemistry import depict_2d

        result = depict_2d("C")
        self.assertIn("svg", result)
        self.assertIn("<svg", result["svg"])
