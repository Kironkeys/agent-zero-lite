# Tool: wait_for_tasks

## Overview
The `wait_for_tasks` tool retrieves results from background tasks started with `run_task`. It synchronously waits for specified tasks to complete and returns their results.

## Usage
```python
wait_for_tasks(task_ids="task_id1,task_id2,task_id3")
```

## Parameters
- **task_ids**: Comma-separated list of task IDs to wait for
  - IDs are returned by `run_task` when starting tasks
  - Can wait for one or multiple tasks

## Return Format
Returns a structured response with results for each task:
- ✅ Completed tasks with their output
- ⏱️ Timed out tasks
- ❌ Failed tasks with error messages
- ❓ Not found tasks (invalid IDs)

## Features
- **Result Caching**: Completed results are cached
- **Timeout Handling**: Respects task timeouts
- **Error Recovery**: Gracefully handles task failures
- **Status Tracking**: Shows task completion status

## Best Practices
1. Always use valid task IDs from `run_task`
2. Wait for all related tasks together when possible
3. Handle different result statuses appropriately
4. Check for errors before using results

## Example Usage
```python
# After starting tasks with run_task
task_ids = "abc123,def456"

# Retrieve results
results = wait_for_tasks(task_ids=task_ids)

# Results will show:
# ✅ Task abc123 (knowledge_tool): [result content]
# ✅ Task def456 (code_execution): [result content]
```

## Error States
- **timeout**: Task exceeded its timeout limit
- **error**: Task encountered an exception
- **not_found**: Invalid or expired task ID