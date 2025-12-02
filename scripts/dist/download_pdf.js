"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPdfs = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
/**
 * Lädt alle PDFs eines Kurses herunter und lädt sie in die RAG-Anwendung hoch.
 * @param page Playwright Page – sollte bereits eingeloggt sein.
 * @param courseUrl Moodle-Link des Kurses (z. B. https://lms.fom.de/course/view.php?id=34874)
 * @param outputDir Zielordner (z. B. "./downloads")
 * @param folderName Name des Ordners in der RAG-Anwendung
 */
async function downloadPdfs(page, courseUrl, outputDir, folderName) {
    var _a;
    console.log(`📘 Scanne Kurs: ${courseUrl}`);
    await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    // Alle Ressourcen-Links (PDF-Module)
    const resourceLinks = await page.$$eval('li.activity.resource.modtype_resource a.aalink', (els) => els.map((a) => a.href));
    console.log(`🔗 ${resourceLinks.length} Ressourcen gefunden.`);
    // Ausgabeordner vorbereiten
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    for (const link of resourceLinks) {
        try {
            console.log(`➡️  Öffne Ressource: ${link}`);
            await page.goto(link, { waitUntil: "domcontentloaded" });
            await page.waitForTimeout(2000);
            // Finde den echten PDF-Link (pluginfile.php…)
            const pdfLink = await page.evaluate(() => {
                var _a;
                const anchors = Array.from(document.querySelectorAll("a"));
                const match = anchors.find((a) => a.href.includes("pluginfile.php") && a.href.endsWith(".pdf"));
                return (_a = match === null || match === void 0 ? void 0 : match.href) !== null && _a !== void 0 ? _a : null;
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
            const filename = path_1.default.basename(new URL(pdfLink).pathname);
            const filePath = path_1.default.join(outputDir, filename);
            fs_1.default.writeFileSync(filePath, await pdfResponse.body());
            console.log(`✅ Gespeichert: ${filePath}`);
            // Upload to RAG
            console.log(`⬆️  Uploading to RAG: ${filePath}`);
            const form = new form_data_1.default();
            form.append('file', fs_1.default.createReadStream(filePath), filename);
            form.append('folderName', folderName);
            try {
                await axios_1.default.post('http://localhost:3000/api/upload', form, {
                    headers: Object.assign({}, form.getHeaders()),
                });
                console.log(`✅ Uploaded to RAG: ${filename}`);
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    console.error(`❌ Error uploading to RAG: ${filename}`, (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
                }
                else {
                    console.error(`❌ Error uploading to RAG: ${filename}`, error);
                }
            }
        }
        catch (error) {
            console.error(`❌ Fehler beim Verarbeiten von ${link}:`, error instanceof Error ? error.message : error);
            // Continue with next resource
            continue;
        }
    }
    console.log("🎉 Alle PDFs für diesen Kurs fertig.");
}
exports.downloadPdfs = downloadPdfs;
