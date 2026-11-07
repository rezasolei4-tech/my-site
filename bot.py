import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler
from flask import Flask
from threading import Thread

# تنظیم لاگ‌ها
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

TOKEN = "9018638435:AAGgTtWxvcIsVCGht0fImuGg4yeszVaKbYs"
IMAGE_URL = "https://rezasolei4-tech.github.io/my-site/cover.jpg"
GAME_URL = "https://rezasolei4-tech.github.io/my-site/"

# --- بخش جدید: وب‌سرور ساختگی برای راضی کردن Render ---
app = Flask('')

@app.route('/')
def home():
    return "Bot is alive!"

def run_flask():
    # Render به صورت خودکار پورت را از محیط می‌خواند
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)

def keep_alive():
    t = Thread(target=run_flask)
    t.start()
# -------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton("🎮 ورود به بازی منچ", url=GAME_URL)]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_photo(
        photo=IMAGE_URL,
        caption="سلام! به بازی منچ آنلاین خوش آمدی 🎲\n\nبرای شروع بازی روی دکمه زیر کلیک کن.",
        reply_markup=reply_markup
    )

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logging.error("خطایی رخ داد:", exc_info=context.error)

if __name__ == '__main__':
    # شروع وب‌سرور ساختگی
    keep_alive()
    
    application = ApplicationBuilder().token(TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.add_error_handler(error_handler)
    
    print("ربات روشن شد...")
    application.run_polling()
