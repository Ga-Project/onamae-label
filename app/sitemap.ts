import type { MetadataRoute } from "next";
import { siteUrl } from "./lib/site";

// サイトマップ。static export では build 時に out/sitemap.xml として書き出される。
// 単一ページのツールなので、配信 URL 1件を自己参照する。
// URL は layout の metadataBase と同じ絶対 URL（basePath 込み）に揃える。
//
// 注: Pages のプロジェクトページ配信では robots.txt がドメイン直下（この製品の
// 管轄外）にしか置けず、クローラは製品配下の robots.txt を読まない。この
// sitemap.xml は Search Console への手動送信で使う。
// Next 15 は output:"export" のとき、sitemap ルートに force-static（または revalidate）が
// 無いとビルドを止める。これは **無条件の要件** で、env を読むかどうかとは関係ない
// （URL を完全にハードコードしても同じエラーになることを実測で確認済み）。
// 「もう env を読まないから不要」と判断してこの行を消すとビルドが壊れる。
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl(process.env.NEXT_PUBLIC_BASE_PATH),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
