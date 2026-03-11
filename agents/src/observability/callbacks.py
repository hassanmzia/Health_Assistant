"""
Callback handlers for LangSmith and Langfuse integration.

Enhanced with retry/fallback logging, token tracking,
and healthcare-specific decision capture.
"""

import os
import time
import logging
from datetime import datetime, timezone
from typing import List, Any, Dict, Optional, Union
from langchain_core.callbacks import BaseCallbackHandler

logger = logging.getLogger("healthos.callbacks")


def get_langsmith_callbacks() -> List[BaseCallbackHandler]:
    """Get LangSmith callback handlers if enabled"""
    callbacks = []

    if os.environ.get('LANGCHAIN_API_KEY'):
        # LangSmith is auto-configured via environment variables
        # LANGCHAIN_TRACING_V2=true enables automatic tracing
        pass

    return callbacks


def get_langfuse_callbacks() -> List[BaseCallbackHandler]:
    """Get Langfuse callback handlers if enabled"""
    callbacks = []

    if os.environ.get('LANGFUSE_PUBLIC_KEY'):
        try:
            from langfuse.callback import CallbackHandler as LangfuseHandler

            handler = LangfuseHandler(
                public_key=os.environ.get('LANGFUSE_PUBLIC_KEY'),
                secret_key=os.environ.get('LANGFUSE_SECRET_KEY'),
                host=os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com'),
                session_id=None,  # Will be set per-request
                user_id=None,     # Will be set per-request
            )
            callbacks.append(handler)
        except ImportError:
            logger.warning("Langfuse callback handler not available")

    return callbacks


