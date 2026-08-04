// おなまえ工房 — データ健全性の smoke テスト（node:test・追加依存なし）。
// 実行: pnpm test (= node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHEETS, sheetById } from "../app/lib/labels.ts";

test("SHEETS: 1件以上あり、id が一意", () => {
  assert.ok(SHEETS.length >= 2);
  const ids = SHEETS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("SHEETS: 各規格の必須フィールドが妥当", () => {
  for (const s of SHEETS) {
    assert.ok(s.name && s.note, `${s.id} に表示名と説明`);
    assert.ok(s.page.w > 0 && s.page.h > 0);
    assert.ok(s.label.w > 0 && s.label.h > 0);
    assert.ok(s.cols >= 1 && s.rows >= 1);
    assert.ok(s.margin.left >= 0 && s.margin.top >= 0);
    assert.ok(s.gap.x >= 0 && s.gap.y >= 0);
  }
});

test("SHEETS: 先頭は freeform（A4普通紙）", () => {
  assert.equal(SHEETS[0].freeform, true);
});

test("sheetById: 未知idはフォールバックする", () => {
  assert.equal(sheetById("no-such-id").id, SHEETS[0].id);
});
