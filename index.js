const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json({ limit: "10mb" }));

let browser;

// 🔥 1. Server start এ একবারই browser launch
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
  res.send("Fast Puppeteer API Running...");
});


// 🔥 2. HTML → PDF (আগের মতোই)
app.post("/pdf", async (req, res) => {
  let page;

  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).send("HTML required");
    }

    page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded"
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await page.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdf.length,
    });

    res.send(pdf);

  } catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).send("Error generating PDF");
  }
});


// 🔥 3. NEW: URL → PDF
app.post("/pdf-url", async (req, res) => {
  let page;

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).send("URL required");
    }

    page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded"
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await page.close();

    res.set({
      "Content-Type": "application/pdf",
    });

    res.send(pdf);

  } catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).send("Error generating PDF");
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
