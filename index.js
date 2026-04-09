const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

let browser;

(async () => {
  browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/opt/render/project/.cache/chrome/linux-127.0.6533.88/chrome-linux64/chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  console.log("🚀 Browser ready");
})();

app.get("/token", async (req, res) => {
  let page;

  try {
    page = await browser.newPage();

    // stealth
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false
      });
    });

    // LOGIN
    await page.goto("https://lsg-land-owner.land.gov.bd/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.type('input[name="username"]', '1989182139', { delay: 30 });
    await page.type('input[name="password"]', 'Itxj@91588', { delay: 30 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // SSO
    await page.goto("https://dlrms.land.gov.bd/citizen/sso-login", {
      waitUntil: "networkidle2"
    });

    await new Promise(r => setTimeout(r, 6000));

    // cookie
    const cookies = await page.cookies();
    const dlrms = cookies.find(c => c.name === "dlrms_app_token");

    // JWT extract (real trick)
    const jwt = await page.evaluate(async () => {
      const r = await fetch(
        "https://gateway.dlrms.land.gov.bd/core-api/api/citizens/auth/profile?is_fetch_from_sso=1"
      );
      return await r.json();
    });

    await page.close();

    res.json({
      success: true,
      dlrms_token: dlrms ? dlrms.value : null,
      user_token: jwt?.token || null,
      time: Date.now()
    });

  } catch (e) {
    if (page) await page.close();

    res.json({
      success: false,
      error: e.message
    });
  }
});

app.listen(10000, () => console.log("Server running"));
