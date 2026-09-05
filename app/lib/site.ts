// おなまえ工房 — 配信先 URL の組み立て（純関数・DOM 非依存）。
//
// この製品は GitHub Pages のプロジェクトページ（<owner>.github.io/onamae-label/）へ
// サブパス配信される。OGP 画像・canonical・sitemap はいずれも「絶対 URL」でしか
// 解決されないため、basePath 込みの配信 URL をここ一箇所で組み立てて共有する。
// （layout と sitemap が別々に文字列連結すると、片方だけ basePath を落としても
// ビルドは通ってしまい、ライブで初めて 404 に気づくことになる。）

/** 配信ドメイン。Pages のプロジェクトページはこのホスト直下に並ぶ。 */
export const SITE_ORIGIN = "https://ga-project.github.io";

/** OGP 画像の公開パス（配信 URL からの相対）。 */
export const OG_IMAGE_PATH = "og.png";

/**
 * basePath から配信 URL を作る。**必ず末尾スラッシュ付き**で返す。
 *
 * 末尾スラッシュは metadataBase の要件でもある。`new URL("og.png", base)` は
 * base の最後のパスセグメントを置き換えるので、`.../onamae-label`（スラッシュなし）を
 * 渡すと `https://ga-project.github.io/og.png` になり basePath が消える。
 *
 * @param basePath 例 "/onamae-label"。未設定・空文字はルート配信とみなす。
 */
export function siteUrl(basePath?: string | null): string {
  const raw = (basePath ?? "").trim();
  if (!raw || raw === "/") return `${SITE_ORIGIN}/`;
  // 前後のスラッシュを剥がしてから組み直す（"onamae-label" / "/onamae-label/" も同じ結果に）。
  const seg = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  return seg ? `${SITE_ORIGIN}/${seg}/` : `${SITE_ORIGIN}/`;
}

/** 配信 URL 上の OGP 画像の絶対 URL。 */
export function ogImageUrl(basePath?: string | null): string {
  return `${siteUrl(basePath)}${OG_IMAGE_PATH}`;
}
