require("dotenv").config();
const fs = require("fs");
const { Telegraf, Markup } = require("telegraf");
const films = require("./data-movie");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN = 7676273635,
  CHANNEL = "-1002556318549";

const userLast = {},
  waitOrder = {},
  orderTime = {};

const DATA_PATH = "./referal.json";

let userData = {};

function loadUserData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      userData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    }
  } catch {
    userData = {};
  }
}

function saveUserData() {
  const compactData = {};
  for (const id in userData) {
    const { balance = 0, referrals = 0, referredBy = null } = userData[id];
    compactData[id] = { balance, referrals, referredBy };
  }
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(compactData, null, 2));
  } catch (e) {
    console.error("❌ JSON saqlashda xatolik:", e.message);
  }
}

function isCircularReferral(newId, refId) {
  let cur = refId;
  while (cur) {
    if (cur === String(newId)) return true;
    const u = userData[cur];
    cur = u ? u.referredBy : null;
  }
  return false;
}

loadUserData();

const mainKeyboard = Markup.keyboard([
  ["🎬 Buyurtma qilish", "🎁 Referal"],
]).resize();

bot.start(async (ctx) => {
  const name = ctx.from.first_name || "Foydalanuvchi";
  const userId = String(ctx.from.id);
  const refId = ctx.startPayload || "";

  if (!userData[userId]) {
    userData[userId] = { balance: 0, referrals: 0, referredBy: null };
  }

  if (
    refId &&
    refId !== userId &&
    /^[0-9]+$/.test(refId) &&
    !userData[userId].referredBy &&
    !isCircularReferral(userId, refId)
  ) {
    userData[userId].referredBy = refId;

    if (!userData[refId]) {
      userData[refId] = { balance: 0, referrals: 0, referredBy: null };
    }

    userData[refId].referrals += 1;
    userData[refId].balance += 1000;

    try {
      await ctx.telegram.sendMessage(
        refId,
        `🎉 Sizga yangi referal qo‘shildi! Hozirgi takliflar soni: ${userData[refId].referrals}`
      );
    } catch {}

    saveUserData();
  }

  await ctx.reply(
    `Salom ${name}, @${ctx.botInfo.username} ga xush kelibsiz! — Film ID sini yuboring. 🚀`,
    mainKeyboard
  );
  await ctx.telegram.sendMessage(ADMIN, `Yangi foydalanuvchi++ ${name}`);
});

bot.hears("🎁 Referal", async (ctx) => {
  const userId = String(ctx.from.id);

  if (!userData[userId]) {
    userData[userId] = { balance: 0, referrals: 0, referredBy: null };
  }

  const balance = userData[userId].balance;
  const referrals = userData[userId].referrals;
  const link = `t.me/${ctx.botInfo.username}?start=${userId}`;

  await ctx.reply(
    `👤 Sizning referal havolangiz:\n${link}\n\n💰 Balansingiz: ${balance}\n🤝 Takliflar soni: ${referrals}\n\n𝗫𝗮𝗹𝗶 𝘀𝗶𝗻𝗼𝘃 𝗿𝗲𝗷𝗶𝗺𝗶𝗱𝗮!`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🚀 Ulashish",
          `https://t.me/share/url?url=${encodeURIComponent(
            link
          )}&text=${encodeURIComponent("👋 Salom! Bu mening referal linkim:")}`
        ),
      ],
    ])
  );
});

bot.action("go_back_main", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("Bosh menyuga qaytdingiz ✅", mainKeyboard);
});

bot.hears("🎬 Buyurtma qilish", async (ctx) => {
  const userId = ctx.from.id;
  waitOrder[userId] = true;

  const msg = await ctx.replyWithVideo(
    { source: "./qollanma.mp4" },
    {
      caption:
        "𝗤𝗼'𝗹𝗹𝗮𝗻𝗺𝗮 𝘃𝗶𝗱𝗲𝗼𝘀𝗶❕\n\nTelegram kanal: @movely_studios \n\nYangi film nomini yozib qoldirishingiz mumkin!",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Ortga qaytish", "go_back")],
      ]).reply_markup,
    }
  );

  userLast[userId] = { specialMsg: msg.message_id };
});

bot.on("text", async (ctx) => {
  const id = ctx.from.id,
    text = ctx.message.text.trim();

  if (waitOrder[id]) {
    waitOrder[id] = false;
    orderTime[id] = Date.now();

    const user = ctx.from.username
      ? `@${ctx.from.username}`
      : `${ctx.from.first_name} (${ctx.from.id})`;

    if (userLast[id]?.specialMsg) {
      await ctx.telegram
        .editMessageReplyMarkup(id, userLast[id].specialMsg, null, null)
        .catch(() => {});
      delete userLast[id].specialMsg;
    }

    // Optional: xabar yuborilmoqda (⏳ yo‘q)
    await ctx.reply("Buyurtma yuborilmoqda...", {
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
  const id = ctx.from.id;
  delete waitOrder[id];
  if (userLast[id]?.specialMsg) {
    await ctx.telegram
      .deleteMessage(id, userLast[id].specialMsg)
      .catch(() => {});
    delete userLast[id].specialMsg;
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

    // Faqat ko'p qismli bo‘lsa tugma chiqaramiz
    const reply_markup =
      parts.length > 1 ? generateButtons(f, parts, page, p) : undefined;

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

function generateButtons(f, parts, page = 1, current = null) {
  const total = parts.length;
  if (total <= 1) return undefined;

  if (current) {
    const currentIndex = parts.indexOf(String(current));
    const buttons = [];

    // Oldingi va keyingi qismlar
    const prev = parts[currentIndex - 1];
    const next = parts[currentIndex + 1];

    if (prev)
      buttons.push(Markup.button.callback(`${prev}-qism`, `${f}_${prev}`));
    if (next)
      buttons.push(Markup.button.callback(`${next}-qism`, `${f}_${next}`));

    // Agar faqat bitta tugma chiqayotgan bo‘lsa → qo‘shni keyingi yoki oldingidan yana bitta qo‘shamiz
    if (buttons.length === 1) {
      const prev2 = parts[currentIndex - 2];
      const next2 = parts[currentIndex + 2];

      if (!prev && next2) {
        buttons.push(Markup.button.callback(`${next2}-qism`, `${f}_${next2}`));
      } else if (!next && prev2) {
        buttons.unshift(
          Markup.button.callback(`${prev2}-qism`, `${f}_${prev2}`)
        );
      }
    }

    return Markup.inlineKeyboard([buttons]).reply_markup;
  }

  // Menyudan ko‘rayotgandagi eski paginatsiya
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
