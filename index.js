const { Telegraf, Markup } = require("telegraf");
const films = require("./data-movie");

const bot = new Telegraf("8068690808:AAEUKMt4sZJCrkJ9IiT22uA0Cpzh6_515VU");
const ADMIN = 7676273635, CHANNEL = "-1002556318549";
const userLast = {}, waiting = {}, state = {};

bot.start(async ctx => {
  const name = ctx.from.first_name || "Foydalanuvchi";
  await ctx.reply(`Salom ${name}, film ID sini kiriting ✍`, Markup.keyboard([["🎬 Film buyurtma qilish"]]).resize());
  await ctx.telegram.sendMessage(ADMIN, `Yangi foydalanuvchi++ ${name}`);
});

bot.hears("🎬 Film buyurtma qilish", async ctx => {
  waiting[ctx.from.id] = true; state[ctx.from.id] = "waiting";
  await ctx.reply("❕ Iltimos film nomini yozib qoldiring", Markup.keyboard([["📩 Yuborish"]]).resize());
});

bot.hears("📩 Yuborish", async ctx => {
  if (waiting[ctx.from.id]) await ctx.reply("Iltimos, film nomini yozib yuboring.");
});

bot.hears("❌ Buyurtmani bekor qilish", async ctx => {
  waiting[ctx.from.id] = false; state[ctx.from.id] = null;
  await ctx.reply("Buyurtma bekor qilindi ❌", Markup.keyboard([["🎬 Film buyurtma qilish"]]).resize());
});

async function sendFilm(ctx, f, p) {
  const chatId = ctx.chat.id, msgId = films[f]?.[p];
  if (!msgId) return ctx.reply("Kechirasiz, texnik nosozlik ❌");
  try {
    if (userLast[chatId]?.msg) await ctx.telegram.deleteMessage(chatId, userLast[chatId].msg).catch(() => {});
    if (userLast[chatId]?.btn) await ctx.telegram.deleteMessage(chatId, userLast[chatId].btn).catch(() => {});
    const sent = await ctx.telegram.copyMessage(chatId, CHANNEL, msgId);
    const parts = Object.keys(films[f]).filter(x => x !== p);
    const buttons = parts.map(x => Markup.button.callback(x, `${f}_${x}`));
    const btnMsg = parts.length ? await ctx.reply("————— Qolgan — qismlar —————", Markup.inlineKeyboard([buttons])) : null;
    userLast[chatId] = { msg: sent.message_id, btn: btnMsg?.message_id || null };
  } catch {
    await ctx.reply("Internet bilan aloqa uzildi ❌");
  }
}

bot.on("text", async ctx => {
  const id = ctx.from.id, text = ctx.message.text.trim();
  if (waiting[id] && !["📩 Yuborish", "🎬 Film buyurtma qilish", "❌ Buyurtmani bekor qilish"].includes(text)) {
    waiting[id] = false; state[id] = "sent";
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    await ctx.telegram.sendMessage(ADMIN, `📥 Buyurtma:\n${text}\n👤 ${user}`);
    return ctx.reply("Buyurtmangiz qabul qilindi! ✅", Markup.keyboard([["❌ Buyurtmani bekor qilish"]]).resize());
  }
  if (!/^\d+$/.test(text)) return ctx.reply("Faqat film ID sini kiriting ❗️");
  let found = null;
  for (const f in films) {
    for (const p in films[f]) {
      if (films[f][p] === +text) { found = { f, p }; break; }
    }
    if (found) break;
  }
  if (found) return sendFilm(ctx, found.f, found.p);
  try { await ctx.telegram.copyMessage(ctx.chat.id, CHANNEL, +text); }
  catch { await ctx.reply("Film topilmadi. ❌"); }
});

bot.action(/(.+)_(\d+)/, async ctx => {
  await ctx.answerCbQuery();
  const [_, f, p] = ctx.match;
  await sendFilm(ctx, f, p);
});

bot.launch();
console.log("Bot ishga tushdi...!");