const { Markup } = require("telegraf");
const { saveUserData, isCircularReferral } = require("./userData");

const ADMIN = 7676273635;
const CHANNEL_ID = "@movely_studios";

const mainKeyboard = Markup.keyboard([
  ["🎬 Buyurtma qilish", "🎁 Referal"],
]).resize();

module.exports = async function handleStart(bot, ctx) {
  const name = ctx.from.first_name || "Foydalanuvchi";
  const userId = String(ctx.from.id);
  const refId = ctx.startPayload || "";

  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    if (["left", "kicked"].includes(member.status)) {
      await ctx.reply(
        "Iltimos, kanalga obuna bo'ling.👇",
        Markup.inlineKeyboard([
          Markup.button.url("Obuna bo'lish", "https://t.me/movely_studios"),
        ])
      );

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const m = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
          if (!["left", "kicked"].includes(m.status)) {
            clearInterval(interval);

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
                userData[refId] = {
                  balance: 0,
                  referrals: 0,
                  referredBy: null,
                };
              }

              userData[refId].referrals += 1;
              userData[refId].balance += 1000;

              try {
                await ctx.telegram.sendMessage(
                  refId,
                  `🎉 Takliflar soni: ${userData[refId].referrals}`
                );
              } catch {}

              saveUserData();
            }

            await ctx.reply(
              `Salom ${name}, @${ctx.botInfo.username} ga xush kelibsiz! — Film ID raqamini yuboring. 🚀`,
              mainKeyboard
            );
            await ctx.telegram.sendMessage(
              ADMIN,
              `Yangi foydalanuvchi++ ${name}`
            );
          }
        } catch {}
        if (attempts >= 10) clearInterval(interval);
      }, 2000);

      return;
    }
  } catch (err) {
    await ctx.reply(
      "Iltimos, kanalga obuna bo'ling.👇",
      Markup.inlineKeyboard([
        Markup.button.url("Obuna bo'lish", "https://t.me/movely_studios"),
      ])
    );
    return;
  }

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
        `🎉 Takliflar soni: ${userData[refId].referrals}`
      );
    } catch {}

    saveUserData();
  }

  await ctx.reply(
    `Salom ${name}, @${ctx.botInfo.username} ga xush kelibsiz! — Film ID raqamini yuboring. 🚀`,
    mainKeyboard
  );
  await ctx.telegram.sendMessage(ADMIN, `Yangi foydalanuvchi++ ${name}`);
};
