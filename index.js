const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/", async (req, res) => {
  try {

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto("https://example.com", {
      waitUntil: "networkidle2"
    });

    const title = await page.title();

    await browser.close();

    res.send("✅ Puppeteer Working\nPage Title: " + title);

  } catch (err) {
    res.send("❌ Error: " + err.message);
  }
});

app.listen(3000, () => console.log("Server running"));
