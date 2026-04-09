const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

let browser;

// 🔥 Browser launch (same as yours)
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


// 🔥 MAIN TOKEN ROUTE
app.get("/token", async (req, res) => {
  let page;

  try {
    page = await browser.newPage();

    // =========================
    // 1. LOGIN
    // =========================
    await page.goto("https://lsg-land-owner.land.gov.bd/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.type('input[name="username"]', '1989182139');
    await page.type('input[name="password"]', 'Itxj@91588');

    await page.click('button[type="submit"]');

    await page.waitForTimeout(6000);


    // =========================
    // 2. SSO LOGIN
    // =========================
    await page.goto("https://dlrms.land.gov.bd/citizen/sso-login", {
      waitUntil: "networkidle2"
    });

    await page.waitForTimeout(6000);


    // =========================
    // 3. GET CODE
    // =========================
    const finalUrl = page.url();

    const match = finalUrl.match(/code=([^&]+)/);

    if (!match) {
      await page.close();
      return res.json({
        error: "Code not found",
        url: finalUrl
      });
    }

    const code = match[1];


    // =========================
    // 4. GET COOKIE (DLRMS TOKEN)
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
      code: code,
      dlrms_token: dlrmsCookie ? dlrmsCookie.value : null,
      user_token: jwtData.access_token || null
    });

  } catch (err) {
    console.error(err);

    if (page) await page.close();

    res.json({
      error: err.message
    });
  }
});


// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
