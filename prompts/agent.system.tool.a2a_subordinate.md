### a2a_subordinate
Spawn and communicate with subordinate agents running in parallel processes. Use this to delegate tasks to specialized agents that can work independently. Each subordinate runs as a separate process and can execute tools, search, code, analyze data, etc. in parallel with other agents.

**Usage:** `a2a_subordinate role="role" message="task" prompt_profile="default" reset="false" timeout=300`

**Parameters:**
- `message` (required) - The task or message to send to the subordinate agent
- `role` - The role/specialty of the subordinate (default: "specialist")
  - `researcher` - Information gathering and web search
  - `coder` - Writing and debugging code
  - `analyst` - Data analysis and visualization
  - `tester` - Testing and quality assurance
  - `writer` - Content creation and documentation
  - `specialist` - General purpose specialist
- `prompt_profile` - Prompt profile to use (default: "default")
- `reset` - Set to "true" to spawn a new subordinate even if one exists for this role
- `timeout` - Maximum time to wait for response in seconds (default: 300)

**Examples:**

Spawn a researcher:
```
a2a_subordinate role="researcher" message="Research the latest AI trends and breakthroughs in 2024"
```

Spawn a coder:
```
a2a_subordinate role="coder" message="Write a Python function to calculate fibonacci numbers with memoization"
```

Spawn multiple agents in parallel (use separate tool calls):
```
a2a_subordinate role="analyst" message="Analyze this sales data and identify trends"
a2a_subordinate role="writer" message="Write a summary report of the findings"
a2a_subordinate role="coder" message="Create a visualization script for the data"
```

Force spawn a new agent:
```
a2a_subordinate role="researcher" message="Find information about quantum computing" reset="true"
```

**Important Notes:**
- Each subordinate runs as an independent process with its own memory and context
- Subordinates can execute tools and perform complex multi-step tasks
- Use different roles to spawn multiple agents working in parallel
- Subordinates persist between calls unless reset="true" is used
- Results are prefixed with **@role (agent_id):** for clarity