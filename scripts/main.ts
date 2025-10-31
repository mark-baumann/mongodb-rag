import { login } from "./login.js";
import { getCourses } from "./courses.js";
import { downloadPdfs } from "./download_pdf.js";
import path from "path";
import axios from "axios";

async function main() {
  const { browser, page } = await login();

  try {
    const courseLinks = await getCourses(page);
    console.log(`\n📚 Insgesamt ${courseLinks.length} Kurse gefunden.`);

    for (const courseUrl of courseLinks) {
      const courseId = new URL(courseUrl).searchParams.get("id") || "unknown";
      const courseDir = path.join("downloads", courseId);

      // Get course name to use as folder name
      await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
      const courseName = await page.$eval('h1', el => el.textContent?.trim() ?? '');
      const folderName = `${courseName} (${courseId})`;

      console.log(`Creating folder: ${folderName}`);
      try {
        await axios.post('http://localhost:3000/api/create-folder', { folderName });
        console.log(`✅ Folder created: ${folderName}`);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(`❌ Error creating folder: ${folderName}`, error.response?.data);
        } else {
          console.error(`❌ Error creating folder: ${folderName}`, error);
        }
      }

      await downloadPdfs(page, courseUrl, courseDir, folderName);
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