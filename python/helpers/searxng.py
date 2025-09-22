import aiohttp
from python.helpers import runtime

URL = "http://localhost:55510/search"

async def search(query:str):
    # Since we run SearxNG in the same container, call it directly
    # No need for development RPC - we're all in one container!
    return await _search(query)

async def _search(query:str):
    async with aiohttp.ClientSession() as session:
        async with session.post(URL, data={"q": query, "format": "json"}) as response:
            return await response.json()
