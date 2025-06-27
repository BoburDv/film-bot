const { Markup } = require("telegraf");

const mainKeyboard = Markup.keyboard([
  ["🎬 Buyurtma qilish", "🎁 Referal"],
]).resize();

module.exports = mainKeyboard;
