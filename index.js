require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");

const {
  handleStart,
  handleReferal,
  handleBuyurtma,
  handleText,
  handleActions,
} = require("./handlers");
const { loadUserData } = require("./handlers/userData");

const bot = new Telegraf(process.env.BOT_TOKEN);
loadUserData();

bot.start((ctx) => handleStart(bot, ctx));
bot.hears("🎁 Referal", (ctx) => handleReferal(bot, ctx));
bot.hears("🎬 Buyurtma qilish", (ctx) => handleBuyurtma(bot, ctx));
bot.on("text", (ctx) => handleText(bot, ctx));
handleActions(bot);

bot.launch();
