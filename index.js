const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

let browser;

// 🔥 Browser launch (once)
(async () => {
  browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/opt/render/project/.cache/chrome/linux-127.0.6533.88/chrome-linux64/chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });
  console.log("🚀 Browser launched once!");
})();

app.get("/", (req, res) => {
  res.send("Token API Running...");
});


// 🔥 TOKEN ROUTE
app.get("/token", async (req, res) => {
  let page;

  try {
    page = await browser.newPage();

    // =========================
    // 1. LOGIN (FIXED)
    // =========================
    await page.goto("https://lsg-land-owner.land.gov.bd/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.waitForSelector('input[name="username"]');

    await page.type('input[name="username"]', '1989182139', { delay: 50 });
    await page.type('input[name="password"]', 'Itxj@91588', { delay: 50 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    console.log("After login URL:", page.url());

    // =========================
    // 2. SSO LOGIN
    // =========================
    await page.goto("https://dlrms.land.gov.bd/citizen/sso-login", {
      waitUntil: "networkidle2"
    });

    // wait redirect (important)
    await new Promise(r => setTimeout(r, 6000));

    const finalUrl = page.url();
    console.log("Final URL:", finalUrl);

    // =========================
    // 3. GET CODE
    // =========================
    const match = finalUrl.match(/code=([^&]+)/);

    if (!match) {
      await page.close();
      return res.json({
        success: false,
        error: "Code not found",
        current_url: finalUrl
      });
    }

    const code = match[1];

    // =========================
    // 4. GET COOKIE
    // =========================
    const cookies = await page.cookies();

    const dlrmsCookie = cookies.find(c => c.name === "dlrms_app_token");

    // =========================
    // 5. JWT GENERATE
    // =========================
    const jwtData = await page.evaluate(async (code) => {
      const r = await fetch("https://dlrms.land.gov.bd/api/sso-authorize-code-grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code,
          isCitizen: true,
          redirect_uri: "https://dlrms.land.gov.bd/citizen-callback"
        })
      });

      return await r.json();
    }, code);

    await page.close();

    // =========================
    // 6. RESPONSE
    // =========================
    res.json({
      success: true,
      code: code,
      dlrms_token: dlrmsCookie ? dlrmsCookie.value : null,
      user_token: jwtData.access_token || null
    });

  } catch (err) {
    console.error("FULL ERROR:", err);

    if (page) await page.close();

    res.json({
      success: false,
      error: err.message
    });
  }
});


// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
