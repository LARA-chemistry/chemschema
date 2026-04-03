"""
gRPC servicer implementation for ChemSchemaService.

This module provides the Python-side gRPC servicer.  The generated
protobuf stubs (chemschema_pb2, chemschema_pb2_grpc) are expected to be
placed next to this file after running:

    python -m grpc_tools.protoc \\
        --proto_path=../proto \\
        --python_out=. \\
        --grpc_python_out=. \\
        ../proto/chemschema.proto

Until the stubs are generated, this module defines a stub-compatible
servicer that can be wired up once generation is complete.
"""

from __future__ import annotations

import logging

from .chemistry import canonicalize, convert_format, depict_2d, get_properties

logger = logging.getLogger(__name__)


class ChemSchemaServicer:
    """
    Implements the ChemSchemaService gRPC interface.

    When the protobuf stubs are generated, inherit from
    ``chemschema_pb2_grpc.ChemSchemaServiceServicer`` instead:

        from . import chemschema_pb2_grpc
        class ChemSchemaServicer(chemschema_pb2_grpc.ChemSchemaServiceServicer):
            ...
    """

    def ConvertFormat(self, request, context):
        """Convert a molecule between chemistry file formats."""
        result = convert_format(
            data=request.data,
            from_format=self._format_name(request.from_format),
            to_format=self._format_name(request.to_format),
        )
        # Return a response object – replace with pb2.ConvertResponse() when stubs exist
        return _make_response(result, "data")

    def Canonicalize(self, request, context):
        """Canonicalize a SMILES string."""
        result = canonicalize(smiles=request.smiles)
        return _make_response(result, "smiles")

    def GetProperties(self, request, context):
        """Compute molecular properties for a SMILES."""
        result = get_properties(smiles=request.smiles)
        return _make_response(result, "properties")

    def Depict2D(self, request, context):
        """Generate a 2D SVG depiction."""
        result = depict_2d(
            smiles=request.smiles,
            width=getattr(request, "width", 300),
            height=getattr(request, "height", 200),
        )
        return _make_response(result, "svg")

    def Search(self, request, context):
        """Search the molecule registry."""
        # Basic stub – replace with full search logic
        return {"results": [], "ok": True, "error": ""}

    # ── Helpers ──────────────────────────────────────────────────────────────

    _FORMAT_NAMES = {
        0: "smiles",
        1: "mol",
        2: "sdf",
        3: "inchi",
        4: "inchikey",
        5: "cml",
        6: "rxn",
        7: "rsmiles",
    }

    def _format_name(self, code: int) -> str:
        return self._FORMAT_NAMES.get(code, "smiles")


def _make_response(result: dict, primary_field: str) -> dict:
    """Thin dict wrapper – replace with actual pb2 message objects."""
    return result


def create_grpc_server(port: int = 50051):
    """
    Create and return a gRPC server bound to *port*.

    Call ``server.start()`` and ``server.wait_for_termination()``
    to run it.  Requires the generated stubs and grpcio.

    Example::

        server = create_grpc_server(50051)
        server.start()
        server.wait_for_termination()
    """
    try:
        import grpc
        from concurrent import futures

        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        # Once stubs are generated, add the servicer:
        # from . import chemschema_pb2_grpc
        # chemschema_pb2_grpc.add_ChemSchemaServiceServicer_to_server(
        #     ChemSchemaServicer(), server
        # )
        server.add_insecure_port(f"[::]:{port}")
        logger.info("gRPC server will listen on port %d", port)
        return server
    except ImportError:
        logger.error("grpcio not installed – cannot create gRPC server")
        raise
