---
name: OpenAPI integer codegen compatibility
description: A compatibility constraint between the workspace's current Zod runtime and generated integer validators.
---

The current OpenAPI/Zod generation setup does not support integer schemas reliably: Orval emits `zod.int()`, while the installed Zod runtime only exposes the compatible numeric validator. Use numeric schemas for generated IDs unless the toolchain is upgraded together.

**Why:** Code generation completed but the workspace library typecheck failed because generated integer validators were unavailable.

**How to apply:** When adding an ID or numeric path parameter to `lib/api-spec/openapi.yaml`, check the generated validator output and avoid `type: integer` until the Zod/Orval versions are aligned.