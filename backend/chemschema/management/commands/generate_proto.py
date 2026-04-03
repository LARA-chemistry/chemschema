"""
Management command: generate protobuf / gRPC Python stubs.

Usage::

    python manage.py generate_proto

This runs ``grpc_tools.protoc`` against ``proto/chemschema.proto``
and writes the generated stubs into the ``chemschema/`` package.
"""

import subprocess
import sys
from pathlib import Path

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate Python gRPC stubs from proto/chemschema.proto"

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parent.parent.parent.parent  # backend/
        proto_dir = base_dir / "proto"
        out_dir   = base_dir / "chemschema"

        if not (proto_dir / "chemschema.proto").exists():
            self.stderr.write(
                self.style.ERROR(f"Proto file not found: {proto_dir}/chemschema.proto")
            )
            sys.exit(1)

        cmd = [
            sys.executable,
            "-m", "grpc_tools.protoc",
            f"--proto_path={proto_dir}",
            f"--python_out={out_dir}",
            f"--grpc_python_out={out_dir}",
            "chemschema.proto",
        ]

        self.stdout.write(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            self.stderr.write(self.style.ERROR("protoc failed:"))
            self.stderr.write(result.stderr)
            sys.exit(result.returncode)

        self.stdout.write(self.style.SUCCESS("✓ Generated stubs in chemschema/"))
