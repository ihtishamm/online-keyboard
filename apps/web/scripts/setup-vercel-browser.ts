/**
 * Gets Vercel's build machine ready for make-cheatsheets.ts, which prints the PDFs in Chromium.
 * Vercel's build image (Amazon Linux 2023) has neither the browser nor the system libraries it
 * needs, and Playwright's `--with-deps` only knows apt. Does nothing anywhere else.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

/** What chrome-headless-shell links against and Amazon Linux 2023 doesn't ship by default. */
const LIBRARIES = [
  "alsa-lib",
  "at-spi2-atk",
  "at-spi2-core",
  "atk",
  "dbus-libs",
  // Chromium crashes on the first page without fontconfig.
  "fontconfig",
  // The sheets' web fonts lack some marks and symbols, which then come from the system: without
  // these they print as empty boxes (Arabic marks on the Urdu sheet, for one).
  "dejavu-sans-fonts",
  "google-noto-naskh-arabic-fonts",
  "google-noto-sans-arabic-fonts",
  "google-noto-sans-arabic-ui-fonts",
  "google-noto-sans-cjk-ttc-fonts",
  "google-noto-sans-fonts",
  "google-noto-sans-hebrew-fonts",
  "google-noto-sans-mongolian-fonts",
  "google-noto-sans-syriac-fonts",
  "liberation-sans-fonts",
  "libX11",
  "libXcomposite",
  "libXdamage",
  "libXext",
  "libXfixes",
  "libXrandr",
  "libxcb",
  "libxkbcommon",
  "mesa-libgbm",
  "nspr",
  "nss",
  "nss-util",
  "systemd-libs",
];

if (process.env.VERCEL && !process.env.SKIP_PDFS) {
  const WEB = join(dirname(new URL(import.meta.url).pathname), "..");
  // If dnf can't fetch its package index it reports every package as not found: try again.
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync("dnf", ["install", "-y", "-q", ...LIBRARIES], { stdio: "inherit" });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      execFileSync("sleep", ["15"]);
    }
  }
  execFileSync(join(WEB, "node_modules/.bin/playwright"), ["install", "chromium", "--only-shell"], {
    stdio: "inherit",
  });
}