class HealthcareCallbackHandler(BaseCallbackHandler):
    """
    Custom callback handler for healthcare-specific logging.
    Captures agent interactions, decisions, rationale, retries,
    fallbacks, and token usage.
    """

    def __init__(self, session_id: str = None, user_id: str = None):
        super().__init__()
        self.session_id = session_id
        self.user_id = user_id
        self.traces: List[Dict] = []
        self.retries: List[Dict] = []
        self.fallbacks: List[Dict] = []
        self.token_usage: List[Dict] = []
        self.errors: List[Dict] = []
        self._active_spans: Dict[str, float] = {}

    # ── LLM lifecycle ────────────────────────────────────────────────

    def on_llm_start(self, serialized: dict, prompts: List[str], **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        self._active_spans[run_id] = time.monotonic()
        self.traces.append({
            'event': 'llm_start',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'model': serialized.get('name', 'unknown'),
            'prompt_count': len(prompts),
            'prompt_tokens_est': sum(len(p) // 4 for p in prompts),
            'session_id': self.session_id,
            'run_id': run_id,
        })

    def on_llm_end(self, response, **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        start = self._active_spans.pop(run_id, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start else 0

        # Extract token usage from response
        token_info = {}
        if hasattr(response, "llm_output") and response.llm_output:
            usage = response.llm_output.get("token_usage", {})
            token_info = {
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            }
            if token_info.get("total_tokens"):
                self.token_usage.append({
                    **token_info,
                    "model": response.llm_output.get("model_name", "unknown"),
                    "duration_ms": duration_ms,
                    "session_id": self.session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

        self.traces.append({
            'event': 'llm_end',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'generations': len(response.generations) if response.generations else 0,
            'duration_ms': duration_ms,
            **token_info,
            'session_id': self.session_id,
            'run_id': run_id,
        })

    def on_llm_error(self, error: BaseException, **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        start = self._active_spans.pop(run_id, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start else 0

        self.errors.append({
            'event': 'llm_error',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': str(error)[:500],
            'error_type': type(error).__name__,
            'duration_ms': duration_ms,
            'session_id': self.session_id,
            'run_id': run_id,
        })
        logger.error("LLM error: %s (session=%s)", str(error)[:200], self.session_id)

    # ── Chain lifecycle ──────────────────────────────────────────────

    def on_chain_start(self, serialized: dict, inputs: dict, **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        self._active_spans[run_id] = time.monotonic()
        self.traces.append({
            'event': 'chain_start',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'chain': serialized.get('name', 'unknown'),
            'input_keys': list(inputs.keys()) if isinstance(inputs, dict) else [],
            'session_id': self.session_id,
            'run_id': run_id,
        })

    def on_chain_end(self, outputs: dict, **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        start = self._active_spans.pop(run_id, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start else 0

        self.traces.append({
            'event': 'chain_end',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'output_keys': list(outputs.keys()) if isinstance(outputs, dict) else [],
            'duration_ms': duration_ms,
            'session_id': self.session_id,
            'run_id': run_id,
        })

    def on_chain_error(self, error: BaseException, **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        start = self._active_spans.pop(run_id, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start else 0

        self.errors.append({
            'event': 'chain_error',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': str(error)[:500],
            'error_type': type(error).__name__,
            'duration_ms': duration_ms,
            'session_id': self.session_id,
        })

    # ── Tool lifecycle ───────────────────────────────────────────────

    def on_tool_start(self, serialized: dict, input_str: str, **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        self._active_spans[run_id] = time.monotonic()
        self.traces.append({
            'event': 'tool_start',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'tool': serialized.get('name', 'unknown'),
            'session_id': self.session_id,
        })

    def on_tool_end(self, output: str, **kwargs) -> None:
        run_id = str(kwargs.get("run_id", ""))
        start = self._active_spans.pop(run_id, None)
        duration_ms = int((time.monotonic() - start) * 1000) if start else 0

        self.traces.append({
            'event': 'tool_end',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'output_length': len(output) if output else 0,
            'duration_ms': duration_ms,
            'session_id': self.session_id,
        })

    def on_tool_error(self, error: BaseException, **kwargs) -> None:
        self.errors.append({
            'event': 'tool_error',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': str(error)[:500],
            'error_type': type(error).__name__,
            'session_id': self.session_id,
        })

    # ── Agent lifecycle ──────────────────────────────────────────────

    def on_agent_action(self, action, **kwargs) -> None:
        self.traces.append({
            'event': 'agent_action',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'tool': action.tool if hasattr(action, 'tool') else 'unknown',
            'tool_input': str(action.tool_input)[:200] if hasattr(action, 'tool_input') else '',
            'session_id': self.session_id,
        })

    def on_agent_finish(self, finish, **kwargs) -> None:
        self.traces.append({
            'event': 'agent_finish',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'output_length': len(finish.return_values.get('output', '')) if hasattr(finish, 'return_values') else 0,
            'session_id': self.session_id,
        })

    # ── Retry / Fallback logging ─────────────────────────────────────

    def log_retry(
        self,
        agent_name: str,
        attempt: int,
        max_attempts: int,
        error: str,
        backoff_seconds: float,
    ):
        """Log an agent retry attempt."""
        record = {
            'event': 'retry',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'agent_name': agent_name,
            'attempt': attempt,
            'max_attempts': max_attempts,
            'error': error[:500],
            'backoff_seconds': backoff_seconds,
            'session_id': self.session_id,
        }
        self.retries.append(record)
        logger.warning(
            "Retry: agent=%s attempt=%d/%d backoff=%.1fs error=%s",
            agent_name, attempt, max_attempts, backoff_seconds, error[:100],
        )

    def log_fallback(
        self,
        agent_name: str,
        primary_model: str,
        fallback_model: str,
        reason: str,
    ):
        """Log when an agent falls back to an alternative model."""
        record = {
            'event': 'fallback',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'agent_name': agent_name,
            'primary_model': primary_model,
            'fallback_model': fallback_model,
            'reason': reason[:500],
            'session_id': self.session_id,
        }
        self.fallbacks.append(record)
        logger.warning(
            "Fallback: agent=%s %s → %s reason=%s",
            agent_name, primary_model, fallback_model, reason[:100],
        )

    # ── Query methods ────────────────────────────────────────────────

    def get_traces(self) -> List[dict]:
        """Get all collected traces"""
        return self.traces

    def get_retries(self) -> List[dict]:
        """Get all retry records"""
        return self.retries

    def get_fallbacks(self) -> List[dict]:
        """Get all fallback records"""
        return self.fallbacks

    def get_token_usage(self) -> List[dict]:
        """Get all token usage records"""
        return self.token_usage

    def get_errors(self) -> List[dict]:
        """Get all error records"""
        return self.errors

    def get_summary(self) -> Dict[str, Any]:
        """Get summary of all observability data for this session."""
        total_tokens = sum(t.get("total_tokens", 0) for t in self.token_usage)
        total_input = sum(t.get("input_tokens", 0) for t in self.token_usage)
        total_output = sum(t.get("output_tokens", 0) for t in self.token_usage)
        return {
            "session_id": self.session_id,
            "trace_count": len(self.traces),
            "error_count": len(self.errors),
            "retry_count": len(self.retries),
            "fallback_count": len(self.fallbacks),
            "token_usage": {
                "total_tokens": total_tokens,
                "input_tokens": total_input,
                "output_tokens": total_output,
                "llm_calls": len(self.token_usage),
            },
        }

    def clear_traces(self) -> None:
        """Clear all collected data"""
        self.traces = []
        self.retries = []
        self.fallbacks = []
        self.token_usage = []
        self.errors = []
        self._active_spans = {}
