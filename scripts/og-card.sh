#!/usr/bin/env bash
# 共有カード（og:image）を scripts/og-card.html から public/og.png へ書き出す。
#
#   ./scripts/og-card.sh
#
# og-card.html を直したら必ずこれを流し、書き出した public/og.png も一緒にコミットする
# （画像は静的に配信するため、コミットされた PNG がそのまま公開物になる）。
# 流し忘れて古い PNG が公開され続けるのは test/guards.test.mjs が検出する。
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ ! -x "$CHROME" ]; then
  echo "Chrome が見つかりません: $CHROME" >&2
  echo "CHROME=/path/to/chrome ./scripts/og-card.sh のように指定してください。" >&2
  exit 1
fi

# 先にレイアウトを検査する。寸法やファイルサイズでは拾えず、目視でも取りこぼす
# 種類の破綻（はみ出し・枠外・文字が小さすぎる・寸法線とセルの不一致）を
# 書き出しの前段で機械的に落とす。検査は書き出しと同じビューポートで行う。
# --dump-dom には検査スクリプト自身のソースも含まれるので、結果は必ず
# div#overflow-report の中身だけを取り出す。
report=$("$CHROME" --headless=new --disable-gpu --virtual-time-budget=3000 \
  --blink-settings=preferredColorScheme=1 \
  --window-size=1200,630 --dump-dom scripts/og-card.html 2>/dev/null \
  | sed -n 's/.*id="overflow-report"[^>]*>\([^<]*\)<.*/\1/p' | head -1)

if [ -z "$report" ]; then
  echo "レイアウト検査の結果を取得できませんでした（og-card.html の検査スクリプトを確認してください）。" >&2
  exit 1
fi
case "$report" in
  LAYOUT_OK) ;;
  *) echo "レイアウトが壊れています: $(printf '%s' "${report#LAYOUT_FAIL:}" \
       | sed -e 's/&gt;/>/g' -e 's/&lt;/</g' -e 's/&amp;/\&/g')" >&2
     echo "※ 文字サイズは 28px を下回らせないこと（SNS では 300-500px まで縮小され、それ未満は読めなくなる）。" >&2
     exit 1 ;;
esac

# 古い PNG が残ったまま検査を通過しないよう、書き出し前に消す。
rm -f public/og.png

# ライトテーマ固定で書き出す（headless の既定はダークで、製品のクラフト地が出ない）。
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --blink-settings=preferredColorScheme=1 \
  --window-size=1200,630 \
  --screenshot=public/og.png \
  scripts/og-card.html 2>/dev/null

# Chrome は白紙や描画途中でも終了コード 0 を返しうるので、書き出したものを検査する。
width=$(sips -g pixelWidth public/og.png | awk '/pixelWidth/{print $2}')
height=$(sips -g pixelHeight public/og.png | awk '/pixelHeight/{print $2}')
bytes=$(wc -c < public/og.png | tr -d ' ')

if [ "$width" != "1200" ] || [ "$height" != "630" ]; then
  echo "寸法が違います: ${width}x${height}（期待 1200x630）。og-card.html の html/body のサイズを確認してください。" >&2
  exit 1
fi
if [ "$bytes" -lt 50000 ]; then
  echo "ファイルが小さすぎます: ${bytes} bytes。白紙で書き出された可能性があります。" >&2
  exit 1
fi

# 版下のハッシュを版下の隣に置く。og-card.html を直したのに書き出しを忘れると
# （＝古い PNG が公開され続けると）ここがズレるので test/guards.test.mjs が検出する。
# 書き出しは macOS のフォントに依存するため、CI で PNG を再生成して比較はできない。
shasum -a 256 scripts/og-card.html | awk '{print $1}' > scripts/og-card.html.sha256

echo "書き出しました: public/og.png (${width}x${height}, ${bytes} bytes)"
echo "※ 拡大して目視で確認してください:"
echo "   - 64mm / 33mm の寸法線が、セル1枚ぶんの幅・高さと一致しているか"
echo "   - 四隅のトンボが版面の中に収まっているか"
echo "   - 縮小表示（300px 幅）でリード文が読めるか"
