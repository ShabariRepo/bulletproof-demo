"""
Silver Bullet — Bonito Platform Client

Token-authenticated client for Bonito agent execution, KB management,
and agent provisioning. Uses scoped bp-* tokens for the demo security story.
"""

from __future__ import annotations
import time

import asyncio
import json
import logging
import os
import re
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
        api_token: str = "",
    ) -> None:
        self.base_url = (base_url or os.getenv("BONITO_URL", "https://api.getbonito.com")).rstrip("/")
        self._api_token = api_token or os.getenv("BONITO_API_TOKEN", "") or os.getenv("BONITO_TOKEN", "")

        if not self._api_token:
            raise RuntimeError(
                "BONITO_API_TOKEN is required. Create a scoped bp-* personal or project token; "
                "the demo no longer logs in with a full account password."
            )
        if not self._api_token.startswith("bp-"):
            raise RuntimeError("BONITO_API_TOKEN must be a scoped bp-* token for this demo.")

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_token}",
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
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=body, headers=self._headers())
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.base_url}/api/knowledge-bases", headers=self._headers())
            resp.raise_for_status()
            return resp.json()

    async def create_knowledge_base(self, name: str, description: str = "") -> dict:
        """Create a new knowledge base."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/knowledge-bases",
                json={
                    "name": name,
                    "description": description,
                    "source_type": "upload",
                    "embedding_model": "auto",
                },
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def delete_knowledge_base(self, kb_id: str) -> None:
        """Delete a knowledge base and all its documents/chunks."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                f"{self.base_url}/api/knowledge-bases/{kb_id}",
                headers=self._headers(),
            )
            resp.raise_for_status()

    async def upload_document(self, kb_id: str, filepath: str) -> dict:
        """Upload a document to a knowledge base."""
        headers = self._headers()
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

    async def list_documents(self, kb_id: str) -> list[dict]:
        """List all documents in a knowledge base."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/knowledge-bases/{kb_id}/documents",
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def delete_document(self, kb_id: str, doc_id: str) -> None:
        """Delete a document from a knowledge base."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                f"{self.base_url}/api/knowledge-bases/{kb_id}/documents/{doc_id}",
                headers=self._headers(),
            )
            resp.raise_for_status()

    # ------------------------------------------------------------------
    # Project Management
    # ------------------------------------------------------------------

    async def list_projects(self) -> list[dict]:
        """List all projects in the org."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.base_url}/api/projects", headers=self._headers())
            resp.raise_for_status()
            return resp.json()

    async def create_project(self, name: str, description: str = "") -> dict:
        """Create a new project."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/projects",
                json={"name": name, "description": description},
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # Agent Management
    # ------------------------------------------------------------------

    async def list_agents(self, project_id: str) -> list[dict]:
        """List all agents in a project."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/projects/{project_id}/agents",
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def create_agent(self, project_id: str, agent_data: dict) -> dict:
        """Create a new agent in a project."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/projects/{project_id}/agents",
                json=agent_data,
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def update_agent(self, agent_id: str, agent_data: dict) -> dict:
        """Update an existing agent."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.patch(
                f"{self.base_url}/api/agents/{agent_id}",
                json=agent_data,
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def create_connection(
        self, agent_id: str, target_agent_id: str, connection_type: str = "handoff",
        label: str = "",
    ) -> dict:
        """Create a connection between two agents."""
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
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # JSON Parsing Helper
    # ------------------------------------------------------------------

    @staticmethod
    def parse_json(text: str) -> dict[str, Any]:
        """Extract JSON from an agent response (handles markdown fences).

        The triage agent wraps its answer in a ```json fence AND embeds the
        specialist's own ```json-fenced reply inside the `specialist_response`
        string. A non-greedy fence regex stops at the FIRST closing ``` (the
        nested one), corrupting the parse. So strip the OUTERMOST fence by line
        (first ``` line + the LAST ```), leaving any nested fence intact inside
        the string value — backticks are legal inside JSON strings.
        """
        cleaned = text.strip()
        if cleaned.startswith("```"):
            newline = cleaned.find("\n")
            if newline != -1:
                cleaned = cleaned[newline + 1:]
            last_fence = cleaned.rfind("```")
            if last_fence != -1:
                cleaned = cleaned[:last_fence]
            cleaned = cleaned.strip()
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
