const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/token", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto("https://lsg-land-owner.land.gov.bd/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    await page.type('input[name="username"]', '1989182139');
    await page.type('input[name="password"]', 'Itxj@91588');

    await page.click('button[type="submit"]');

    await page.waitForTimeout(6000);

    await page.goto("https://dlrms.land.gov.bd/citizen/sso-login", {
      waitUntil: "networkidle2"
    });

    await page.waitForTimeout(6000);

    const finalUrl = page.url();

    const match = finalUrl.match(/code=([^&]+)/);

    if (!match) {
      await browser.close();
      return res.json({ error: "Code not found" });
    }

    const code = match[1];

    const cookies = await page.cookies();
    const dlrms = cookies.find(c => c.name === "dlrms_app_token");

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

    await browser.close();

    res.json({
      dlrms_token: dlrms ? dlrms.value : null,
      user_token: jwtData.access_token || null
    });

  } catch (e) {
    res.json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Server running"));
