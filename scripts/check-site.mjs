#!/usr/bin/env node
/**
 * Dependency-free integrity check for the static site.
 *
 * Verifies, for every .html file in the repository:
 *   - internal href/src targets exist on disk (root-absolute and relative);
 *   - in-page #anchors point to existing, unique ids;
 *   - required SEO tags (title, description, canonical, og:image) are present;
 *   - every URL in sitemap.xml maps to an existing page.
 * Exits with code 1 on any violation.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://nuiix.github.io";
const IGNORED_DIRS = new Set([".git", "node_modules", ".github", "assets"]);
const errors = [];

/** @param {string} dir @returns {string[]} absolute paths of all .html files */
function collectHtml(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return IGNORED_DIRS.has(name) ? [] : collectHtml(full);
    return name.endsWith(".html") ? [full] : [];
  });
}

/** Map a URL path (e.g. "/en/") to a file on disk, or null when missing. */
function urlPathToFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  const target = join(ROOT, clean);
  if (existsSync(target) && statSync(target).isFile()) return target;
  const index = join(target, "index.html");
  return existsSync(index) ? index : null;
}

const isExternal = (url) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);

for (const file of collectHtml(ROOT)) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const html = readFileSync(file, "utf8");
  const pageUrlPath = "/" + rel.replace(/index\.html$/, "");

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  ids.forEach((id) => {
    if (seen.has(id)) errors.push(`${rel}: duplicate id "${id}"`);
    seen.add(id);
  });

  for (const [, attr, value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    if (!value || isExternal(value)) continue;
    if (value.startsWith("#")) {
      if (!seen.has(value.slice(1))) errors.push(`${rel}: broken anchor ${value}`);
      continue;
    }
    const absolutePath = value.startsWith("/") ? value : new URL(value, `${ORIGIN}${pageUrlPath}`).pathname;
    if (!urlPathToFile(absolutePath)) errors.push(`${rel}: ${attr}="${value}" does not resolve to a file`);
  }

  if (rel === "404.html") continue;
  const required = [
    [/<title>[^<]+<\/title>/, "<title>"],
    [/<meta name="description" content="[^"]{50,}"/, "meta description (>=50 chars)"],
    [/<link rel="canonical" href="https:\/\/nuiix\.github\.io\/[^"]*"/, "canonical link"],
    [/<meta property="og:image" content="https:\/\/nuiix\.github\.io\/[^"]+"/, "og:image"],
    [/<html lang="[a-z]{2}(-[A-Za-z0-9]+)?"/i, "html lang"],
    [/<h1[\s>]/, "h1"],
  ];
  for (const [pattern, label] of required) {
    if (!pattern.test(html)) errors.push(`${rel}: missing ${label}`);
  }

  // Absolute meta URLs are not covered by the href/src scan: verify og:image exists on disk.
  const og = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (og && og[1].startsWith(ORIGIN) && !urlPathToFile(new URL(og[1]).pathname)) {
    errors.push(`${rel}: og:image ${og[1]} does not exist on disk`);
  }
}

const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  if (!loc.startsWith(ORIGIN)) errors.push(`sitemap.xml: foreign origin ${loc}`);
  else if (!urlPathToFile(new URL(loc).pathname)) errors.push(`sitemap.xml: ${loc} has no page`);
}

if (errors.length > 0) {
  console.error(`Site check failed (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
console.log("Site check passed.");
