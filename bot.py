import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler

# 🚨 تنظیم لاگ‌ها برای دیدن خطاها
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

TOKEN = "توکن_خودت_رو_اینجا_بذار"
IMAGE_URL = "https://rezasolei4-tech.github.io/my-site/cover.jpg"
GAME_URL = "https://rezasolei4-tech.github.io/my-site/"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton("🎮 ورود به بازی منچ", url=GAME_URL)]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_photo(
        photo=IMAGE_URL,
        caption="سلام! به بازی منچ آنلاین خوش آمدی 🎲\n\nبرای شروع بازی روی دکمه زیر کلیک کن.",
        reply_markup=reply_markup
    )

# 🚨 تابع مدیریت خطا
async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logging.error("خطایی رخ داد:", exc_info=context.error)

if __name__ == '__main__':
    application = ApplicationBuilder().token(TOKEN).build()
    
    application.add_handler(CommandHandler('start', start))
    
    # 🚨 اضافه کردن مدیریت خطا به برنامه
    application.add_error_handler(error_handler)
    
    print("ربات روشن شد...")
    application.run_polling()
