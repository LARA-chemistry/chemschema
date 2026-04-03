# ChemSchema

> A modern, reactive Vue.js / Tailwind / Vite chemistry (2D structures & reactions) editor — distributable as both an npm package and a Django/PyPI app.

[![CI](https://github.com/LARA-chemistry/chemschema/actions/workflows/ci.yml/badge.svg)](https://github.com/LARA-chemistry/chemschema/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/chemschema-editor)](https://www.npmjs.com/package/chemschema-editor)
[![PyPI](https://img.shields.io/pypi/v/chemschema)](https://pypi.org/project/chemschema/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Overview

ChemSchema provides:

| Package | Technology | Distribution |
|---------|-----------|-------------|
| `chemschema-editor` | Vue 3 + Vite + Tailwind | npm |
| `chemschema` | Django + DRF + gRPC | PyPI |

### Features

- Interactive 2D molecular editor — draw atoms, bonds, rings; wedge/dash stereo; aromatic bonds
- Reaction editor — multi-component reactions with reactants, agents and products
- Format I/O — SMILES, MOL, SDF, InChI (client-side); additional formats via backend (RDKit)
- Backend integration — gRPC-web and REST clients bundled
- Django plugin — drop-in REST + gRPC API with optional RDKit chemistry backend
- Export — copy to clipboard or download as `.smi`, `.mol`, `.sdf`, `.json`, SVG

## Repository Layout

```
chemschema/
├── frontend/               # Vue.js component (npm: chemschema-editor)
│   ├── src/
│   │   ├── components/     # ChemEditor, ReactionEditor, Toolbar, ...
│   │   ├── composables/    # useMolecule, useGrpc, useRest
│   │   ├── lib/
│   │   │   ├── chemistry/  # Atom, Bond, Molecule, SMILES, MOL/SDF, layout2d
│   │   │   ├── grpc/       # gRPC-web client
│   │   │   └── rest/       # REST client
│   │   └── index.js        # Package entry point
│   ├── demo/               # Demo application
│   ├── package.json
│   └── vite.lib.config.js
├── backend/                # Django app (PyPI: chemschema)
│   ├── chemschema/
│   │   ├── models.py       # MoleculeRecord, ReactionRecord
│   │   ├── views.py        # REST API views
│   │   ├── urls.py         # URL router
│   │   ├── serializers.py
│   │   ├── chemistry.py    # RDKit wrapper (graceful fallback)
│   │   └── grpc_servicer.py
│   ├── proto/
│   │   └── chemschema.proto
│   ├── tests/
│   └── pyproject.toml      # uv-compatible build config
└── .github/workflows/
    ├── ci.yml              # Test frontend + backend
    ├── npm-publish.yml     # Publish to npm on release
    └── pypi-publish.yml    # Publish to PyPI with uv on release
```

## Quick Start

### npm (Vue.js component)

```bash
npm install chemschema-editor
```

```vue
<script setup>
import { ChemEditor } from 'chemschema-editor'
import 'chemschema-editor/style.css'
</script>

<template>
  <ChemEditor
    :initial-smiles="'c1ccccc1'"
    style="height: 500px"
    @smiles-change="console.log($event)"
  />
</template>
```

#### Vue plugin (global registration)

```js
import { createApp } from 'vue'
import ChemSchemaPlugin from 'chemschema-editor'
import 'chemschema-editor/style.css'

createApp(App).use(ChemSchemaPlugin).mount('#app')
```

### Django (Python package)

```bash
pip install chemschema
# With full RDKit chemistry support:
pip install chemschema[rdkit]
```

`settings.py`

```python
INSTALLED_APPS = [
    "rest_framework",
    "corsheaders",
    "chemschema",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    ...
]
```

`urls.py`

```python
from django.urls import include, path

urlpatterns = [
    path("api/v1/", include("chemschema.urls")),
]
```

Run migrations: `python manage.py migrate`

#### REST API endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `/api/v1/molecules/` | List / create molecules |
| GET/PUT/PATCH/DELETE | `/api/v1/molecules/{id}/` | Single molecule |
| POST | `/api/v1/convert/` | Convert between formats |
| POST | `/api/v1/canonicalize/` | Canonicalize SMILES |
| POST | `/api/v1/properties/` | Molecular properties (RDKit) |
| POST | `/api/v1/depict/` | SVG depiction (RDKit) |
| POST | `/api/v1/search/` | Structure/text search |

#### gRPC server

```bash
python manage.py generate_proto   # Generate Python stubs
```

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev       # Demo at http://localhost:5173
npm test          # Vitest unit tests
npm run build:lib # Build distributable library
```

### Backend

```bash
cd backend
uv venv .venv
uv pip install -e ".[dev]" --python .venv/bin/python
.venv/bin/python -m pytest tests/ -v
```

## Supported Chemistry File Formats

| Format | Read | Write | Notes |
|--------|------|-------|-------|
| SMILES | yes | yes | Client-side |
| MOL V2000 | yes | yes | Client-side |
| SDF | yes | yes | Client-side |
| InChI | — | yes | Server-side (RDKit) |
| InChIKey | — | yes | Server-side (RDKit) |
| SVG | — | yes | Server-side (RDKit) |

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
