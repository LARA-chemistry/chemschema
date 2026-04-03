"""
URL configuration for the ChemSchema Django app.

Include these URLs in your project's urlconf:

    from django.urls import path, include

    urlpatterns = [
        path("api/v1/", include("chemschema.urls")),
    ]
"""

from django.urls import path

from .views import api

urlpatterns = [
    path("", api.urls),
]
