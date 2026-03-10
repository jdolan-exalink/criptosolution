import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from libs.common.config import settings

logger = logging.getLogger(__name__)

class TelegramBotClient:
    def __init__(self, token: str = settings.TELEGRAM_BOT_TOKEN):
        self.token = token
        if not self.token:
            logger.warning("Telegram token not provided. Telegram bot will not be active.")
            self.app = None
        else:
            self.app = ApplicationBuilder().token(self.token).build()
            self._register_handlers()
            
    def _register_handlers(self):
        self.app.add_handler(CommandHandler("start", self.start))
        self.app.add_handler(CommandHandler("status", self.status))
        self.app.add_handler(CommandHandler("balance", self.balance))
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text("WandaNarabot Online! Comando /status para ver el estado.")
        
    async def status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text(f"Bot status: ACTIVE | Environment: {settings.BINANCE_ENV} ({settings.BINANCE_MARKET_TYPE})")

    async def balance(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text("Consultando balance de cuenta... Funcionalidad en desarrollo.")
        
    async def run_polling(self):
        if self.app:
            logger.info("Starting Telegram Bot Polling...")
            await self.app.initialize()
            await self.app.start()
            await self.app.updater.start_polling()
            
    async def send_message(self, chat_id: str, text: str):
        if self.app:
            await self.app.bot.send_message(chat_id=chat_id, text=text)
