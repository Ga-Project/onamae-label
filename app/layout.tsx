import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// SEO/OGP の枠。各製品が title / description / openGraph を自分の内容に差し替える。
// metadataBase は公開 URL が決まったら設定する（OGP 画像の絶対 URL 解決に使う）。
const TITLE = "おなまえ工房 — 入園入学の名前つけラベルを面付け印刷";
const DESC =
  "名前と持ち物を入れるだけで、市販のラベルシートやA4普通紙にmm単位でぴったり面付けした印刷用の台紙を作る無料ツール。文字数に合わせて自動縮小・フリガナ配置。入力はこの端末内で処理し送信しません。登録不要。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
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
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
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
