from dotenv import load_dotenv
load_dotenv()

from cogniflow_ai.api import app  # noqa: E402

__all__ = ["app"]
