from abc import ABC, abstractmethod
from typing import Any


class AgentTool(ABC):
    """Base class for all agent investigation tools. Every tool returns
    real, structured data derived from the deterministic analytics engine
    or repositories - never fabricated data."""

    name: str = "base_tool"
    description: str = "Base tool"

    @abstractmethod
    def execute(self, **kwargs) -> Any:
        ...

    def schema(self) -> dict:
        """OpenAI-compatible function-calling schema. Subclasses may override
        `parameters` for tool-specific arguments."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": getattr(self, "parameters", {"type": "object", "properties": {}}),
            },
        }