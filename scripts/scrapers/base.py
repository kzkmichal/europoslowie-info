"""Base scraper class with common functionality."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from ..utils.http_client import HTTPClient
from ..utils.logger import setup_logger


class BaseScraper(ABC):
    """Base class for all scrapers with common functionality."""

    def __init__(self, base_url: str, rate_limit_seconds: float = 2.0):
        """
        Initialize base scraper.

        Args:
            base_url: Base URL for API/website
            rate_limit_seconds: Seconds to wait between requests
        """
        self.base_url = base_url
        self.rate_limit = rate_limit_seconds
        self.logger = setup_logger(self.__class__.__name__)
        self.http = HTTPClient(rate_limit_seconds=rate_limit_seconds)

        # Statistics
        self.stats = {
            'items_scraped': 0,
            'items_valid': 0,
            'items_invalid': 0,
            'errors': []
        }

    @abstractmethod
    def scrape(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Main scraping logic - must be implemented by subclasses.

        Returns:
            List of scraped data dictionaries
        """
        pass

    @abstractmethod
    def validate(self, data: List[Dict]) -> List[Dict]:
        """
        Validate scraped data - must be implemented by subclasses.

        Args:
            data: List of scraped items

        Returns:
            List of valid items
        """
        pass

    def log_info(self, message: str):
        """Log info message."""
        self.logger.info(message)

    def log_error(self, message: str, exc_info: bool = False):
        """
        Log error message.

        Args:
            message: Error message
            exc_info: Include exception traceback
        """
        self.logger.error(message, exc_info=exc_info)
        self.stats['errors'].append(message)

    def log_warning(self, message: str):
        """Log warning message."""
        self.logger.warning(message)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get scraping statistics.

        Returns:
            Dictionary with statistics
        """
        return {
            **self.stats,
            'success_rate': (
                self.stats['items_valid'] / max(self.stats['items_scraped'], 1)
            ) if self.stats['items_scraped'] > 0 else 0
        }

    def print_summary(self):
        """Print scraping summary."""
        stats = self.get_stats()
        self.log_info("=" * 60)
        self.log_info(f"SCRAPING SUMMARY - {self.__class__.__name__}")
        self.log_info("=" * 60)
        self.log_info(f"Items scraped:    {stats['items_scraped']}")
        self.log_info(f"Items valid:      {stats['items_valid']}")
        self.log_info(f"Items invalid:    {stats['items_invalid']}")
        self.log_info(f"Success rate:     {stats['success_rate']:.1%}")
        self.log_info(f"Errors:           {len(stats['errors'])}")
        self.log_info("=" * 60)

    def cleanup(self):
        """Cleanup resources."""
        if hasattr(self, 'http'):
            self.http.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.cleanup()
