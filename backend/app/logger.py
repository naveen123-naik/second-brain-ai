import logging
import os
import json
from datetime import datetime

# Create logs directory
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "api.log")


class JSONFormatter(logging.Formatter):
    """Format log records as JSON lines for structured log consumption."""

    def format(self, record: logging.LogRecord) -> str:
        try:
            # If message is already a JSON dict (from middleware), parse it
            data = json.loads(record.getMessage())
        except (json.JSONDecodeError, TypeError):
            data = {"message": record.getMessage()}

        data["timestamp"] = datetime.utcnow().isoformat() + "Z"
        data["level"] = record.levelname

        if record.exc_info:
            data["exception"] = self.formatException(record.exc_info)

        return json.dumps(data)


def setup_logger() -> logging.Logger:
    logger = logging.getLogger("second-brain")
    logger.setLevel(logging.DEBUG)

    if logger.handlers:
        return logger  # already configured

    # --- File handler (JSON structured) ---
    fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(JSONFormatter())

    # --- Console handler (plain for dev comfort) ---
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    )

    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger


logger = setup_logger()