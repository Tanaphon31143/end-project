const missing = ["APP_URL", "RESEND_API_KEY", "PASSWORD_RESET_FROM"].filter((key) => !process.env[key]?.trim());
let invalidUrl = false;
if (process.env.APP_URL) {
  try {
    const url = new URL(process.env.APP_URL);
    invalidUrl = Boolean(url.username || url.password || url.search || url.hash) || !(url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
  } catch { invalidUrl = true; }
}
const invalidSender = Boolean(process.env.PASSWORD_RESET_FROM) && !/^[^\r\n]*[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(process.env.PASSWORD_RESET_FROM.trim());
console.log(JSON.stringify({ configured: !missing.length && !invalidUrl && !invalidSender, missing, invalidUrl, invalidSender }, null, 2));
process.exitCode = missing.length || invalidUrl || invalidSender ? 1 : 0;
