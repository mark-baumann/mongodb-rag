// login.ts
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: false }); // headless: true für unsichtbar
  const page = await browser.newPage();

  // Gehe auf die Login-Seite
  await page.goto("https://oc-digital.de", { waitUntil: "domcontentloaded" });

  // Login-Daten eintragen
  const username = "750718@fom-net.de";
  const password = "Mustang_<3";

  // Fülle das E-Mail-Feld
  await page.fill("#userNameInput", username);

  // Fülle das Passwort-Feld
  await page.fill("#passwordInput", password);

  // Klick auf den Anmeldebutton
  await page.click("#submitButton");

  // Warte auf Weiterleitung oder Erfolgsmeldung
  await page.waitForTimeout(5000); // ggf. anpassen

  console.log("Login-Versuch abgeschlossen.");

  // Optional: Browser offen lassen oder schließen
  // await browser.close();
}

main().catch((err) => {
  console.error("Fehler beim Login:", err);
  process.exit(1);
});
