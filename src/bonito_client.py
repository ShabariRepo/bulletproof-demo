"""
Silver Bullet — Bonito Platform Client

JWT-authenticated client for Bonito agent execution, KB management,
and agent provisioning. Adapted from Duncan Lane's bonito_client.py.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BACKOFF = [2.0, 5.0, 10.0]
RETRYABLE_STATUS_CODES = {502, 503, 429}


class BonitoClient:
    """Client for Bonito platform — agent execution, KB management, provisioning."""

    def __init__(
        self,
        base_url: str = "",
        email: str = "",
        password: str = "",
    ) -> None:
        self.base_url = (base_url or os.getenv("BONITO_URL", "https://api.getbonito.com")).rstrip("/")
        self._email = email or os.getenv("BONITO_EMAIL", "")
        self._password = password or os.getenv("BONITO_PASSWORD", "")
        self._jwt_token: Optional[str] = None
        self._jwt_expires: float = 0

    async def _get_jwt(self) -> str:
        """Get a valid JWT token, logging in if needed."""
        now = time.monotonic()
        if self._jwt_token and now < self._jwt_expires:
            return self._jwt_token

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/auth/login",
                json={"email": self._email, "password": self._password},
            )
            resp.raise_for_status()
            data = resp.json()

        self._jwt_token = data.get("access_token", data.get("token", ""))
        self._jwt_expires = now + 25 * 60  # Refresh every 25 min
        logger.info("Bonito JWT refreshed for %s", self._email)
        return self._jwt_token

    async def _headers(self) -> dict[str, str]:
        jwt = await self._get_jwt()
        return {
            "Authorization": f"Bearer {jwt}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Agent Execution
    # ------------------------------------------------------------------

    async def execute_agent(
        self,
        agent_id: str,
        message: str,
        session_id: Optional[str] = None,
        parent_agent_id: Optional[str] = None,
        timeout: float = 90.0,
    ) -> dict[str, Any]:
        """Execute an agent and return its response.

        Uses retry logic with exponential backoff for transient errors.
        """
        url = f"{self.base_url}/api/agents/{agent_id}/execute"
        body: dict[str, Any] = {"message": message}
        if session_id:
            body["session_id"] = session_id
        if parent_agent_id:
            body["parent_agent_id"] = parent_agent_id

        start = time.monotonic()

        for attempt in range(MAX_RETRIES + 1):
            try:
                headers = await self._headers()
                if attempt > 0:
                    headers = await self._headers()  # Re-fetch JWT on retry

                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=body, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()

                elapsed = time.monotonic() - start
                content = data.get("content", data.get("response", ""))
                result = {
                    "content": content,
                    "response": content,
                    "model_used": data.get("model_used", "unknown"),
                    "tokens": data.get("tokens", 0),
                    "cost": data.get("cost", 0),
                    "session_id": data.get("session_id"),
                    "elapsed": round(elapsed, 1),
                }
                if attempt > 0:
                    logger.info("Agent %s responded in %.1fs after %d retries", agent_id, elapsed, attempt)
                return result

            except httpx.HTTPStatusError as e:
                if e.response.status_code in RETRYABLE_STATUS_CODES and attempt < MAX_RETRIES:
                    backoff = RETRY_BACKOFF[attempt]
                    logger.warning("Agent %s HTTP %d, retrying in %.0fs (%d/%d)",
                                   agent_id, e.response.status_code, backoff, attempt + 1, MAX_RETRIES)
                    await asyncio.sleep(backoff)
                    continue
                logger.error("Agent %s HTTP %d: %s", agent_id, e.response.status_code, e.response.text[:200])
                raise

            except httpx.TimeoutException:
                if attempt < MAX_RETRIES:
                    backoff = RETRY_BACKOFF[attempt]
                    logger.warning("Agent %s timed out, retrying in %.0fs (%d/%d)",
                                   agent_id, backoff, attempt + 1, MAX_RETRIES)
                    await asyncio.sleep(backoff)
                    continue
                raise

        raise RuntimeError(f"Agent {agent_id} failed after {MAX_RETRIES + 1} attempts")

    # ------------------------------------------------------------------
    # Knowledge Base Management
    # ------------------------------------------------------------------

    async def list_knowledge_bases(self) -> list[dict]:
        """List all knowledge bases in the org."""
        headers = await self._headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.base_url}/api/knowledge-bases", headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def create_knowledge_base(self, name: str, description: str = "") -> dict:
        """Create a new knowledge base."""
        headers = await self._headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/knowledge-bases",
                json={"name": name, "description": description},
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def upload_document(self, kb_id: str, filepath: str) -> dict:
        """Upload a document to a knowledge base."""
        headers = await self._headers()
        del headers["Content-Type"]  # Let httpx set multipart boundary
        path = Path(filepath)
        async with httpx.AsyncClient(timeout=120.0) as client:
            with open(path, "rb") as f:
                resp = await client.post(
                    f"{self.base_url}/api/knowledge-bases/{kb_id}/documents",
                    files={"file": (path.name, f, "text/markdown")},
                    headers=headers,
                )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # Agent Management
    # ------------------------------------------------------------------

    async def list_agents(self, project_id: str) -> list[dict]:
        """List all agents in a project."""
        headers = await self._headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/projects/{project_id}/agents",
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def create_agent(self, project_id: str, agent_data: dict) -> dict:
        """Create a new agent in a project."""
        headers = await self._headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/projects/{project_id}/agents",
                json=agent_data,
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def create_connection(
        self, agent_id: str, target_agent_id: str, connection_type: str = "handoff",
        label: str = "",
    ) -> dict:
        """Create a connection between two agents."""
        headers = await self._headers()
        body = {
            "target_agent_id": target_agent_id,
            "connection_type": connection_type,
        }
        if label:
            body["label"] = label
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/agents/{agent_id}/connections",
                json=body,
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # JSON Parsing Helper
    # ------------------------------------------------------------------

    @staticmethod
    def parse_json(text: str) -> dict[str, Any]:
        """Extract JSON from an agent response (handles markdown fences)."""
        cleaned = text.strip()
        fence = re.search(r"```(?:json)?\s*\n([\s\S]*?)```", cleaned)
        if fence:
            cleaned = fence.group(1).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {}
