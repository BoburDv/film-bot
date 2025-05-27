require('dotenv').config();
const { Telegraf, Markup } = require("telegraf");
const films = require("./data-movie");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN = 7676273635, CHANNEL = "-1002556318549";
const userLast = {}, waitOrder = {};

bot.start(async ctx => {
  const name = ctx.from.first_name || "Foydalanuvchi";
  await ctx.reply(
    `Salom ${name}, film ID sini kiriting ✍`,
    Markup.keyboard([
      ["🎬 Buyurtma qilish", "🎁 Referal"]
    ]).resize()
  );
  await ctx.telegram.sendMessage(ADMIN, `Yangi foydalanuvchi++ ${name}`);
});

bot.hears("🎁 Referal", async ctx => {
  await ctx.reply("🔥(Tez kunda...)");
});

bot.hears("🎬 Buyurtma qilish", async ctx => {
  waitOrder[ctx.from.id] = true;
  await ctx.reply(
    "❕𝗜𝗹𝘁𝗶𝗺𝗼𝘀 𝗮𝘃𝘃𝗮𝗹 𝘀𝗶𝘇 𝗶𝘇𝗹𝗮𝗴𝗮𝗻 𝗳𝗶𝗹𝗺 𝗯𝗶𝘇𝗱𝗮 𝗯𝗼𝗿 𝘆𝗼𝗸𝗶 𝘆𝗼'𝗾𝗹𝗶𝗴𝗶𝗻𝗶 𝘁𝗲𝗸𝘀𝗵𝗶𝗿𝗶𝗻𝗴.\nYangi film nomini yozib qoldiring ✍",
    Markup.inlineKeyboard([
      [{ text: "🔙 Ortga qaytish", callback_data: "go_back" }]
    ])
  );
});

bot.on("text", async ctx => {
  const id = ctx.from.id, text = ctx.message.text.trim();

  if (waitOrder[id]) {
    waitOrder[id] = false;
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    await ctx.telegram.sendMessage(ADMIN, `📥 Buyurtma: ${text}\n\n👤 Buyurtmachi: ${user}`);
    return ctx.reply("Buyurtma qabul qilindi! ✅", {
      reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "cancel_order" }]] }
    });
  }

  if (!/^\d+$/.test(text)) return ctx.reply("Faqat film ID sini kiriting ❗️");

  const old = userLast[id];
  if (old?.msg) ctx.telegram.deleteMessage(id, old.msg).catch(() => {});
  if (old?.btn) ctx.telegram.deleteMessage(id, old.btn).catch(() => {});
  userLast[id] = {};

  let found;
  for (let f in films) {
    for (let p in films[f]) {
      if (films[f][p] === +text) {
        found = { f, p };
        break;
      }
    }
    if (found) break;
  }

  if (found) return sendFilm(ctx, found.f, found.p);

  try {
    const sent = await ctx.telegram.copyMessage(id, CHANNEL, +text);
    userLast[id].msg = sent.message_id;
  } catch {
    await ctx.reply("Film topilmadi ❌");
  }
});

bot.action("cancel_order", async ctx => {
  delete waitOrder[ctx.from.id];
  await ctx.reply("Buyurtma bekor qilindi! ✅", Markup.keyboard([["🎬 Buyurtma qilish", "🎁 Referal"]]).resize());
  await ctx.answerCbQuery();
});

bot.action("go_back", async ctx => {
  delete waitOrder[ctx.from.id];
  if (userLast[ctx.from.id]?.msg) await ctx.telegram.deleteMessage(ctx.from.id, userLast[ctx.from.id].msg).catch(() => {});
  if (userLast[ctx.from.id]?.btn) await ctx.telegram.deleteMessage(ctx.from.id, userLast[ctx.from.id].btn).catch(() => {});
  userLast[ctx.from.id] = {};
  await ctx.editMessageReplyMarkup();
  await ctx.reply(
    "Bosh menuga qaytdingiz! ✅",
    Markup.keyboard([
      ["🎬 Buyurtma qilish", "🎁 Referal"]
    ]).resize()
  );
  await ctx.answerCbQuery();
});

bot.action(/(.+)_(\d+)/, async ctx => {
  await ctx.answerCbQuery();
  const [_, f, p] = ctx.match;
  const id = ctx.from.id;
  const old = userLast[id];
  if (old?.btn) ctx.telegram.deleteMessage(id, old.btn).catch(() => {});
  if (old?.msg) ctx.telegram.deleteMessage(id, old.msg).catch(() => {});
  sendFilm(ctx, f, p);
});

async function sendFilm(ctx, f, p) {
  const id = ctx.chat.id;
  if (userLast[id]?.msg) await ctx.telegram.deleteMessage(id, userLast[id].msg).catch(() => {});
  if (userLast[id]?.btn) await ctx.telegram.deleteMessage(id, userLast[id].btn).catch(() => {});

  const msgId = films[f]?.[p];
  if (!msgId) return ctx.reply("Kechirasiz, texnik nosozlik ❌");

  try {
    const sent = await ctx.telegram.copyMessage(id, CHANNEL, msgId);
    const parts = Object.keys(films[f]).filter(x => x !== p);
    const btns = parts.map(x => Markup.button.callback(x, `${f}_${x}`));
    const btnMsg = parts.length ? await ctx.reply("————— Qolgan — qismlar —————", Markup.inlineKeyboard([btns])) : null;

    userLast[id] = { msg: sent.message_id, btn: btnMsg?.message_id || null };
  } catch {
    await ctx.reply("Internet bilan aloqa uzildi ❌");
  }
}

bot.launch();