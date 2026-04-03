# ChemSchema Backend

Django application providing REST and gRPC APIs for the ChemSchema chemistry editor.

## Installation

```bash
pip install chemschema
```

## Quick Start

1. Add to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ...
    "rest_framework",
    "corsheaders",
    "chemschema",
]
```

2. Add to `urls.py`:

```python
from django.urls import include, path

urlpatterns = [
    path("api/v1/", include("chemschema.urls")),
]
```

3. Run migrations:

```bash
python manage.py migrate
```

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/molecules/` | List / create molecules |
| GET/PUT/DELETE | `/api/v1/molecules/{id}/` | Retrieve / update / delete |
| POST | `/api/v1/convert/` | Convert between formats |
| POST | `/api/v1/canonicalize/` | Canonicalize SMILES |
| POST | `/api/v1/properties/` | Get molecular properties |
| POST | `/api/v1/depict/` | Generate SVG depiction |
| POST | `/api/v1/search/` | Structure search |

## gRPC

Generate stubs:

```bash
python manage.py generate_proto
```

Then start the gRPC server alongside Django.

## Chemistry Backend

Install the `rdkit` extra for full chemistry support:

```bash
pip install chemschema[rdkit]
```

Without RDKit, the API still works but returns stub/placeholder results.

## License

GPL-3.0-or-later
