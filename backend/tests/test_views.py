"""
Tests for the ChemSchema REST API (django-ninja).
"""

import json

import pytest
from django.test import TestCase

from chemschema.models import MoleculeRecord


class TestMoleculeAPI(TestCase):
    def test_list_molecules_empty(self):
        res = self.client.get("/api/v1/molecules/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 0)

    def test_create_molecule(self):
        payload = {"name": "Benzene", "smiles": "c1ccccc1"}
        res = self.client.post(
            "/api/v1/molecules/",
            json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["smiles"], "c1ccccc1")
        self.assertEqual(data["name"], "Benzene")

    def test_retrieve_molecule(self):
        mol = MoleculeRecord.objects.create(name="Ethanol", smiles="CCO")
        res = self.client.get(f"/api/v1/molecules/{mol.pk}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["smiles"], "CCO")

    def test_update_molecule(self):
        mol = MoleculeRecord.objects.create(name="Foo", smiles="C")
        res = self.client.patch(
            f"/api/v1/molecules/{mol.pk}",
            json.dumps({"name": "Methane"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Methane")

    def test_delete_molecule(self):
        mol = MoleculeRecord.objects.create(name="ToDelete", smiles="C")
        res = self.client.delete(f"/api/v1/molecules/{mol.pk}")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(MoleculeRecord.objects.filter(pk=mol.pk).exists())


class TestChemistryEndpoints(TestCase):
    def test_canonicalize_returns_response(self):
        res = self.client.post(
            "/api/v1/canonicalize/",
            json.dumps({"smiles": "c1ccccc1"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("smiles", data)
        self.assertIn("ok", data)

    def test_properties_returns_response(self):
        res = self.client.post(
            "/api/v1/properties/",
            json.dumps({"smiles": "CCO"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ok", data)

    def test_depict_returns_svg_stub(self):
        res = self.client.post(
            "/api/v1/depict/",
            json.dumps({"smiles": "C", "width": 200, "height": 150}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("svg", data)
        self.assertIn("ok", data)

    def test_convert_returns_response(self):
        res = self.client.post(
            "/api/v1/convert/",
            json.dumps({"data": "CCO", "from_format": "smiles", "to_format": "mol"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ok", data)

    def test_search_returns_response(self):
        MoleculeRecord.objects.create(name="Aspirin", smiles="CC(=O)Oc1ccccc1C(=O)O")
        res = self.client.post(
            "/api/v1/search/",
            json.dumps({"query": "CC", "search_type": "substructure"}),
            content_type="application/json",
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
