const { Markup } = require("telegraf");

const CHANNEL = "-1002556318549";
global.userLast = {};
global.waitOrder = {};

module.exports = async function handleBuyurtma(bot, ctx) {
  const userId = ctx.from.id;
  waitOrder[userId] = true;

  const msg = await ctx.telegram.copyMessage(userId, CHANNEL, 54, {
    caption:
      "𝗤𝗼'𝗹𝗹𝗮𝗻𝗺𝗮 𝘃𝗶𝗱𝗲𝗼𝘀𝗶❕\n\nTelegram kanal: @movely_studios \n\nYangi film nomini yozib qoldirishingiz mumkin!",
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("🔙 Ortga qaytish", "go_back")],
    ]).reply_markup,
  });

  userLast[userId] = { specialMsg: msg.message_id };
};
