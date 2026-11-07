import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler

TOKEN = "9018638435:AAGgTtWxvcIsVCGht0fImuGg4yeszVaKbYs"
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

if __name__ == '__main__':
    application = ApplicationBuilder().token(TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.run_polling()
