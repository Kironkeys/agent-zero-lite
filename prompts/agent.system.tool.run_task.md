# Tool: run_task

## Overview
The `run_task` tool allows you to execute multiple tools in parallel background contexts. This enables you to start long-running operations and continue with other tasks while they execute.

## Usage
```python
run_task(tool_calls=[
    {
        "tool": "knowledge_tool",
        "arguments": {"query": "analyze market trends"}
    },
    {
        "tool": "code_execution_tool", 
        "arguments": {"code": "complex_calculation()"}
    }
])
```

## Key Features
- **Parallel Execution**: Run multiple tools simultaneously
- **Background Processing**: Continue reasoning while tools execute
- **Task Tracking**: Each task gets a unique ID for tracking
- **Isolated Contexts**: Tools run in isolated environments

## Best Practices
1. Use for long-running operations (>5 seconds)
2. Group related tools together
3. Always track task IDs returned
4. Use `wait_for_tasks` to collect results
5. Consider timeouts for long operations

## Example Workflow
```python
# 1. Start parallel tasks
response = run_task(tool_calls=[...])
# Returns: task_ids like "abc123,def456"

# 2. Continue with other work while tasks run
# Do other reasoning or tool calls

# 3. Collect results when needed
results = wait_for_tasks(task_ids="abc123,def456")
```

## Error Handling
- Invalid tool names will be reported
- Tasks that fail will return error status
- Timeouts default to 300 seconds