// onamae-label — 404。static export では out/404.html に書き出される（GitHub Pages 404）。
// 視覚デザインは各製品がゼロから作る。ここは機能的な最小構成（noindex + 本文）のみ。
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — おなまえ工房",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "4rem 1.2rem" }}>
      <h1 style={{ fontSize: "2rem" }}>404</h1>
      <p>ページが見つかりません。</p>
      <Link href="/">おなまえ工房のトップへ戻る</Link>
    </main>
  );
}
