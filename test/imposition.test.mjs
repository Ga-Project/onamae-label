// おなまえ工房 — 面付け＆自動縮小エンジンのユニットテスト（node:test・追加依存なし）。
// 実行: pnpm test (= node --test / Node 22+ の TS 型ストリップで .ts を直接 import)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLabelQueue,
  imposeSheet,
  cellsPerSheet,
  sheetsNeeded,
  fitFontSize,
  textWidthUnits,
} from "../app/lib/imposition.ts";
import {
  SHEETS,
  sheetById,
  withFreeform,
  maxColsForPage,
  maxRowsForPage,
} from "../app/lib/labels.ts";

test("buildLabelQueue: 持ち物なしは名前だけ1件を返す", () => {
  const q = buildLabelQueue("やまだ はなこ", "ヤマダ ハナコ", []);
  assert.equal(q.length, 1);
  assert.equal(q[0].owner, "やまだ はなこ");
  assert.equal(q[0].furigana, "ヤマダ ハナコ");
  assert.equal(q[0].item, undefined);
});

test("buildLabelQueue: 持ち物×枚数の総和だけラベルを展開する", () => {
  const q = buildLabelQueue("たろう", undefined, [
    { name: "えんぴつ", count: 12 },
    { name: "したじき", count: 2 },
  ]);
  assert.equal(q.length, 14);
  assert.equal(q.filter((c) => c.item === "えんぴつ").length, 12);
  assert.equal(q.filter((c) => c.item === "したじき").length, 2);
  assert.ok(q.every((c) => c.owner === "たろう"));
});

test("buildLabelQueue: 空名・0枚・負数の持ち物は除外する", () => {
  const q = buildLabelQueue("はな", undefined, [
    { name: "  ", count: 5 },
    { name: "ふで", count: 0 },
    { name: "けしごむ", count: -3 },
    { name: "のり", count: 3 },
  ]);
  assert.equal(q.length, 3);
  assert.ok(q.every((c) => c.item === "のり"));
});

test("buildLabelQueue: 枚数は999で頭打ち・小数は切り捨て", () => {
  const q = buildLabelQueue("x", undefined, [{ name: "a", count: 10000 }]);
  assert.equal(q.length, 999);
  const q2 = buildLabelQueue("x", undefined, [{ name: "a", count: 3.9 }]);
  assert.equal(q2.length, 3);
});

test("textWidthUnits: 全角=1.0 / 半角=0.55 で近似する", () => {
  assert.equal(textWidthUnits("あい"), 2.0);
  assert.ok(Math.abs(textWidthUnits("ab") - 1.1) < 1e-9);
  assert.ok(textWidthUnits("あa") > 1.5 && textWidthUnits("あa") < 1.6);
});

test("fitFontSize: 長い文字列ほど小さく、下限を割らない", () => {
  const box = { max: 6, min: 2, padding: 1 };
  const short = fitFontSize("はな", 40, 12, box);
  const long = fitFontSize("ながいなまえのこども", 40, 12, box);
  assert.ok(short >= long, "短い名前の方が大きいはず");
  assert.ok(long >= box.min, "下限を割らない");
  assert.ok(short <= box.max, "上限を超えない");
});

test("cellsPerSheet / sheetsNeeded: セル数とシート枚数の整合", () => {
  const sheet = sheetById("name-65"); // 5列×13段 = 65面
  assert.equal(cellsPerSheet(sheet), 65);
  assert.equal(sheetsNeeded(sheet, 0), 1);
  assert.equal(sheetsNeeded(sheet, 65), 1);
  assert.equal(sheetsNeeded(sheet, 66), 2);
  assert.equal(sheetsNeeded(sheet, 130), 2);
  assert.equal(sheetsNeeded(sheet, 131), 3);
});

