from python.helpers.api import ApiHandler, Input, Output, Request, Response
from python.helpers import persist_chat
from python.helpers.persist_chat_supabase import remove_chat as remove_chat_files


class Reset(ApiHandler):
    async def process(self, input: Input, request: Request) -> Output:
        ctxid = input.get("context", "")

        # context instance - get or create
        context = self.get_context(ctxid)
        
        # IMPORTANT: Clear both in-memory AND persistent storage
        # This ensures the reset actually clears everything
        context.reset()
        
        # Remove the local JSON files completely
        # This forces a fresh start on next load
        try:
            remove_chat_files(context.id)
            print(f"✅ Removed local chat files for context: {context.id}")
        except Exception as e:
            print(f"⚠️ Could not remove local files: {e}")
        
        # Don't save after reset - we want a clean slate
        # persist_chat.save_tmp_chat(context)  # REMOVED - don't save empty context

        return {
            "message": "Agent restarted and chat history cleared.",
        }
