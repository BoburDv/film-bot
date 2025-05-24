const { Telegraf, Markup } = require("telegraf");
const films = require("./data-movie");

const BOT_TOKEN = "8068690808:AAEUKMt4sZJCrkJ9IiT22uA0Cpzh6_515VU";
const CHANNEL_ID = "-1002556318549";
const ADMIN_ID = 7676273635;
const bot = new Telegraf(BOT_TOKEN);

const userLast = {};
const waitingReply = {};
const userState = {};

bot.start(async (ctx) => {
  const name = ctx.from.first_name || "Foydalanuvchi";
  await ctx.reply(`Salom ${name}, film ID sini kiriting ✍`,
    Markup.keyboard([
      ["🎬 Film buyurtma qilish"]
    ]).resize()
  );
  await ctx.telegram.sendMessage(ADMIN_ID, `Yangi foydalanuvchi++ ${name}`);
});

bot.hears("🎬 Film buyurtma qilish", async (ctx) => {
  const userId = ctx.from.id;
  waitingReply[userId] = true;
  userState[userId] = "waiting";
  await ctx.reply("Iltimos film nomini yozib qoldiring...",
    Markup.keyboard([["📩 Yuborish"]]).resize()
  );
});

bot.hears("📩 Yuborish", async (ctx) => {
  const userId = ctx.from.id;
  if (waitingReply[userId]) {
    await ctx.reply("Iltimos, film nomini yozib yuboring.");
  }
});

bot.hears("❌ Buyurtmani bekor qilish", async (ctx) => {
  const userId = ctx.from.id;
  waitingReply[userId] = false;
  userState[userId] = null;
  await ctx.reply("Buyurtma bekor qilindi ❌",
    Markup.keyboard([["🎬 Film buyurtma qilish"]]).resize()
  );
});

async function sendFilm(ctx, film, part) {
  const chatId = ctx.chat.id;
  const msgId = films[film]?.[part];
  if (!msgId) return ctx.reply("Kechirasiz, texnik nosozlik ❌");

  try {
    if (userLast[chatId]?.msg) {
      try { await ctx.telegram.deleteMessage(chatId, userLast[chatId].msg); } catch {}
    }
    if (userLast[chatId]?.btn) {
      try { await ctx.telegram.deleteMessage(chatId, userLast[chatId].btn); } catch {}
    }

    const sent = await ctx.telegram.copyMessage(chatId, CHANNEL_ID, msgId);
    const parts = Object.keys(films[film]).filter(p => p !== part);
    const buttons = parts.map(p => Markup.button.callback(p, `${film}_${p}`));
    const btnMsg = parts.length ? await ctx.reply("————— Qolgan — qismlar —————", Markup.inlineKeyboard([buttons])) : null;

    userLast[chatId] = { msg: sent.message_id, btn: btnMsg?.message_id || null };
  } catch {
    await ctx.reply("Internet bilan aloqa uzildi ❌");
  }
}

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();

  if (waitingReply[userId] && !["📩 Yuborish", "🎬 Film buyurtma qilish", "❌ Buyurtmani bekor qilish"].includes(text)) {
    waitingReply[userId] = false;
    userState[userId] = "sent";

    await ctx.telegram.sendMessage(ADMIN_ID, `📥 Buyurtma:\n${text}\n👤 @${ctx.from.username || ctx.from.first_name}`);
    await ctx.reply("Buyurtmangiz qabul qilindi ✅",
      Markup.keyboard([["❌ Buyurtmani bekor qilish"]]).resize()
    );
    return;
  }

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
  try { await ctx.telegram.copyMessage(ctx.chat.id, CHANNEL_ID, id); }
  catch { await ctx.reply("Film topilmadi. ❌"); }
});

bot.action(/(.+)_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const [_, film, part] = ctx.match;
  await sendFilm(ctx, film, part);
});

bot.launch();
console.log("Bot ishga tushdi...!");
