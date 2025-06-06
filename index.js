require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const films = require("./data-movie");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN = 7676273635,
  CHANNEL = "-1002556318549";
const userLast = {},
  waitOrder = {},
  orderTime = {};

const mainKeyboard = Markup.keyboard([
  ["🎬 Buyurtma qilish", "🎁 Referal"],
]).resize();

bot.start(async (ctx) => {
  const name = ctx.from.first_name || "Foydalanuvchi";
  await ctx.reply(
    `Salom ${name}, @movely_bot ga xush kelibsiz! — Film ID sini yuboring. 🚀`,
    mainKeyboard
  );
  await ctx.telegram.sendMessage(ADMIN, `Yangi foydalanuvchi++ ${name}`);
});

bot.hears("🎁 Referal", (ctx) => ctx.reply("🔥Tez kunda..."));

bot.hears("🎬 Buyurtma qilish", async (ctx) => {
  waitOrder[ctx.from.id] = true;
  const msg = await ctx.reply(
    "❕𝗜𝗹𝘁𝗶𝗺𝗼𝘀, 𝗮𝘃𝘃𝗮𝗹 𝘀𝗶𝘇 𝗶𝘇𝗹𝗮𝗴𝗮𝗻 𝗳𝗶𝗹𝗺 𝗯𝗶𝘇𝗱𝗮 𝗯𝗼𝗿 𝘆𝗼𝗸𝗶 𝘆𝗼'𝗾𝗹𝗶𝗴𝗶𝗻𝗶 𝘁𝗲𝗸𝘀𝗵𝗶𝗿𝗶𝗻𝗴. \n\n📝 Yangi film nomini yozib qoldirishingiz mumkin!",
    Markup.inlineKeyboard([
      [Markup.button.callback("🔙 Ortga qaytish", "go_back")],
    ])
  );
  userLast[ctx.from.id] = { specialMsg: msg.message_id };
});

bot.on("text", async (ctx) => {
  const id = ctx.from.id,
    text = ctx.message.text.trim();

  if (waitOrder[id]) {
    waitOrder[id] = false;
    orderTime[id] = Date.now();

    const user = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name;

    if (userLast[id]?.specialMsg) {
      await ctx.telegram
        .editMessageReplyMarkup(id, userLast[id].specialMsg, null, null)
        .catch(() => {});
      delete userLast[id].specialMsg;
    }

    await ctx.reply("⏳", {
      reply_markup: { remove_keyboard: true },
    });

    await ctx.telegram.sendMessage(
      ADMIN,
      `📥 Buyurtma: ${text}\n\n👤 User: ${user}`
    );

    await ctx.reply(
      "Buyurtma qabul qilindi ✅",
      Markup.inlineKeyboard([
        [Markup.button.callback("❌ Bekor qilish", "cancel_order")],
      ])
    );

    return;
  }

  if (!/^\d+$/.test(text))
    return ctx.reply("Faqat film ID raqamini kiriting ❗️");

  const old = userLast[id] || {};
  if (old.msg) ctx.telegram.deleteMessage(id, old.msg).catch(() => {});
  userLast[id] = {};

  let found;
  outer: for (const f in films) {
    for (const p in films[f]) {
      if (films[f][p] === +text) {
        found = { f, p };
        break outer;
      }
    }
  }
  if (found) return sendFilm(ctx, found.f, found.p);

  try {
    const sent = await ctx.telegram.copyMessage(id, CHANNEL, +text);
    userLast[id].msg = sent.message_id;
  } catch {
    await ctx.reply("Film topilmadi ❌");
  }
});

bot.action("cancel_order", async (ctx) => {
  delete waitOrder[ctx.from.id];
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply("Buyurtma bekor qilindi ✅", mainKeyboard);
  await ctx.answerCbQuery();
});

bot.action("go_back", async (ctx) => {
  delete waitOrder[ctx.from.id];
  if (userLast[ctx.from.id]?.specialMsg) {
    await ctx.telegram
      .deleteMessage(ctx.from.id, userLast[ctx.from.id].specialMsg)
      .catch(() => {});
    delete userLast[ctx.from.id].specialMsg;
  }
  await ctx.answerCbQuery();
  await ctx.reply("Bosh menuga qaytdingiz ✅", mainKeyboard);
});

bot.action(/nav_(.+)_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const [_, f, page] = ctx.match;
  const id = ctx.from.id;

  const parts = Object.keys(films[f]);
  const reply_markup = generateButtons(f, parts, +page);

  if (userLast[id]?.msg) {
    await ctx.telegram
      .editMessageReplyMarkup(id, userLast[id].msg, null, reply_markup)
      .catch(() => {});
  }
});

bot.action(/(.+)_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const [_, f, p] = ctx.match;
  const id = ctx.from.id;

  if (userLast[id]?.msg)
    await ctx.telegram.deleteMessage(id, userLast[id].msg).catch(() => {});

  sendFilm(ctx, f, p);
});

async function sendFilm(ctx, f, p, page = 1) {
  const id = ctx.chat.id;
  const msgId = films[f]?.[p];
  if (!msgId) return ctx.reply("Kechirasiz, texnik nosozlik ❌");

  try {
    const parts = Object.keys(films[f]);
    const reply_markup = generateButtons(f, parts, page, p);

    const isPartButton = /^\w+_\d+$/.test(ctx.callbackQuery?.data || "");
    if (isPartButton && userLast[id]?.msg) {
      await ctx.telegram.deleteMessage(id, userLast[id].msg).catch(() => {});
    }

    const sent = await ctx.telegram.copyMessage(id, CHANNEL, msgId, {
      reply_markup,
    });

    userLast[id] = { msg: sent.message_id };
  } catch {
    await ctx.reply("Filmni yuborishda xatolik yuz berdi ❌");
  }
}

function generateButtons(f, parts, page = 1) {
  const total = parts.length;
  const perPage = page === 1 || page === Math.ceil(total / 2) ? 3 : 2;

  const startIndex = page === 1 ? 0 : (page - 2) * 2 + 3;
  const endIndex = Math.min(startIndex + perPage, total);
  const sliced = parts.slice(startIndex, endIndex);

  const row = sliced.map((x) =>
    Markup.button.callback(`${x}-qism`, `${f}_${x}`)
  );

  const nav = [];
  if (page > 1) nav.push(Markup.button.callback("◀️", `nav_${f}_${page - 1}`));
  if (endIndex < total)
    nav.push(Markup.button.callback("▶️", `nav_${f}_${page + 1}`));

  const finalRow =
    nav.length === 2
      ? [nav[0], ...row, nav[1]]
      : nav.length === 1
      ? page === 1
        ? [...row, nav[0]]
        : [nav[0], ...row]
      : row;

  return Markup.inlineKeyboard([finalRow]).reply_markup;
}

bot.launch();
