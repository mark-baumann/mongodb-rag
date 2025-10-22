import { Page } from "playwright";

/**
 * Extrahiert alle Kurs-Links mit semester="2025-WS"
 */
export async function getCourses(page: Page): Promise<string[]> {
  console.log("📖 Extrahiere Kurs-Links ...");

  // Gehe zur Seite, auf der die Kurse angezeigt werden
  await page.goto("https://oc-digital.de/", { waitUntil: "domcontentloaded" });

  // Warte, bis alle Kurskarten geladen sind
  await page.waitForSelector('div.course-card[semester="2025-WS"]', { timeout: 15000 });

  // Extrahiere alle hrefs hinter "semester=2025-WS"
  const links = await page.$$eval(
    'div.course-card[semester="2025-WS"] a.header-link-moodle',
    (elements) => elements.map((el) => (el as HTMLAnchorElement).href)
  );

  console.log(`📎 ${links.length} Kurs-Links gefunden:`);
  links.forEach((link) => console.log("  →", link));

  return links;
}
