"""
URL configuration for the ChemSchema Django app.

Include these URLs in your project's urlconf:

    from django.urls import path, include

    urlpatterns = [
        path("api/v1/", include("chemschema.urls")),
    ]
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CanonicalizeView,
    ConvertFormatView,
    Depict2DView,
    MoleculeViewSet,
    PropertiesView,
    ReactionViewSet,
    StructureSearchView,
)

router = DefaultRouter()
router.register(r"molecules", MoleculeViewSet, basename="molecule")
router.register(r"reactions", ReactionViewSet, basename="reaction")

urlpatterns = [
    path("", include(router.urls)),
    # Chemistry operations
    path("convert/",     ConvertFormatView.as_view(),   name="chemschema-convert"),
    path("canonicalize/", CanonicalizeView.as_view(),   name="chemschema-canonicalize"),
    path("properties/",  PropertiesView.as_view(),      name="chemschema-properties"),
    path("depict/",      Depict2DView.as_view(),        name="chemschema-depict"),
    path("search/",      StructureSearchView.as_view(), name="chemschema-search"),
]
