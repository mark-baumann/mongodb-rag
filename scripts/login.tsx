import { chromium, Page, Browser } from "playwright";

export async function login(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: false }); // headless: true = unsichtbar
  const page = await browser.newPage();

  console.log("🔐 Öffne Login-Seite ...");
  await page.goto("https://oc-digital.de", { waitUntil: "domcontentloaded" });

  const username = "";
  const password = "";

  await page.fill("#userNameInput", username);
  await page.fill("#passwordInput", password);
  await page.click("#submitButton");

  // Warte auf erfolgreiche Weiterleitung ins Portal
  await page.waitForLoadState("networkidle");
  console.log("✅ Login erfolgreich oder Weiterleitung abgeschlossen.");

  return { browser, page };
}
