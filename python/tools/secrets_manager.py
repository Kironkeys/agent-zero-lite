"""
Tool for managing secrets in Agent Zero
Based on PR #523 - Secure handling of sensitive information
"""

import json
from python.helpers.tool import Tool, Response
from python.helpers.secrets_manager import SecretsManager as SecretsManagerHelper
from python.helpers.print_style import PrintStyle

class SecretsManager(Tool):
    async def execute(self, **kwargs):
        action = self.args.get("action", "list")
        secrets_mgr = SecretsManagerHelper.get_instance()
        
        if action == "list":
            # Show available secrets (masked)
            masked_content = secrets_mgr.get_masked_content()
            return Response(
                message=f"Current secrets:\n\n{masked_content}",
                break_loop=False
            )
        
        elif action == "add":
            key = self.args.get("key", "").upper()
            value = self.args.get("value", "")
            
            if not key or not value:
                return Response(
                    message="Error: Both 'key' and 'value' are required for add action",
                    break_loop=False
                )
            
            # Validate key format
            if not key.replace("_", "").isalnum():
                return Response(
                    message=f"Error: Invalid key format: {key}. Use only letters, numbers, and underscores.",
                    break_loop=False
                )
            
            secrets_mgr.add_secret(key, value)
            
            return Response(
                message=f"Secret '{key}' added successfully. Use §§{key}§§ as placeholder in prompts and tools.",
                break_loop=False
            )
        
        elif action == "remove":
            key = self.args.get("key", "").upper()
            
            if not key:
                return Response(
                    message="Error: 'key' is required for remove action",
                    break_loop=False
                )
            
            if secrets_mgr.remove_secret(key):
                return Response(
                    message=f"Secret '{key}' removed successfully.",
                    break_loop=False
                )
            else:
                return Response(
                    message=f"Secret '{key}' not found.",
                    break_loop=False
                )
        
        elif action == "test":
            # Test placeholder replacement
            test_text = self.args.get("text", "")
            
            if not test_text:
                return Response(
                    message="Error: 'text' is required for test action",
                    break_loop=False
                )
            
            try:
                result = secrets_mgr.replace_placeholders(test_text)
                # Mask the result for display
                masked_result = secrets_mgr.mask_values(result)
                
                placeholders = secrets_mgr.list_placeholders(test_text)
                
                return Response(
                    message=f"Test result:\n"
                           f"Input: {test_text}\n"
                           f"Output (masked): {masked_result}\n"
                           f"Placeholders found: {placeholders}",
                    break_loop=False
                )
            except Exception as e:
                return Response(
                    message=f"Error testing placeholder replacement: {e}",
                    break_loop=False
                )
        
        elif action == "validate":
            # Validate that required secrets are present
            required_keys = self.args.get("required_keys", [])
            
            if not required_keys:
                return Response(
                    message="Error: 'required_keys' list is required for validate action",
                    break_loop=False
                )
            
            validation_result = secrets_mgr.validate_secrets(required_keys)
            
            missing = [key for key, exists in validation_result.items() if not exists]
            present = [key for key, exists in validation_result.items() if exists]
            
            message = f"Validation result:\n"
            if present:
                message += f"✓ Present: {', '.join(present)}\n"
            if missing:
                message += f"✗ Missing: {', '.join(missing)}\n"
                message += f"\nTo add missing secrets, use: action='add', key='KEY_NAME', value='secret_value'"
            
            return Response(
                message=message,
                break_loop=False
            )
        
        else:
            return Response(
                message=f"Error: Unknown action: {action}. Available actions: list, add, remove, test, validate",
                break_loop=False
            )