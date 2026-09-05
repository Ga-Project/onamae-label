// 書き出した out/ そのものを検査する（依存追加なし・build の直後に走らせる）。
//
// ユニットテストは純関数しか固定できず、**配線が切れたこと**を検出できない。
// layout が siteUrl() を呼ばなくなる／metadataBase を消す／og.png を失う——
// どれもテストは緑のまま通り、ライブのリンクプレビューと検索の自己申告だけが
// 静かに壊れる。ここでは実際に配信されるファイルを見るので、書き方に関係なく
// 結果だけで判定できる。
//
// 実行: pnpm verify:out（先に build が必要）。期待値は package.json の name から
//       導くので env は要らない。ルート直下配信の out/ を検査するときだけ
//       ALLOW_ROOT_BASE_PATH=1 を付ける。
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { siteUrl, ogImageUrl } from "../app/lib/site.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

if (!existsSync(join(OUT, "index.html"))) {
  console.error("out/index.html がありません。先に `pnpm build` を実行してください。");
  process.exit(1);
}

// 期待値は package.json の name から導く。env から導くと、ビルドに渡した env が
// 間違っていても検査が同じ値を期待してしまい、両方そろって間違ったまま緑になる
// （誤ったスラッグでのビルドが実際に素通りしていた）。
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const base =
  process.env.ALLOW_ROOT_BASE_PATH === "1" ? "" : `/${pkg.name}`;
const SITE = siteUrl(base);
const OG = ogImageUrl(base);
const html = readFileSync(join(OUT, "index.html"), "utf8");

// 1. 絶対 URL が basePath 込みで出ているか（落ちてもビルドは成功してしまう）
check(html.includes(`<link rel="canonical" href="${SITE}"`), `canonical が ${SITE} でない`);
check(html.includes(`content="${SITE}"`), `og:url が ${SITE} でない`);
check(html.includes(`content="${OG}"`), `og:image が ${OG} でない`);
check(html.includes('content="summary_large_image"'), "twitter:card が summary_large_image でない");

// 2. 構造化データが実際に載っているか
check(html.includes("application/ld+json"), "JSON-LD が出力されていない");
check(html.includes('"@type":"WebApplication"'), "JSON-LD の @type が WebApplication でない");
check(html.includes(`"image":"${OG}"`), "JSON-LD の image が basePath 込みの絶対 URL でない");

// 3. 計測タグの存続（メタデータを触るたびに巻き込みで消えうる）
check(
  html.includes('data-goatcounter="https://ga-project.goatcounter.com/count"'),
  "GoatCounter タグが消えている",
);

// 4. sitemap がファイルとして出ているか（ディレクトリ化していないか）
const smPath = join(OUT, "sitemap.xml");
check(existsSync(smPath), "out/sitemap.xml が無い");
if (existsSync(smPath)) {
  const sm = readFileSync(smPath, "utf8");
  check(sm.includes(`<loc>${SITE}</loc>`), `sitemap の loc が ${SITE} でない`);
}

// 5. OGP 画像が実体として配信されるか。参照だけあって実体が無いと、
//    リンクプレビューは画像なしに退化するがビルドは緑のまま。
const png = join(OUT, "og.png");
check(existsSync(png), "out/og.png が無い（og:image の参照先が 404 になる）");
if (existsSync(png)) {
  const buf = readFileSync(png);
  // PNG の IHDR: 先頭8byte がシグネチャ、16byte 目から幅・高さが big-endian uint32
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  check(w === 1200 && h === 630, `og.png の寸法が ${w}x${h}（期待 1200x630）`);
}

if (failures.length) {
  console.error("out/ の検査に失敗しました:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`out/ の検査に合格しました（配信URL: ${SITE}）`);
