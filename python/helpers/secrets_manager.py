"""
Secrets Manager for Agent Zero
Based on PR #523 - Secure handling of sensitive information
"""

import os
import re
from typing import Dict, Optional, List
from python.helpers.print_style import PrintStyle
from python.helpers.files import get_abs_path
from python.helpers.errors import RepairableException

class SecretsManager:
    """
    Manages secrets with automatic masking and placeholder replacement.
    Prevents accidental exposure of sensitive data in logs and UI.
    """
    
    SECRETS_FILE = "tmp/secrets.env"
    PLACEHOLDER_PATTERN = r"§§([A-Z_][A-Z0-9_]*)§§"
    MASK_VALUE = "***"
    
    _instance: Optional["SecretsManager"] = None
    _secrets_cache: Optional[Dict[str, str]] = None
    
    @classmethod
    def get_instance(cls) -> "SecretsManager":
        """Get singleton instance of SecretsManager"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self.secrets_file_path = get_abs_path(self.SECRETS_FILE)
        self._ensure_secrets_file()
    
    def _ensure_secrets_file(self):
        """Ensure secrets file exists"""
        os.makedirs(os.path.dirname(self.secrets_file_path), exist_ok=True)
        if not os.path.exists(self.secrets_file_path):
            with open(self.secrets_file_path, 'w') as f:
                f.write("# Agent Zero Secrets File\n")
                f.write("# Format: KEY_NAME=value\n")
                f.write("# Use §§KEY_NAME§§ as placeholder in prompts\n\n")
    
    def load_secrets(self) -> Dict[str, str]:
        """Load secrets from file, return key-value dict"""
        if self._secrets_cache is not None:
            return self._secrets_cache
        
        secrets = {}
        if os.path.exists(self.secrets_file_path):
            try:
                with open(self.secrets_file_path, 'r') as f:
                    content = f.read()
                    secrets = self._parse_env_content(content)
            except Exception as e:
                PrintStyle.error(f"Error loading secrets: {e}")
        
        self._secrets_cache = secrets
        return secrets
    
    def _parse_env_content(self, content: str) -> Dict[str, str]:
        """Parse .env file content into key-value pairs"""
        secrets = {}
        for line in content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    # Remove quotes if present
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]
                    secrets[key] = value
        return secrets
    
    def save_secrets(self, secrets_content: str):
        """Save secrets content to file and update cache"""
        try:
            os.makedirs(os.path.dirname(self.secrets_file_path), exist_ok=True)
            with open(self.secrets_file_path, 'w') as f:
                f.write(secrets_content)
            
            # Update cache
            self._secrets_cache = self._parse_env_content(secrets_content)
            PrintStyle.success("Secrets saved successfully")
        except Exception as e:
            PrintStyle.error(f"Error saving secrets: {e}")
    
    def replace_placeholders(self, text: str) -> str:
        """Replace secret placeholders with actual values"""
        if not text:
            return text
        
        secrets = self.load_secrets()
        
        def replacer(match):
            key = match.group(1)
            
            # Try exact match first
            if key in secrets:
                return secrets[key]
            
            # Try key variations for better UX
            variations = self._get_key_variations(key)
            for variant in variations:
                if variant in secrets:
                    return secrets[variant]
            
            # If placeholder not found, raise repairable exception
            available_keys = list(secrets.keys())
            raise RepairableException(
                f"Secret placeholder §§{key}§§ not found in secrets.",
                f"Available secrets: {', '.join(available_keys) if available_keys else 'None'}. "
                f"Add {key} to your secrets or use an existing key."
            )
        
        try:
            # Replace all placeholders
            result = re.sub(self.PLACEHOLDER_PATTERN, replacer, text)
            return result
        except RepairableException:
            raise
        except Exception as e:
            PrintStyle.error(f"Error replacing placeholders: {e}")
            return text
    
    def _get_key_variations(self, key: str) -> List[str]:
        """
        Generate common variations of a key name for flexible matching
        e.g., OPENAI_API_KEY -> [API_KEY_OPENAI, OPENAI_KEY, etc.]
        """
        variations = []
        
        # If contains API_KEY, try swapping order
        if "API_KEY" in key:
            parts = key.split("_")
            if "API" in parts and "KEY" in parts:
                # Try moving API_KEY to different positions
                api_key_idx = parts.index("API")
                if api_key_idx > 0:
                    # Move API_KEY to end
                    new_parts = [p for p in parts if p not in ["API", "KEY"]]
                    variations.append("_".join(new_parts + ["API", "KEY"]))
                    variations.append("_".join(["API", "KEY"] + new_parts))
        
        # Try without underscores
        variations.append(key.replace("_", ""))
        
        # Try common suffixes/prefixes
        if key.endswith("_KEY"):
            variations.append(key[:-4])  # Remove _KEY
        elif key.endswith("_TOKEN"):
            variations.append(key[:-6])  # Remove _TOKEN
        
        if not key.endswith("_KEY") and not key.endswith("_TOKEN"):
            variations.append(f"{key}_KEY")
            variations.append(f"{key}_TOKEN")
        
        return variations
    
    def mask_values(self, text: str) -> str:
        """
        Replace actual secret values with their placeholder names in text.
        Used for logging and display to prevent secret exposure.
        """
        if not text:
            return text
        
        secrets = self.load_secrets()
        if not secrets:
            return text
        
        masked_text = text
        
        # Sort by length (longest first) to avoid partial replacements
        sorted_secrets = sorted(secrets.items(), key=lambda x: len(x[1]), reverse=True)
        
        for key, value in sorted_secrets:
            if value and len(value) > 3:  # Only mask substantial values
                # Replace the actual value with the placeholder
                masked_text = masked_text.replace(value, f"§§{key}§§")
        
        return masked_text
    
    def get_masked_content(self) -> str:
        """
        Get secrets content with values masked for frontend display
        """
        secrets = self.load_secrets()
        if not secrets:
            return "# No secrets configured\n"
        
        lines = ["# Agent Zero Secrets (values hidden)\n"]
        for key in sorted(secrets.keys()):
            lines.append(f"{key}={self.MASK_VALUE}")
        
        return "\n".join(lines)
    
    def add_secret(self, key: str, value: str):
        """Add or update a single secret"""
        secrets = self.load_secrets()
        secrets[key] = value
        
        # Rebuild the env file content
        lines = ["# Agent Zero Secrets File\n"]
        for k, v in sorted(secrets.items()):
            # Escape quotes in value
            v = v.replace('"', '\\"')
            lines.append(f'{k}="{v}"')
        
        self.save_secrets("\n".join(lines))
    
    def remove_secret(self, key: str) -> bool:
        """Remove a secret by key"""
        secrets = self.load_secrets()
        if key in secrets:
            del secrets[key]
            
            # Rebuild the env file content
            lines = ["# Agent Zero Secrets File\n"]
            for k, v in sorted(secrets.items()):
                v = v.replace('"', '\\"')
                lines.append(f'{k}="{v}"')
            
            self.save_secrets("\n".join(lines))
            return True
        return False
    
    def has_placeholder(self, text: str) -> bool:
        """Check if text contains any secret placeholders"""
        if not text:
            return False
        return bool(re.search(self.PLACEHOLDER_PATTERN, text))
    
    def list_placeholders(self, text: str) -> List[str]:
        """Extract all placeholder keys from text"""
        if not text:
            return []
        matches = re.findall(self.PLACEHOLDER_PATTERN, text)
        return list(set(matches))  # Remove duplicates
    
    def validate_secrets(self, required_keys: List[str]) -> Dict[str, bool]:
        """
        Validate that required secret keys are present
        Returns dict of key -> exists (True/False)
        """
        secrets = self.load_secrets()
        return {key: key in secrets for key in required_keys}