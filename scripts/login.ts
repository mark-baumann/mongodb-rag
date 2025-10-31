import { chromium, Page, Browser } from "playwright";
import dotenv from "dotenv";

dotenv.config();

export async function login(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: false }); // headless: true = unsichtbar
  const page = await browser.newPage();

  console.log("Oeffne Login-Seite ...");
  await page.goto("https://oc-digital.de", { waitUntil: "domcontentloaded" });

  const username = process.env.FOM_USERNAME ?? "";
  const password = process.env.FOM_PASSWORD ?? "";

  if (!username || !password) {
    throw new Error(
      "FOM_USERNAME oder FOM_PASSWORD nicht in .env gesetzt. Bitte in .env eintragen."
    );
  }

  await page.fill("#userNameInput", username);
  await page.fill("#passwordInput", password);
  await page.click("#submitButton");

  // Warte auf erfolgreiche Weiterleitung ins Portal
  await page.waitForLoadState("networkidle");
  console.log("Login erfolgreich oder Weiterleitung abgeschlossen.");

  return { browser, page };
}
