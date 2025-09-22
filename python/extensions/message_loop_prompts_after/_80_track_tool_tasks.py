from python.helpers.extension import Extension
from python.helpers.print_style import PrintStyle
import asyncio

class TrackToolTasks(Extension):
    """
    Extension to track active tool tasks and add their status to the system prompt.
    This provides visibility into parallel task execution.
    """
    
    async def execute(self, loop_data=None, **kwargs):
        """
        Track active tool tasks and add information to system prompt.
        
        Args:
            loop_data: Current message loop data
            
        Returns:
            Modified loop data with task tracking information
        """
        try:
            # Get active tasks from agent data
            active_tasks = self.agent.get_data("active_tool_tasks") or {}
            completed_tasks = self.agent.get_data("completed_tool_tasks") or {}
            
            if not active_tasks and not completed_tasks:
                return loop_data
            
            # Build task status information
            task_info_parts = []
            
            # Active tasks
            if active_tasks:
                task_info_parts.append("🔄 Active Background Tasks:")
                for task_id, task_info in active_tasks.items():
                    tool_name = task_info.get("tool_name", "unknown")
                    elapsed = asyncio.get_event_loop().time() - task_info.get("started_at", 0)
                    task_info_parts.append(f"  • {task_id}: {tool_name} (running for {elapsed:.1f}s)")
            
            # Recently completed tasks (show last 5)
            if completed_tasks:
                recent_completed = list(completed_tasks.items())[-5:]
                if recent_completed:
                    task_info_parts.append("\n✅ Recently Completed Tasks:")
                    for task_id, task_result in recent_completed:
                        status = task_result.get("status", "unknown")
                        tool = task_result.get("tool", "unknown")
                        task_info_parts.append(f"  • {task_id}: {tool} ({status})")
            
            if task_info_parts:
                # Add to system prompt
                task_tracking_prompt = "\n".join(task_info_parts)
                
                # Add to loop data if it exists
                if loop_data and "system_prompt" in loop_data:
                    loop_data["system_prompt"] += f"\n\n## Background Task Status\n{task_tracking_prompt}"
                
                # Also log for debugging
                PrintStyle.info(f"Tracking {len(active_tasks)} active and {len(completed_tasks)} completed tasks")
            
            # Clean up old completed tasks (keep only last 10)
            if len(completed_tasks) > 10:
                completed_items = list(completed_tasks.items())
                completed_tasks = dict(completed_items[-10:])
                self.agent.set_data("completed_tool_tasks", completed_tasks)
            
            return loop_data
            
        except Exception as e:
            PrintStyle.error(f"Error tracking tool tasks: {str(e)}")
            return loop_data