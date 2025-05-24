// pm2 restart index.js

const { Telegraf, Markup } = require("telegraf");
const films = require("./data-movie");

const BOT_TOKEN = "8068690808:AAEUKMt4sZJCrkJ9IiT22uA0Cpzh6_515VU";
const CHANNEL_ID = "-1002556318549";
const ADMIN_ID = 7676273635;
const bot = new Telegraf(BOT_TOKEN);

const userLast = {};

bot.start(async (ctx) => {
  const name = ctx.from.first_name || "Foydalanuvchi";
  await ctx.reply(`Salom ${name}, film ID sini kiriting ✍`, {
    reply_markup: {
      keyboard: [["📥 Film ID yuborish"]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
  await ctx.telegram.sendMessage(ADMIN_ID, `Yangi foydalanuvchi++ ${name}`);
});

async function sendFilm(ctx, film, part) {
  const chatId = ctx.chat.id;
  const msgId = films[film]?.[part];
  if (!msgId) return ctx.reply("Kechirasiz, texnik nosozlik ❌");

  try {
    if (userLast[chatId]?.msg) {
      try {
        await ctx.telegram.deleteMessage(chatId, userLast[chatId].msg);
      } catch {}
    }
    if (userLast[chatId]?.btn) {
      try {
        await ctx.telegram.deleteMessage(chatId, userLast[chatId].btn);
      } catch {}
    }

    const sent = await ctx.telegram.copyMessage(chatId, CHANNEL_ID, msgId);
    const parts = Object.keys(films[film]).filter((p) => p !== part);
    const buttons = parts.map((p) => Markup.button.callback(p, `${film}_${p}`));
    const btnMsg = parts.length
      ? await ctx.reply(
          "————— Qolgan — qismlar —————",
          Markup.inlineKeyboard([buttons])
        )
      : null;

    userLast[chatId] = {
      msg: sent.message_id,
      btn: btnMsg?.message_id || null,
    };
  } catch {
    await ctx.reply("Internet bilan aloqa uzildi ❌");
  }
}

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  const id = parseInt(text);
  if (!/^\d+$/.test(text)) return ctx.reply("Faqat film ID sini kiriting ❗️");

  let found = null;
  for (const f in films) {
    for (const p in films[f]) {
      if (films[f][p] === id) {
        found = { f, p };
        break;
      }
    }
    if (found) break;
  }

  if (found) return sendFilm(ctx, found.f, found.p);
  try {
    await ctx.telegram.copyMessage(ctx.chat.id, CHANNEL_ID, id);
  } catch {
    await ctx.reply("Film topilmadi. ❌");
  }
});

bot.action(/(.+)_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const [_, film, part] = ctx.match;
  await sendFilm(ctx, film, part);
});

bot.launch();
console.log("Bot ishga tushdi...!");
