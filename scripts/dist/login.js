"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const playwright_1 = require("playwright");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function login() {
    var _a, _b;
    const browser = await playwright_1.chromium.launch({ headless: false }); // headless: true = unsichtbar
    const page = await browser.newPage();
    console.log("Oeffne Login-Seite ...");
    await page.goto("https://oc-digital.de", { waitUntil: "domcontentloaded" });
    const username = (_a = process.env.FOM_USERNAME) !== null && _a !== void 0 ? _a : "";
    const password = (_b = process.env.FOM_PASSWORD) !== null && _b !== void 0 ? _b : "";
    if (!username || !password) {
        throw new Error("FOM_USERNAME oder FOM_PASSWORD nicht in .env gesetzt. Bitte in .env eintragen.");
    }
    await page.fill("#userNameInput", username);
    await page.fill("#passwordInput", password);
    await page.click("#submitButton");
    // Warte auf erfolgreiche Weiterleitung ins Portal
    await page.waitForLoadState("networkidle");
    console.log("Login erfolgreich oder Weiterleitung abgeschlossen.");
    return { browser, page };
}
exports.login = login;