test("imposeSheet: セルは用紙内に収まり、正しい座標に並ぶ", () => {
  const sheet = sheetById("name-24"); // 3列×8段
  const q = buildLabelQueue("たろう", undefined, [
    { name: "コップ", count: 3 },
  ]);
  const cells = imposeSheet(sheet, q);
  assert.equal(cells.length, cellsPerSheet(sheet));
  // 先頭セルは左上マージン。
  assert.ok(Math.abs(cells[0].x - sheet.margin.left) < 1e-6);
  assert.ok(Math.abs(cells[0].y - sheet.margin.top) < 1e-6);
  // 2列目は label.w + gap.x だけ右。
  assert.ok(
    Math.abs(cells[1].x - (sheet.margin.left + sheet.label.w + sheet.gap.x)) <
      1e-6,
  );
  // すべてのセルが用紙の内側。
  for (const c of cells) {
    assert.ok(c.x >= 0 && c.x + c.w <= sheet.page.w + 1e-6, "横がはみ出さない");
    assert.ok(c.y >= 0 && c.y + c.h <= sheet.page.h + 1e-6, "縦がはみ出さない");
    assert.ok(c.ownerSize > 0);
  }
});

test("imposeSheet: 名前だけ(repeatToFill)は全セルを名前で敷き詰める", () => {
  const sheet = sheetById("name-44");
  const q = buildLabelQueue("はなこ", undefined, []);
  const cells = imposeSheet(sheet, q, true);
  assert.equal(cells.length, cellsPerSheet(sheet));
  assert.ok(cells.every((c) => c.content.owner === "はなこ"));
  assert.ok(cells.every((c) => c.content.item === undefined));
});

test("imposeSheet: 持ち物ありは枚数ぶんだけ埋め残りは空ける", () => {
  const sheet = sheetById("name-24"); // 24セル
  const q = buildLabelQueue("たろう", undefined, [
    { name: "コップ", count: 3 },
  ]);
  const cells = imposeSheet(sheet, q, false);
  const filled = cells.filter((c) => c.content.owner === "たろう");
  const empty = cells.filter((c) => c.content.owner === "");
  assert.equal(filled.length, 3, "枚数ぶんだけ埋まる");
  assert.equal(empty.length, cellsPerSheet(sheet) - 3, "残りは空き");
  assert.ok(filled.every((c) => c.content.item === "コップ"));
});

test("withFreeform: 列×行を用紙内に収まる最大までクランプして反映", () => {
  const free = SHEETS.find((s) => s.freeform);
  assert.ok(free, "freeform シートが存在する");
  const s = withFreeform(free, { cols: 99, rows: 0 });
  assert.equal(s.cols, maxColsForPage(free)); // 用紙内に収まる最大列
  assert.equal(s.rows, 1); // 下限
  // freeform でないシートには効かない。
  const fixed = withFreeform(sheetById("name-65"), { cols: 2 });
  assert.equal(fixed.cols, 5);
});

test("withFreeform: どんな過大指定でも生成グリッドが用紙内に収まる", () => {
  const free = SHEETS.find((s) => s.freeform);
  const s = withFreeform(free, { cols: 999, rows: 999 });
  const totalW = s.margin.left + s.cols * s.label.w + (s.cols - 1) * s.gap.x;
  const totalH = s.margin.top + s.rows * s.label.h + (s.rows - 1) * s.gap.y;
  assert.ok(totalW <= s.page.w + 1e-6, "横が用紙内");
  assert.ok(totalH <= s.page.h + 1e-6, "縦が用紙内");
  assert.ok(maxColsForPage(free) >= 1 && maxRowsForPage(free) >= 1);
});

test("SHEETS: 全規格でグリッドが用紙内に物理的に収まる", () => {
  for (const s of SHEETS) {
    const totalW = s.margin.left + s.cols * s.label.w + (s.cols - 1) * s.gap.x;
    const totalH = s.margin.top + s.rows * s.label.h + (s.rows - 1) * s.gap.y;
    assert.ok(totalW <= s.page.w + 1e-6, `${s.id} 横が用紙内`);
    assert.ok(totalH <= s.page.h + 1e-6, `${s.id} 縦が用紙内`);
  }
});
