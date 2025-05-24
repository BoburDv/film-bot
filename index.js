const { Telegraf, Markup } = require("telegraf");
const films = require("./data-movie");

const bot = new Telegraf("8068690808:AAEUKMt4sZJCrkJ9IiT22uA0Cpzh6_515VU");
const ADMIN = 7676273635, CHANNEL = "-1002556318549";
const userLast = {};

bot.start(async ctx => {
  const name = ctx.from.first_name || "Foydalanuvchi";
  await ctx.reply(
    `Salom ${name}, film ID sini kiriting ✍`,
    Markup.keyboard([["🎬 Film buyurtma qilish"]]).resize()
  );
  await ctx.telegram.sendMessage(ADMIN, `Yangi foydalanuvchi++ ${name}`);
});

bot.hears("🎬 Film buyurtma qilish", async ctx => {
  await ctx.reply("❕Iltimos film nomini yozib qoldiring.", Markup.removeKeyboard());
});

bot.on("text", async ctx => {
  const id = ctx.from.id;
  const text = ctx.message.text.trim();

  if (isNaN(text)) {
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    await ctx.telegram.sendMessage(ADMIN, `📥 Buyurtma:\n${text}\n👤 ${user}`);
    await ctx.reply("Buyurtma qabul qilindi! ✅", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "cancel_order" }]]
      }
    });
    return;
  }

  if (!/^\d+$/.test(text)) {
    return ctx.reply("Faqat film ID sini kiriting ❗️");
  }

  let found = null;
  for (const f in films) {
    for (const p in films[f]) {
      if (films[f][p] === +text) {
        found = { f, p };
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    if (userLast[id]?.msg) await ctx.telegram.deleteMessage(id, userLast[id].msg).catch(() => {});
    if (userLast[id]?.btn) await ctx.telegram.deleteMessage(id, userLast[id].btn).catch(() => {});
    return sendFilm(ctx, found.f, found.p);
  }

  try {
    await ctx.telegram.copyMessage(ctx.chat.id, CHANNEL, +text);
  } catch {
    await ctx.reply("Film topilmadi ❌");
  }
});

bot.action("cancel_order", async ctx => {
  await ctx.reply("Buyurtma bekor qilindi ❌", Markup.keyboard([["🎬 Film buyurtma qilish"]]).resize());
  await ctx.answerCbQuery();
});

bot.action(/(.+)_(\d+)/, async ctx => {
  await ctx.answerCbQuery();
  const [_, f, p] = ctx.match;
  await sendFilm(ctx, f, p);
});

async function sendFilm(ctx, f, p) {
  const chatId = ctx.chat.id;
  const msgId = films[f]?.[p];
  if (!msgId) return ctx.reply("Kechirasiz, texnik nosozlik ❌");

  try {
    const sent = await ctx.telegram.copyMessage(chatId, CHANNEL, msgId);
    const parts = Object.keys(films[f]).filter(x => x !== p);
    const buttons = parts.map(x => Markup.button.callback(x, `${f}_${x}`));
    const btnMsg = parts.length
      ? await ctx.reply("————— Qolgan — qismlar —————", Markup.inlineKeyboard([buttons]))
      : null;

    userLast[chatId] = { msg: sent.message_id, btn: btnMsg?.message_id || null };
  } catch {
    await ctx.reply("Internet bilan aloqa uzildi ❌");
  }
}

bot.launch();
console.log("Bot ishga tushdi...!");