// 静かに壊れる種類の失敗を、ビルド無しで捕まえるガード。
//
// out/ を見る検査は scripts/verify-out.mjs（build の後に走る）にある。
// ここには **ビルドしなくても判定できるもの** だけを置く。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("og.png が存在し 1200x630 である", () => {
  const p = join(ROOT, "public/og.png");
  assert.ok(existsSync(p), "public/og.png がありません（og:image の参照先が 404 になります）");
  const buf = readFileSync(p);
  assert.equal(buf.subarray(1, 4).toString("ascii"), "PNG", "PNG ではありません");
  // IHDR: 16byte 目から幅・高さが big-endian uint32
  assert.equal(buf.readUInt32BE(16), 1200, "幅が 1200 ではありません");
  assert.equal(buf.readUInt32BE(20), 630, "高さが 630 ではありません");
  // 白紙・ほぼ単色だと極端に小さくなる
  assert.ok(buf.length > 50000, `ファイルが小さすぎます（${buf.length} bytes・白紙の可能性）`);
});

test("og-card.html を直したのに書き出しを忘れていない", () => {
  // 版下だけ直して ./scripts/og-card.sh を流し忘れると、**古い PNG が公開され続ける**。
  // 画像の中身は macOS のフォントに依存し CI で再生成できないので、版下のハッシュで代替する。
  const html = readFileSync(join(ROOT, "scripts/og-card.html"));
  const recorded = readFileSync(join(ROOT, "scripts/og-card.html.sha256"), "utf8").trim();
  const actual = createHash("sha256").update(html).digest("hex");
  assert.equal(
    actual,
    recorded,
    "scripts/og-card.html が変更されていますが public/og.png が書き出されていません。./scripts/og-card.sh を実行してください。",
  );
});

/** ガードを直接起動して終了コードを見る（build 全体を回さずに判定できる）。 */
function runGuard(env) {
  return spawnSync(process.execPath, [join(ROOT, "scripts/check-base-path.mjs")], {
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "", ALLOW_ROOT_BASE_PATH: "", ...env },
    encoding: "utf8",
  });
}

test("basePath ガードは未設定・誤スラッグを弾き、正しい値とルート宣言だけを通す", () => {
  const slug = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).name;

  // 正しいスラッグ: 通る
  assert.equal(runGuard({ NEXT_PUBLIC_BASE_PATH: `/${slug}` }).status, 0);
  // 未設定: 落ちる
  assert.equal(runGuard({}).status, 1);
  // **誤ったスラッグ: 落ちる**。env から期待値を導くと、間違った env に検査が
  // 合わせてしまい素通りする（実際に素通りしていた）。期待値は package.json の
  // name から導く。このビルド設定は他のリポジトリへ複製されることがあり、
  // 複製先でスラッグを直し忘れる経路が最も現実的な発火点になる。
  const wrong = runGuard({ NEXT_PUBLIC_BASE_PATH: "/wrong-slug" });
  assert.equal(wrong.status, 1);
  assert.match(wrong.stderr, /一致しません/);
  // ルート配信の明示: 通る
  assert.equal(runGuard({ ALLOW_ROOT_BASE_PATH: "1" }).status, 0);
  // 意図が矛盾している（ルート宣言とサブパス指定の同時指定）: 落ちる
  assert.equal(
    runGuard({ ALLOW_ROOT_BASE_PATH: "1", NEXT_PUBLIC_BASE_PATH: `/${slug}` }).status,
    1,
  );
});

test("build スクリプトが basePath ガードを前段に持つ", () => {
  // basePath を落とした out/ は exit 0 で出来上がり、誰も気づかないまま
  // 別 URL 空間を canonical に据える。ガードを外したら気づけるようにしておく。
  //
  // ガードは next.config.mjs には置けない。`next lint` も `next build` と同じ
  // phase-production-build で設定を読むため、lint まで巻き添えで落ちる（実測）。
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.match(pkg.scripts.build, /check-base-path\.mjs/);
  assert.ok(existsSync(join(ROOT, "scripts/check-base-path.mjs")));
});

/**
 * verify-out.mjs を隔離した一時ツリーで起動する。
 *
 * スクリプトは自分の位置（import.meta.url）から ROOT を決めるので、
 * 一時ディレクトリに最小の製品ツリーを組み立ててそこへ置く。
 * env は一切渡さない ＝ 期待値が env から独立していることを直接固定する。
 */
function runVerifyOut({ basePath }) {
  const root = mkdtempSync(join(tmpdir(), "onamae-verify-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "app/lib"), { recursive: true });
  mkdirSync(join(root, "out"));
  for (const rel of ["package.json", "scripts/verify-out.mjs", "app/lib/site.ts"]) {
    copyFileSync(join(ROOT, rel), join(root, rel));
  }
  copyFileSync(join(ROOT, "public/og.png"), join(root, "out/og.png"));

  const site = `https://ga-project.github.io${basePath}/`;
  const og = `${site}og.png`;
  writeFileSync(
    join(root, "out/index.html"),
    `<link rel="canonical" href="${site}"/>` +
      `<meta property="og:url" content="${site}"/>` +
      `<meta property="og:image" content="${og}"/>` +
      `<meta name="twitter:card" content="summary_large_image"/>` +
      `<script type="application/ld+json">{"@type":"WebApplication","image":"${og}"}</script>` +
      `<script data-goatcounter="https://ga-project.goatcounter.com/count"></script>`,
  );
  writeFileSync(
    join(root, "out/sitemap.xml"),
    `<urlset><url><loc>${site}</loc></url></urlset>`,
  );

  return spawnSync(process.execPath, [join(root, "scripts/verify-out.mjs")], {
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "", ALLOW_ROOT_BASE_PATH: "" },
    encoding: "utf8",
  });
}

test("verify-out の期待値は env ではなく package.json の name から導かれる", () => {
  const slug = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).name;

  // サブパス配信の out/ は、env を一切渡さなくても合格する
  const ok = runVerifyOut({ basePath: `/${slug}` });
  assert.equal(ok.status, 0, ok.stderr);

  // ルート配信の out/ は落ちる。**このケースが「期待値が env 由来に巻き戻って
  // いないこと」を直接固定する**。env から導く実装に戻すと、env 未設定＝
  // ルート期待になり、この out/ が合格してしまう（＝素通しの再発）。
  const ng = runVerifyOut({ basePath: "" });
  assert.equal(ng.status, 1);
  assert.match(ng.stderr, /canonical/);
});
