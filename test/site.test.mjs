// おなまえ工房 — 配信 URL 組み立てのユニットテスト（node:test・追加依存なし）。
// 実行: pnpm test (= node --test / Node 22+ の TS 型ストリップで .ts を直接 import)
//
// ここが守っているのは「OGP 画像と canonical と sitemap が、実際に配信される
// サブパス込みの絶対 URL になっていること」。basePath の落下はビルドでは検出できず、
// ライブのリンクプレビューが割れて初めて分かる種類の壊れ方なので固定しておく。
import { test } from "node:test";
import assert from "node:assert/strict";
import { siteUrl, ogImageUrl, SITE_ORIGIN, OG_IMAGE_PATH } from "../app/lib/site.ts";

test("siteUrl: basePath 付きはサブパス込みで末尾スラッシュ", () => {
  assert.equal(siteUrl("/onamae-label"), "https://ga-project.github.io/onamae-label/");
});

test("siteUrl: 未設定・空・ルートはドメイン直下", () => {
  for (const v of [undefined, null, "", "   ", "/"]) {
    assert.equal(siteUrl(v), "https://ga-project.github.io/");
  }
});

test("siteUrl: スラッシュの有無を揃える", () => {
  const want = "https://ga-project.github.io/onamae-label/";
  for (const v of ["onamae-label", "/onamae-label", "onamae-label/", "/onamae-label/"]) {
    assert.equal(siteUrl(v), want);
  }
});

test("siteUrl: 常に末尾スラッシュで終わる（metadataBase の要件）", () => {
  for (const v of [undefined, "/onamae-label", "onamae-label"]) {
    assert.ok(siteUrl(v).endsWith("/"), `${v} の結果が / で終わっていない`);
  }
});

test("ogImageUrl: basePath を落とさない", () => {
  assert.equal(
    ogImageUrl("/onamae-label"),
    "https://ga-project.github.io/onamae-label/og.png",
  );
});

test("ogImageUrl: new URL 相対解決でも basePath が残る（metadataBase 経路の再現）", () => {
  // Next の metadata は metadataBase に対して相対パスを new URL で解決する。
  // 末尾スラッシュが無いと最後のセグメントが置換され basePath が消えるため、
  // 実際の解決経路そのものを固定する。
  const resolved = new URL(OG_IMAGE_PATH, siteUrl("/onamae-label")).toString();
  assert.equal(resolved, "https://ga-project.github.io/onamae-label/og.png");
});

test("SITE_ORIGIN: 末尾スラッシュを持たない（二重スラッシュを作らない）", () => {
  assert.ok(!SITE_ORIGIN.endsWith("/"));
});
