"""HTTP client with retry logic and rate limiting."""
import time
import requests
from typing import Dict, Optional
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
from .logger import setup_logger

logger = setup_logger(__name__)


class HTTPClient:
    """HTTP client with retry logic and rate limiting."""

    def __init__(self, rate_limit_seconds: float = 2.0, user_agent: str = None):
        """
        Initialize HTTP client.

        Args:
            rate_limit_seconds: Minimum seconds between requests
            user_agent: Custom user agent string
        """
        self.rate_limit = rate_limit_seconds
        self.last_request_time = 0

        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': user_agent or 'EuroposlowieInfo/1.0 (https://github.com/YOUR_USERNAME/europoslowie-info)',
            'Accept': 'application/json, text/html',
            'Accept-Language': 'pl,en;q=0.9',
        })

    def _wait_for_rate_limit(self):
        """Wait if necessary to respect rate limit."""
        if self.last_request_time > 0:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.rate_limit:
                sleep_time = self.rate_limit - elapsed
                logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)

        self.last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        # Only retry on network errors (connection, timeout).
        # HTTP 4xx/5xx are permanent — retrying them wastes time and spams logs.
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
        reraise=True
    )
    def get(
        self,
        url: str,
        params: Optional[Dict] = None,
        timeout: int = 30,
        **kwargs
    ) -> requests.Response:
        """
        GET request with retry logic.

        Args:
            url: URL to fetch
            params: Query parameters
            timeout: Request timeout in seconds
            **kwargs: Additional arguments for requests.get()

        Returns:
            Response object

        Raises:
            requests.RequestException: On request failure after retries
        """
        self._wait_for_rate_limit()

        logger.debug(f"GET {url}")

        try:
            response = self.session.get(
                url,
                params=params,
                timeout=timeout,
                **kwargs
            )
            response.raise_for_status()

            logger.debug(f"✓ {response.status_code} - {url}")
            return response

        except requests.HTTPError as e:
            logger.error(f"HTTP {e.response.status_code}: {url}")
            raise
        except requests.RequestException as e:
            logger.error(f"Request failed: {url} - {e}")
            raise

    def close(self):
        """Close the session."""
        self.session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
