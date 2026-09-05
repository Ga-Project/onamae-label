// 本番ビルドの前段ガード。誤った basePath のまま `next build` を通さない。
//
// basePath を落とす・間違えると、canonical / og:url / og:image / JSON-LD / sitemap /
// アセット参照のすべてが **この製品ではない URL 空間** を指す out/ が出来上がる。
// それでもサイトは動くので誰も気づかず、リンクプレビューと検索の自己申告だけが
// 静かに壊れる。
//
// 期待値は package.json の name から導く。env と env を突き合わせても、env が
// 間違っていれば一緒に間違うだけで何も守れない（実際、値の誤りは素通りしていた）。
// このビルド設定は他のリポジトリへ複製されることがあり、**複製先でスラッグを
// 直し忘れる** のが最も現実的な発火経路になる。name を単一の出所にすれば、
// 複製先でも文字列を撒かずに自動で効く。
//
// このガードは next.config.mjs には置けない。`next lint` も `next build` と同じ
// phase-production-build で設定を読むため、lint まで巻き添えで落ちる（実測）。
//
// ルート直下へ配信する意図があるとき（ローカルでの静的配信など）は
// ALLOW_ROOT_BASE_PATH=1 を付けて明示的に宣言する。next dev は影響を受けない。
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const expected = `/${pkg.name}`;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// ルート配信を明示的に宣言している場合だけ、basePath 無しを許す。
if (process.env.ALLOW_ROOT_BASE_PATH === "1") {
  if (basePath) {
    console.error(
      `ALLOW_ROOT_BASE_PATH=1 と NEXT_PUBLIC_BASE_PATH=${basePath} が同時に指定されています。\n` +
        "  ルート配信かサブパス配信か、どちらの意図か決めてください。",
    );
    process.exit(1);
  }
} else if (basePath !== expected) {
  const what = basePath
    ? `NEXT_PUBLIC_BASE_PATH=${basePath} はこの製品のスラッグと一致しません（期待値 ${expected}）。`
    : "NEXT_PUBLIC_BASE_PATH が未設定です。";
  console.error(
    `${what}\n` +
      `  GitHub Pages のプロジェクトページ配信には ${expected} が必要です。\n` +
      `    NEXT_PUBLIC_BASE_PATH=${expected} pnpm build\n` +
      "  ルート直下へ配信する意図なら、その旨を明示してください。\n" +
      "    ALLOW_ROOT_BASE_PATH=1 pnpm build",
  );
  process.exit(1);
}
