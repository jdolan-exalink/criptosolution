import asyncio
from sqlalchemy import select
from libs.common.database import AsyncSessionLocal
from libs.common.models import EquityTick, BotSession

async def main():
    async with AsyncSessionLocal() as session:
        # Get newest 5 ticks unconditionally
        res = await session.execute(select(EquityTick).order_by(EquityTick.timestamp.desc()).limit(5))
        ticks = res.scalars().all()
        print("--- LATEST 5 TICKS ---")
        for t in ticks:
            print(f"ID={t.id}, TS={t.timestamp}, Bal={t.total_balance}")

        # Get session
        res = await session.execute(select(BotSession).order_by(BotSession.start_time.desc()).limit(1))
        bot_session = res.scalar_one_or_none()
        if bot_session:
            print(f"\n--- SESSION ---")
            print(f"Start Time={bot_session.start_time}")

if __name__ == "__main__":
    asyncio.run(main())
