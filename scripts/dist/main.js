"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const login_js_1 = require("./login.js");
const courses_js_1 = require("./courses.js");
const download_pdf_js_1 = require("./download_pdf.js");
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
async function main() {
    var _a;
    const { browser, page } = await (0, login_js_1.login)();
    try {
        const courseLinks = await (0, courses_js_1.getCourses)(page);
        console.log(`\n📚 Insgesamt ${courseLinks.length} Kurse gefunden.`);
        for (const courseUrl of courseLinks) {
            const courseId = new URL(courseUrl).searchParams.get("id") || "unknown";
            const courseDir = path_1.default.join("downloads", courseId);
            // Get course name to use as folder name
            await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
            const courseName = await page.$eval('h1', el => { var _a, _b; return (_b = (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ''; });
            const folderName = `${courseName} (${courseId})`;
            console.log(`Creating folder: ${folderName}`);
            try {
                await axios_1.default.post('http://localhost:3000/api/create-folder', { folderName });
                console.log(`✅ Folder created: ${folderName}`);
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    console.error(`❌ Error creating folder: ${folderName}`, (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
                }
                else {
                    console.error(`❌ Error creating folder: ${folderName}`, error);
                }
            }
            await (0, download_pdf_js_1.downloadPdfs)(page, courseUrl, courseDir, folderName);
        }
    }
    catch (err) {
        console.error("❌ Fehler beim PDF-Download:", err);
    }
    finally {
        await browser.close();
    }
}
main().catch((err) => {
    console.error("Fehler im main():", err);
    process.exit(1);
});
