import crypto from "crypto";

export default function generateApiKey() {
  const random = crypto.randomBytes(32).toString("hex");
  return `gw_live_${random}`;
}
