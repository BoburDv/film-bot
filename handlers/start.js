const { Markup } = require("telegraf");
const { saveUserData, isCircularReferral } = require("./userData");

const ADMIN = 7676273635;

const mainKeyboard = Markup.keyboard([
  ["🎬 Buyurtma qilish", "🎁 Referal"],
]).resize();

module.exports = async function handleStart(bot, ctx) {
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
    `Salom ${name}, @${ctx.botInfo.username} ga xush kelibsiz! — Film ID raqamini yuboring. 🚀`,
    mainKeyboard
  );
  await ctx.telegram.sendMessage(ADMIN, `Yangi foydalanuvchi++ ${name}`);
};
