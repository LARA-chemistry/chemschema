from django.apps import AppConfig


class ChemSchemaConfig(AppConfig):
    """Django AppConfig for the chemschema application."""

    name = "chemschema"
    verbose_name = "ChemSchema"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Import signal handlers when the app is ready."""
        # Signal handlers can be imported here if needed
        pass
