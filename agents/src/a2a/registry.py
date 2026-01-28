"""
Agent Registry
Manages agent discovery and capability lookup
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import redis.asyncio as redis


class AgentRegistry:
    """Registry for agent discovery and capability management"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.heartbeat_interval = timedelta(seconds=30)
        self.agent_ttl = timedelta(minutes=5)

    async def register(
        self,
        agent_name: str,
        capabilities: List[str],
        endpoint: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Register an agent with its capabilities"""
        agent_data = {
            "name": agent_name,
            "capabilities": capabilities,
            "endpoint": endpoint,
            "metadata": metadata or {},
            "registered_at": datetime.now().isoformat(),
            "last_heartbeat": datetime.now().isoformat(),
            "status": "active"
        }

        # Store agent info
        await self.redis.setex(
            f"a2a:agent:{agent_name}",
            int(self.agent_ttl.total_seconds()),
            json.dumps(agent_data)
        )

        # Index capabilities
        for capability in capabilities:
            await self.redis.sadd(f"a2a:capability:{capability}", agent_name)
            await self.redis.expire(
                f"a2a:capability:{capability}",
                int(self.agent_ttl.total_seconds())
            )

    async def unregister(self, agent_name: str) -> None:
        """Unregister an agent"""
        # Get agent data to clean up capability indexes
        data = await self.redis.get(f"a2a:agent:{agent_name}")
        if data:
            agent_data = json.loads(data)
            for capability in agent_data.get("capabilities", []):
                await self.redis.srem(f"a2a:capability:{capability}", agent_name)

        await self.redis.delete(f"a2a:agent:{agent_name}")

    async def heartbeat(self, agent_name: str) -> None:
        """Update agent heartbeat"""
        data = await self.redis.get(f"a2a:agent:{agent_name}")
        if data:
            agent_data = json.loads(data)
            agent_data["last_heartbeat"] = datetime.now().isoformat()
            await self.redis.setex(
                f"a2a:agent:{agent_name}",
                int(self.agent_ttl.total_seconds()),
                json.dumps(agent_data)
            )

    async def get_agent(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Get agent information"""
        data = await self.redis.get(f"a2a:agent:{agent_name}")
        if data:
            return json.loads(data)
        return None

    async def find_by_capability(self, capability: str) -> List[str]:
        """Find agents that provide a capability"""
        agents = await self.redis.smembers(f"a2a:capability:{capability}")
        return [a.decode() if isinstance(a, bytes) else a for a in agents]

    async def list_all_agents(self) -> List[Dict[str, Any]]:
        """List all registered agents"""
        agents = []
        cursor = 0

        while True:
            cursor, keys = await self.redis.scan(cursor, match="a2a:agent:*")
            for key in keys:
                data = await self.redis.get(key)
                if data:
                    agents.append(json.loads(data))
            if cursor == 0:
                break

        return agents

    async def discover_capabilities(self) -> Dict[str, List[str]]:
        """Discover all available capabilities and their providers"""
        capabilities = {}
        cursor = 0

        while True:
            cursor, keys = await self.redis.scan(cursor, match="a2a:capability:*")
            for key in keys:
                cap_name = key.decode().replace("a2a:capability:", "")
                agents = await self.redis.smembers(key)
                capabilities[cap_name] = [
                    a.decode() if isinstance(a, bytes) else a for a in agents
                ]
            if cursor == 0:
                break

        return capabilities

    async def negotiate_capability(
        self,
        capability: str,
        requirements: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Negotiate and select the best agent for a capability.
        Returns the agent name that best matches requirements.
        """
        agents = await self.find_by_capability(capability)

        if not agents:
            return None

        if not requirements:
            # Return first available agent
            return agents[0]

        # Score agents based on requirements
        best_agent = None
        best_score = -1

        for agent_name in agents:
            agent_data = await self.get_agent(agent_name)
            if not agent_data:
                continue

            score = self._score_agent(agent_data, requirements)
            if score > best_score:
                best_score = score
                best_agent = agent_name

        return best_agent

    def _score_agent(
        self,
        agent_data: Dict[str, Any],
        requirements: Dict[str, Any]
    ) -> float:
        """Score an agent against requirements"""
        score = 0.0
        metadata = agent_data.get("metadata", {})

        # Check priority requirement
        if "min_priority" in requirements:
            if metadata.get("priority", 5) >= requirements["min_priority"]:
                score += 1.0

        # Check load requirement
        if "max_load" in requirements:
            if metadata.get("current_load", 0) <= requirements["max_load"]:
                score += 1.0

        # Prefer active agents with recent heartbeat
        if agent_data.get("status") == "active":
            score += 0.5

        return score
