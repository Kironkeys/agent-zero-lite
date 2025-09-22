import os
import yaml
from typing import Any
from python.helpers.extension import Extension
from agent import Agent


class LoadAgentConfig(Extension):
    """
    Extension to load agent-specific config.yaml into agent.config.additional
    This runs during agent_init to populate configuration settings.
    """

    async def execute(self, **kwargs: Any):
        try:
            # Determine config path based on agent profile
            profile = getattr(self.agent.config, 'profile', '')
            if profile:
                config_path = f"/a0/agents/{profile}/config.yaml"
            else:
                config_path = "/a0/agents/agent0/config.yaml"
            
            # Load YAML config if it exists
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    config_data = yaml.safe_load(f) or {}
                
                # Merge into additional config
                for key, value in config_data.items():
                    self.agent.config.additional[key] = value
                
                print(f"[LoadAgentConfig] Loaded config from {config_path}: {list(config_data.keys())}")
            else:
                print(f"[LoadAgentConfig] No config file found at {config_path}")
                
        except Exception as e:
            print(f"[LoadAgentConfig] Error loading config: {e}")