import time
import json
import traceback
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.logger import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts every HTTP request and logs:
      - method, path, query params
      - response status code
      - duration in ms
      - error message + traceback (if exception occurred)
    """

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        method = request.method
        path = request.url.path
        query = str(request.url.query) if request.url.query else None
        client_ip = request.client.host if request.client else "unknown"
        
        origin = request.headers.get("origin")
        host = request.headers.get("host")

        # Skip health-check noise
        if path in ("/", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        # CORS Origin Check & Warning Logging
        if origin:
            from app.config import get_allowed_origins
            allowed = get_allowed_origins()
            if "*" not in allowed and origin not in allowed:
                logger.warning(
                    f"CORS validation warning: Origin '{origin}' is not in allowed origins list: {allowed} | "
                    f"Path: {path} | Method: {method}"
                )

        error_detail = None
        status_code = 500

        try:
            response: Response = await call_next(request)
            status_code = response.status_code

        except Exception as exc:
            error_detail = {
                "type": type(exc).__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(),
            }
            status_code = 500
            # Re-raise so FastAPI's default error handler takes over
            raise

        finally:
            duration_ms = round((time.time() - start) * 1000, 2)

            log_entry = {
                "method": method,
                "path": path,
                "query": query,
                "status": status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
                "origin": origin,
                "host": host,
                "error": error_detail,
            }

            payload = json.dumps(log_entry)


            if status_code >= 500:
                logger.error(payload)
            elif status_code >= 400:
                logger.warning(payload)
            else:
                logger.info(payload)

        return response
