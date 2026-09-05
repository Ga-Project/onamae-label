// おなまえ工房 — 受入 E2E。
// items: 受入確認項目の機械実行版。
// designStates: 見た目を確認するための画面（値が入った状態・ダーク）。

export const items = {
  // 名前を入れると印刷用の台紙プレビューが出る（中核機能）。
  "preview-appears": async (h) => {
    await h.goto("/");
    await h.expectText("おなまえ工房");
    // 入力前は空状態の案内、台紙は未表示。
    await h.expectText("名前を入れると");
    await h.fill('input[placeholder="やまだ はなこ"]', "やまだ はなこ");
    await h.wait(300);
    // 台紙（シート）が現れる。
    await h.expectSelector(".sheet");
    await h.expectSelector(".cell");
  },

  // 持ち物と枚数を入れると合計枚数に反映される。
  "count-reflected": async (h) => {
    await h.goto("/");
    await h.fill('input[placeholder="やまだ はなこ"]', "たろう");
    await h.wait(200);
    // 既定の持ち物（えんぴつ12・したじき2）で合計14枚が出る。
    await h.expectText("合計");
    await h.expectMatch(/合計\s*14\s*枚/, "合計14枚");
  },

  // シートを選ぶと選択状態が切り替わる。
  "sheet-switch": async (h) => {
    await h.goto("/");
    await h.fill('input[placeholder="やまだ はなこ"]', "はな");
    await h.wait(200);
    await h.clickText("65面 小ラベル（約38×20mm）");
    await h.wait(200);
    await h.expectSelector('.sheet-opt[aria-pressed="true"]');
  },

  // 名前を入れると印刷ボタンが有効になる。
  "print-ready": async (h) => {
    await h.goto("/");
    // 未入力時は印刷ボタンが disabled。
    await h.expectSelector("button.btn-primary[disabled]");
    await h.fill('input[placeholder="やまだ はなこ"]', "はなこ");
    await h.wait(200);
    await h.expectSelector("button.btn-primary:not([disabled])");
  },

  // レスポンシブ: 横スクロールが出ない（狭い画面でも崩れない）。
  "responsive-narrow": async (h) => {
    await h.viewport(390, 800);
    await h.goto("/");
    await h.fill('input[placeholder="やまだ はなこ"]', "やまだ はなこ");
    await h.wait(300);
    await h.expectNoHorizontalOverflow();
  },
};

export const designStates = {
  // 値が入って台紙に結果が出ている状態（空フォームでは判定できない）。
  "main-populated": async (h) => {
    await h.goto("/");
    await h.fill('input[placeholder="やまだ はなこ"]', "やまだ はなこ");
    await h.fill('input[placeholder="ヤマダ ハナコ"]', "ヤマダ ハナコ");
    await h.wait(400);
  },
  // ダーク配色（切替UIは持たないので data-theme を直接立てる）。
  dark: async (h) => {
    await h.goto("/");
    await h.fill('input[placeholder="やまだ はなこ"]', "やまだ はなこ");
    await h.page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await h.wait(400);
  },
};
