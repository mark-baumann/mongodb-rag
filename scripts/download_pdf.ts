import fs from "fs";
import path from "path";
import { Page } from "playwright";
import axios from "axios";
import FormData from "form-data";

/**
 * Lädt alle PDFs eines Kurses herunter und lädt sie in die RAG-Anwendung hoch.
 * @param page Playwright Page – sollte bereits eingeloggt sein.
 * @param courseUrl Moodle-Link des Kurses (z. B. https://lms.fom.de/course/view.php?id=34874)
 * @param outputDir Zielordner (z. B. "./downloads")
 * @param folderName Name des Ordners in der RAG-Anwendung
 */
export async function downloadPdfs(page: Page, courseUrl: string, outputDir: string, folderName: string) {
  console.log(`📘 Scanne Kurs: ${courseUrl}`);

  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Alle Ressourcen-Links (PDF-Module)
  const resourceLinks = await page.$$eval(
    'li.activity.resource.modtype_resource a.aalink',
    (els) => els.map((a) => (a as HTMLAnchorElement).href)
  );

  console.log(`🔗 ${resourceLinks.length} Ressourcen gefunden.`);

  // Ausgabeordner vorbereiten
  fs.mkdirSync(outputDir, { recursive: true });

  for (const link of resourceLinks) {
    console.log(`➡️  Öffne Ressource: ${link}`);

    await page.goto(link, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Finde den echten PDF-Link (pluginfile.php…)
    const pdfLink = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a")) as HTMLAnchorElement[];
      const match = anchors.find((a) => a.href.includes("pluginfile.php") && a.href.endsWith(".pdf"));
      return match?.href ?? null;
    });

    if (!pdfLink) {
      console.log("⚠️  Kein PDF-Link gefunden, überspringe.");
      continue;
    }

    console.log(`⬇️  Lade herunter: ${pdfLink}`);

    // Datei herunterladen
    const pdfResponse = await page.request.get(pdfLink);
    if (!pdfResponse.ok()) {
      console.log(`❌ Fehler beim Laden von ${pdfLink}`);
      continue;
    }

    // Dateiname bestimmen
    const filename = path.basename(new URL(pdfLink).pathname);
    const filePath = path.join(outputDir, filename);

    fs.writeFileSync(filePath, await pdfResponse.body());
    console.log(`✅ Gespeichert: ${filePath}`);

    // Upload to RAG
    console.log(`⬆️  Uploading to RAG: ${filePath}`);
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), filename);
    form.append('folderName', folderName);

    try {
      await axios.post('http://localhost:3000/api/upload', form, {
        headers: {
          ...form.getHeaders(),
        },
      });
      console.log(`✅ Uploaded to RAG: ${filename}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ Error uploading to RAG: ${filename}`, error.response?.data);
      } else {
        console.error(`❌ Error uploading to RAG: ${filename}`, error);
      }
    }
  }

  console.log("🎉 Alle PDFs für diesen Kurs fertig.");
}