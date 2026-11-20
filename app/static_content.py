"""Static frontend serving with cache policies for built assets."""

import re
from pathlib import Path
from typing import Any

from starlette.responses import Response
from starlette.staticfiles import StaticFiles


_FINGERPRINTED_ASSET = re.compile(r"-[A-Za-z0-9_-]{8,}\.")


class CachedStaticFiles(StaticFiles):
    """Serve frontend files with cache lifetimes suited to their mutability.

    Vite's fingerprinted assets can be cached for a year because a content
    change produces a new URL. The HTML entry point must revalidate so clients
    discover new asset names after deployment. Other public files use a short
    cache lifetime with stale-while-revalidate.
    """

    def file_response(
        self,
        full_path: Path | str,
        stat_result: Any,
        scope: dict[str, Any],
        status_code: int = 200,
    ) -> Response:
        """Create a static response and attach the matching Cache-Control header.

        Args:
            full_path: Resolved path to the requested file.
            stat_result: File metadata used by Starlette for conditional responses.
            scope: ASGI request scope.
            status_code: HTTP status code for the file response.

        Returns:
            Static file response with a cache policy based on the asset type.
        """
        response = super().file_response(full_path, stat_result, scope, status_code)
        path = str(full_path).replace("\\", "/")
        filename = Path(path).name

        if filename == "index.html":
            response.headers["Cache-Control"] = "no-cache, must-revalidate"
        elif "/assets/" in path and _FINGERPRINTED_ASSET.search(filename):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800"

        return response
