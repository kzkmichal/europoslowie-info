"""Supabase Storage client for MEP photos."""
import os
import requests
from typing import Optional
from .logger import setup_logger

logger = setup_logger(__name__)

BUCKET = 'mep-photos'


class SupabaseStorage:
    def __init__(self):
        self._url = os.environ.get('SUPABASE_URL', '').rstrip('/')
        self._key = os.environ.get('SUPABASE_SERVICE_KEY', '')
        self.enabled = bool(self._url and self._key)

    def _object_url(self, ep_id: int) -> str:
        return f"{self._url}/storage/v1/object/{BUCKET}/{ep_id}.jpg"

    def _public_url(self, ep_id: int) -> str:
        return f"{self._url}/storage/v1/object/public/{BUCKET}/{ep_id}.jpg"

    def _auth_headers(self) -> dict:
        return {'Authorization': f'Bearer {self._key}'}

    def exists(self, ep_id: int) -> bool:
        try:
            resp = requests.head(self._object_url(ep_id), headers=self._auth_headers(), timeout=10)
            return resp.status_code == 200
        except Exception:
            return False

    def upload(self, ep_id: int, image_bytes: bytes) -> Optional[str]:
        try:
            resp = requests.put(
                self._object_url(ep_id),
                data=image_bytes,
                headers={**self._auth_headers(), 'Content-Type': 'image/jpeg', 'x-upsert': 'true'},
                timeout=30,
            )
            if resp.status_code in (200, 201):
                return self._public_url(ep_id)
            logger.error(f"Storage upload failed for MEP {ep_id}: {resp.status_code} {resp.text}")
            return None
        except Exception as e:
            logger.error(f"Storage upload error for MEP {ep_id}: {e}")
            return None

    def get_or_upload(self, ep_id: int, source_url: str) -> Optional[str]:
        """Return storage URL for ep_id, uploading from source_url if not yet stored."""
        if not self.enabled:
            return None
        if self.exists(ep_id):
            return self._public_url(ep_id)
        try:
            resp = requests.get(source_url, timeout=15)
            if resp.status_code != 200:
                logger.error(f"Failed to download photo for MEP {ep_id}: {resp.status_code}")
                return None
            return self.upload(ep_id, resp.content)
        except Exception as e:
            logger.error(f"Failed to fetch photo for MEP {ep_id}: {e}")
            return None
