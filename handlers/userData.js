const fs = require("fs");
const DATA_PATH = "./referal.json";

function loadUserData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      global.userData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    } else userData = {};
  } catch {
    userData = {};
  }
}

function saveUserData() {
  const compact = {};
  for (const id in userData) {
    const { balance = 0, referrals = 0, referredBy = null } = userData[id];
    compact[id] = { balance, referrals, referredBy };
  }
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(compact, null, 2));
  } catch {}
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

module.exports = {
  loadUserData,
  saveUserData,
  isCircularReferral,
};
