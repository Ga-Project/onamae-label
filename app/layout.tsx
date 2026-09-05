import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteUrl, ogImageUrl, OG_IMAGE_PATH } from "./lib/site";

const TITLE = "おなまえ工房 — 入園入学の名前つけラベルを面付け印刷";
const DESC =
  "名前と持ち物を入れるだけで、市販のラベルシートやA4普通紙にmm単位でぴったり面付けした印刷用の台紙を作る無料ツール。文字数に合わせて自動縮小・フリガナ配置。入力はこの端末内で処理し送信しません。登録不要。";

// 配信 URL（basePath 込み・末尾スラッシュ付き）。OGP 画像・canonical・sitemap は
// すべてこれを基準に解決する。組み立ては app/lib/site.ts に集約（単体テスト対象）。
const SITE_URL = siteUrl(process.env.NEXT_PUBLIC_BASE_PATH);

const OG_IMAGE = {
  url: OG_IMAGE_PATH, // metadataBase（末尾スラッシュ付き）に対して相対解決される
  width: 1200,
  height: 630,
  alt: "おなまえ工房の紹介カード。「名前を入れるだけで、手持ちのシートにmm単位で面付け」の説明と、対応規格「24面 なまえシール」、無料・登録不要・入力は端末内で処理の3点。ラベルシートの版面に、フリガナと持ち物名が入った名前シールがカットガイドの破線で2枚並び、1枚ぶんの寸法が64mm×33mmと寸法線で示されている。四隅には印刷用のトンボ。",
};

// 構造化データ（schema.org / JSON-LD）。「インストール不要・無料・日本語の
// ブラウザツール」という実体を検索エンジンに明示する。URL は metadataBase と同じ
// 絶対 URL（basePath 込み）に揃える。
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "おなまえ工房",
  url: SITE_URL,
  // OGP は metadataBase 相対解決、JSON-LD は手連結という二重経路にしないため、
  // 同じ組み立て関数から絶対 URL を得る。
  image: ogImageUrl(process.env.NEXT_PUBLIC_BASE_PATH),
  description: DESC,
  inLanguage: "ja",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  browserRequirements: "JavaScript が有効なモダンブラウザ",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
  featureList: [
    "市販ラベルシート規格へのmm単位の面付け",
    "A4普通紙へのフリー配置",
    "文字数に合わせた自動縮小",
    "フリガナの自動配置",
    "印刷用の台紙をブラウザだけで作成",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  applicationName: "おなまえ工房",
  alternates: { canonical: SITE_URL },
  keywords: [
    "名前つけ",
    "お名前シール",
    "ラベル",
    "面付け",
    "入園準備",
    "入学準備",
    "テンプレート",
    "無料",
    "印刷",
  ],
  openGraph: {
    title: TITLE,
    description: DESC,
    type: "website",
    locale: "ja_JP",
    siteName: "おなまえ工房",
    url: SITE_URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "名前を入れるだけで、市販のラベルシートやA4普通紙にmm単位でぴったり面付け。自動縮小・フリガナ配置つき。無料・登録不要。",
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <script
          type="application/ld+json"
          // 構造化データは静的な既知値のみ（利用者の入力を一切含まない）。
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* アクセス解析（cookieless・秘密キー不要）: 全プロダクト共通の単一 GoatCounter サイト
            「ga-project」に集約する。製品ごとの数値は path（/onamae-label/）で区別されるので、
            GoatCounter 側でサイトを新規作成しない＝新プロダクトは自動で ga-project の新パスとして計測される。 */}
        <script
          data-goatcounter="https://ga-project.goatcounter.com/count"
          async
          src="//gc.zgo.at/count.js"
        />
        {children}
      </body>
    </html>
  );
}
