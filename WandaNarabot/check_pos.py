import asyncio
from libs.common.database import AsyncSessionLocal
from libs.common.models import Position
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as s:
        pos = (await s.execute(select(Position))).scalars().all()
        print("=== POSICIONES ACTUALES ===")
        for p in pos:
            print(f"  {p.symbol:<12}  amount={p.amount}  entry=${p.entry_price:.2f}  upnl={p.unrealized_pnl:.4f}  SL=${p.stop_loss:.2f}  leverage={p.leverage}x")
        print(f"  Total: {len(pos)} posiciones abiertas")

asyncio.run(main())
