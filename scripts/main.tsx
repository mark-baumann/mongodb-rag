import { login } from "login";
import { getCourses } from "courses";
import { downloadPdfs } from "download_pdf";
import path from "path";

async function main() {
  const { browser, page } = await login();

  try {
    const courseLinks = await getCourses(page);
    console.log(`\n📚 Insgesamt ${courseLinks.length} Kurse gefunden.`);

    for (const courseUrl of courseLinks) {
      const courseId = new URL(courseUrl).searchParams.get("id") || "unknown";
      const courseDir = path.join("downloads", courseId);
      await downloadPdfs(page, courseUrl, courseDir);
    }
  } catch (err) {
    console.error("❌ Fehler beim PDF-Download:", err);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fehler im main():", err);
  process.exit(1);
});
