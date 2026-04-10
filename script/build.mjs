import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const allowlist = [
  "@google/generative-ai","axios","cors","date-fns","drizzle-orm","drizzle-zod",
  "express","express-rate-limit","express-session","jsonwebtoken","memorystore",
  "multer","nanoid","nodemailer","openai","passport","passport-local","stripe",
  "uuid","ws","xlsx","zod","zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  // Copy static landing pages into the dist/public directory
  const landingPages = [
    { src: "public/rei/index.html", dest: "dist/public/rei/index.html" },
  ];
  for (const { src, dest } of landingPages) {
    if (existsSync(src)) {
      await mkdir(dest.replace("/index.html", ""), { recursive: true });
      await copyFile(src, dest);
      console.log(`copied landing page: ${src} → ${dest}`);
    }
  }

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => { console.error(err); process.exit(1); });
