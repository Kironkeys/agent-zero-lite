"""
Hook to integrate Secrets Manager into Agent Zero
Processes all tool inputs to handle secret placeholders
"""

from python.helpers.secrets_manager import SecretsManager
from python.helpers.print_style import PrintStyle
from python.helpers.tool import Tool

# Store original methods
original_init = Tool.__init__
original_before_execution = Tool.before_execution

def __init_with_secrets__(self, agent, name, method, args, message, loop_data, **kwargs):
    """Enhanced init that processes secrets in args"""
    secrets_mgr = SecretsManager.get_instance()
    
    # Process args to replace placeholders
    if args and isinstance(args, dict):
        processed_args = {}
        for key, value in args.items():
            if isinstance(value, str) and secrets_mgr.has_placeholder(value):
                try:
                    # Replace placeholders with actual values
                    processed_value = secrets_mgr.replace_placeholders(value)
                    processed_args[key] = processed_value
                    # Log that we replaced a placeholder (without showing the value)
                    PrintStyle.info(f"[Secrets] Replaced placeholder in {key}")
                except Exception as e:
                    PrintStyle.warning(f"[Secrets] Could not process placeholder in {key}: {e}")
                    processed_args[key] = value
            else:
                processed_args[key] = value
        args = processed_args
    
    # Process message to replace placeholders
    if message and isinstance(message, str) and secrets_mgr.has_placeholder(message):
        try:
            message = secrets_mgr.replace_placeholders(message)
            PrintStyle.info("[Secrets] Replaced placeholder in message")
        except Exception:
            pass
    
    # Call original init with processed values
    original_init(self, agent, name, method, args, message, loop_data, **kwargs)

def before_execution_with_masking(self, **kwargs):
    """Enhanced before_execution that masks secrets in logs"""
    secrets_mgr = SecretsManager.get_instance()
    
    # Temporarily replace args with masked versions for logging
    original_args = self.args
    if self.args and isinstance(self.args, dict):
        masked_args = {}
        for key, value in self.args.items():
            if isinstance(value, str):
                masked_args[key] = secrets_mgr.mask_values(value)
            else:
                masked_args[key] = value
        self.args = masked_args
    
    # Call original before_execution (which does the logging)
    result = original_before_execution(self, **kwargs)
    
    # Restore original args
    self.args = original_args
    
    return result

# Patch the Tool class
Tool.__init__ = __init_with_secrets__
Tool.before_execution = before_execution_with_masking

PrintStyle.success("[Secrets Manager] Extension loaded - placeholders will be replaced, values will be masked in logs")