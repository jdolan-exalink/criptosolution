import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from libs.common.database import engine, Base
from libs.common.models import *

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database synced")

if __name__ == "__main__":
    asyncio.run(main())
