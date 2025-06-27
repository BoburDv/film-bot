const { Markup } = require("telegraf");

module.exports = async function handleReferal(bot, ctx) {
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
};
