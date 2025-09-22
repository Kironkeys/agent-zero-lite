# Scheduler Instrument

Advanced scheduling and task management capabilities.

## Capabilities
- Create, update, and delete scheduled tasks
- Set recurring schedules (daily, weekly, monthly)
- Timezone-aware scheduling
- Task dependencies and priorities
- Calendar integration
- Reminder notifications

## Usage
Execute the scheduler script with action and parameters:

```bash
/instruments/custom/scheduler/scheduler.sh create --task "Team meeting" --time "2024-01-15 14:00" --recurring "weekly"
/instruments/custom/scheduler/scheduler.sh list --date "2024-01-15"
/instruments/custom/scheduler/scheduler.sh update --id "task-123" --time "15:00"
/instruments/custom/scheduler/scheduler.sh delete --id "task-123"
```

## Actions
- `create`: Create new scheduled task
- `list`: List tasks for a date/range
- `update`: Modify existing task
- `delete`: Remove task
- `remind`: Set reminders
- `export`: Export to calendar format