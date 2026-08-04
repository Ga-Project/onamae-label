// おなまえ工房 — 対応シート規格（基本規格・無料コア）
//
// 無料コアが持つのは「A4普通紙へのフリー配置」＋広く流通する標準ラベルシートの
// 代表的グリッドのみ。算数セット極小プリセットや主要シート全規格対応は有料ティア（凍結・v1未搭載）。
//
// 家庭用プリンタは実機ごとに 1〜2mm の給紙ズレが出るため、各シートは標準グリッドを
// 持ちつつ、利用者が印刷時に X/Y をmm単位で微調整（offset）できる前提で設計している。
// 「標準値をそのまま信じさせる」のではなく「試し刷り→微調整」で実機に合わせる。

export type Unit = "mm";

/** ラベルシートの物理グリッド定義（すべて mm）。 */
export interface LabelSheet {
  id: string;
  /** 画面表示名（利用者が手持ちシートと照合できる呼称）。 */
  name: string;
  /** 補足（面数・用途など）。 */
  note: string;
  /** 用紙サイズ。 */
  page: { w: number; h: number };
  /** 1ラベルの寸法。 */
  label: { w: number; h: number };
  /** 列数・行数。 */
  cols: number;
  rows: number;
  /** 用紙左上からラベル領域左上までの余白。 */
  margin: { top: number; left: number };
  /** ラベル同士のすき間（列間・行間）。0 なら密着グリッド。 */
  gap: { x: number; y: number };
  /** 角丸半径（プレビューの見た目・実シールの型抜きに寄せる）。 */
  radius: number;
  /** true のとき、列数×行数・ラベル寸法を利用者が自由に変えられる（A4フリー配置）。 */
  freeform?: boolean;
}

const A4 = { w: 210, h: 297 };

// 標準グリッドは広く知られたラベル面付け（Avery/A-one系の代表的な面数）に準拠。
// 実機差は offset 微調整で吸収する前提。数値は代表値で、利用者は試し刷りで合わせる。
export const SHEETS: LabelSheet[] = [
  {
    id: "a4-free",
    name: "A4 普通紙（フリー配置）",
    note: "手持ちの普通紙に自由な列×行で面付け。まず試し刷りに。",
    page: A4,
    label: { w: 45, h: 18 },
    cols: 4,
    rows: 13,
    margin: { top: 12, left: 8 },
    gap: { x: 3, y: 2 },
    radius: 3,
    freeform: true,
  },
  {
    id: "name-24",
    name: "24面 なまえシール（約64×33mm）",
    note: "コップ・お道具箱など中サイズの持ち物向け。3列×8段。",
    page: A4,
    label: { w: 64, h: 33 },
    cols: 3,
    rows: 8,
    margin: { top: 12, left: 9 },
    gap: { x: 3, y: 2 },
    radius: 3,
  },
  {
    id: "name-44",
    name: "44面 なまえシール（約45×24mm）",
    note: "文具・小物向けの標準サイズ。4列×11段。",
    page: A4,
    label: { w: 45, h: 24 },
    cols: 4,
    rows: 11,
    margin: { top: 11, left: 8 },
    gap: { x: 2, y: 1 },
    radius: 2.5,
  },
  {
    id: "name-65",
    name: "65面 小ラベル（約38×20mm）",
    note: "鉛筆・小物の名前つけに。5列×13段。",
    page: A4,
    label: { w: 38, h: 20 },
    cols: 5,
    rows: 13,
    margin: { top: 10, left: 6 },
    gap: { x: 1.5, y: 0.5 },
    radius: 2,
  },
];

// SHEETS は非空のリテラル。既定シート（先頭）は常に存在する。
export const DEFAULT_SHEET: LabelSheet = SHEETS[0]!;

export function sheetById(id: string): LabelSheet {
  return SHEETS.find((s) => s.id === id) ?? DEFAULT_SHEET;
}

/** 用紙・ラベル寸法・余白・すき間から、用紙内に収まる最大列数を返す。 */
export function maxColsForPage(s: LabelSheet): number {
  return Math.max(
    1,
    Math.floor((s.page.w - s.margin.left + s.gap.x) / (s.label.w + s.gap.x)),
  );
}
/** 用紙内に収まる最大段数を返す。 */
export function maxRowsForPage(s: LabelSheet): number {
  return Math.max(
    1,
    Math.floor((s.page.h - s.margin.top + s.gap.y) / (s.label.h + s.gap.y)),
  );
}

// A4フリー配置（既定シート）で用紙内に収まる列×行の上限。UI の入力上限に使う。
export const FREE_MAX_COLS = maxColsForPage(DEFAULT_SHEET);
export const FREE_MAX_ROWS = maxRowsForPage(DEFAULT_SHEET);

/**
 * freeform シートに列×行・ラベル寸法の上書きを適用した新しい定義を返す。
 * 列×行は「用紙内に物理的に収まる最大」までに丸め、はみ出し構成を作れないようにする。
 */
export function withFreeform(
  sheet: LabelSheet,
  o: { cols?: number; rows?: number; labelW?: number; labelH?: number },
): LabelSheet {
  if (!sheet.freeform) return sheet;
  const labelW = clampNum(o.labelW ?? sheet.label.w, 12, sheet.page.w);
  const labelH = clampNum(o.labelH ?? sheet.label.h, 8, sheet.page.h);
  const sized: LabelSheet = { ...sheet, label: { w: labelW, h: labelH } };
  const cols = clampInt(o.cols ?? sheet.cols, 1, maxColsForPage(sized));
  const rows = clampInt(o.rows ?? sheet.rows, 1, maxRowsForPage(sized));
  return { ...sized, cols, rows };
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));
}
function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
}
