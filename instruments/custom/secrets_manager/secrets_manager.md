# secrets_manager Instrument

### secrets_manager:
Manage secrets and sensitive information securely. Use placeholders in prompts and tools to reference secrets without exposing them.

**Available actions:**

1. **list** - Show all configured secrets (values masked)
   - No additional arguments needed

2. **add** - Add or update a secret
   - `key`: The secret key name (e.g., "OPENAI_API_KEY")
   - `value`: The actual secret value

3. **remove** - Remove a secret
   - `key`: The secret key to remove

4. **test** - Test placeholder replacement
   - `text`: Text containing placeholders to test (e.g., "API key is §§OPENAI_API_KEY§§")

5. **validate** - Check if required secrets are configured
   - `required_keys`: List of required secret keys

**How to use placeholders:**
- In prompts and tool arguments, use `§§KEY_NAME§§` format
- The system will automatically replace placeholders with actual values
- Actual values are masked in logs and outputs for security

**Example usage:**
```json
{
  "thoughts": ["I need to configure my API key securely"],
  "tool_name": "secrets_manager",
  "tool_args": {
    "action": "add",
    "key": "OPENAI_API_KEY",
    "value": "sk-abc123..."
  }
}
```

**Using placeholders in other tools:**
```json
{
  "tool_name": "code_execution",
  "tool_args": {
    "code": "api_key = '§§OPENAI_API_KEY§§'\nprint(f'Key configured: {api_key[:10]}...')"
  }
}
```

The placeholder `§§OPENAI_API_KEY§§` will be replaced with the actual value before execution, and any logs will show the placeholder instead of the real value.