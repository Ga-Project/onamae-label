// おなまえ工房 — 面付け＆自動縮小エンジン（純粋関数・サーバ不要）
//
// 規格グリッドに対して mm 正確なセル座標を出し、文字数に応じてフォントサイズを
// 自動縮小し、フリガナを収める。この製品の精度の中核。

import type { LabelSheet } from "./labels";

/** 名前つけ対象の1品目（持ち物）。 */
export interface Item {
  /** 持ち物名（例: えんぴつ）。空なら名前だけのラベル。 */
  name: string;
  /** 必要枚数。 */
  count: number;
}

/** 1枚のラベルに載る内容。 */
export interface LabelContent {
  /** 主表示（子どもの名前）。 */
  owner: string;
  /** フリガナ（任意）。 */
  furigana?: string;
  /** 持ち物名（任意）。 */
  item?: string;
}

/** 面付け後の1セルの配置（mm）。 */
export interface PlacedCell {
  /** 用紙左上からのラベル左上座標。 */
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  content: LabelContent;
  /** owner に適用する推奨フォントサイズ（mm）。 */
  ownerSize: number;
  /** furigana に適用する推奨フォントサイズ（mm）。 */
  furiganaSize: number;
  /** item に適用する推奨フォントサイズ（mm）。 */
  itemSize: number;
}

/** owner/持ち物/枚数 から、面付けに流し込むラベル内容の列を作る。 */
export function buildLabelQueue(
  owner: string,
  furigana: string | undefined,
  items: Item[],
): LabelContent[] {
  const trimmedOwner = owner.trim();
  const fg = furigana?.trim() || undefined;
  const realItems = items
    .map((it) => ({ name: it.name.trim(), count: clampCount(it.count) }))
    .filter((it) => it.name.length > 0 && it.count > 0);

  if (realItems.length === 0) {
    // 持ち物指定なし → 名前だけのラベルを1枚分（呼び出し側でシートを敷き詰める）。
    return [{ owner: trimmedOwner, furigana: fg }];
  }

  const queue: LabelContent[] = [];
  for (const it of realItems) {
    for (let i = 0; i < it.count; i++) {
      queue.push({ owner: trimmedOwner, furigana: fg, item: it.name });
    }
  }
  return queue;
}

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(999, Math.floor(n)));
}

/** シートの total セル数。 */
export function cellsPerSheet(sheet: LabelSheet): number {
  return sheet.cols * sheet.rows;
}

/**
 * 文字列を幅 wmm / 高さ hmm の枠へ収める推奨フォントサイズ(mm)を返す。
 * 全角/半角をざっくり見積り、はみ出さない最大サイズを返す（下限あり）。
 */
export function fitFontSize(
  text: string,
  boxW: number,
  boxH: number,
  opts: { max: number; min: number; padding: number },
): number {
  const t = text ?? "";
  const usableW = Math.max(1, boxW - opts.padding * 2);
  const usableH = Math.max(1, boxH - opts.padding * 2);
  const widthUnits = textWidthUnits(t);
  if (widthUnits <= 0) return opts.max;
  // 1文字の平均横幅 ≒ fontSize * unit。全角=1.0, 半角=0.55 として合計 widthUnits。
  // 横方向: usableW / widthUnits、縦方向: usableH（1行想定）。小さい方を採用。
  const byWidth = usableW / widthUnits;
  const byHeight = usableH;
  const size = Math.min(byWidth, byHeight, opts.max);
  return Math.max(opts.min, round2(size));
}

/** 全角1.0 / 半角0.55 で近似した「文字幅の合計単位」。 */
export function textWidthUnits(text: string): number {
  let u = 0;
  for (const ch of text) {
    u += isHalfWidth(ch) ? 0.55 : 1.0;
  }
  return u;
}

function isHalfWidth(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  // ASCII と半角カナ域を半角扱い。
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xff61 && code <= 0xff9f);
}

/**
 * ラベル内容の列を1シート分だけ面付けする。
 * - repeatToFill=true : queue を循環させて全セルを埋める（名前だけモードでシートを敷き詰める用途）。
 * - repeatToFill=false: queue の枚数ぶんだけ配置し、残りのセルは空ける（持ち物×枚数を正確に印刷する用途）。
 */
export function imposeSheet(
  sheet: LabelSheet,
  queue: LabelContent[],
  repeatToFill = false,
): PlacedCell[] {
  const total = cellsPerSheet(sheet);
  const cells: PlacedCell[] = [];

  for (let idx = 0; idx < total; idx++) {
    const col = idx % sheet.cols;
    const row = Math.floor(idx / sheet.cols);
    const x = sheet.margin.left + col * (sheet.label.w + sheet.gap.x);
    const y = sheet.margin.top + row * (sheet.label.h + sheet.gap.y);

    const content: LabelContent =
      queue.length === 0
        ? EMPTY
        : repeatToFill
          ? (queue[idx % queue.length] ?? EMPTY)
          : (queue[idx] ?? EMPTY);

    const hasFurigana = Boolean(content.furigana);
    const hasItem = Boolean(content.item);
    // 縦配分: フリガナ(小)・名前(大)・持ち物(中)。
    const ownerBoxH =
      sheet.label.h * (hasItem ? 0.5 : hasFurigana ? 0.62 : 0.8);
    const ownerSize = fitFontSize(
      content.owner || " ",
      sheet.label.w,
      ownerBoxH,
      {
        max: Math.min(6, sheet.label.h * 0.55),
        min: 2,
        padding: 1,
      },
    );
    const furiganaSize = hasFurigana
      ? fitFontSize(content.furigana!, sheet.label.w, sheet.label.h * 0.22, {
          max: 2.6,
          min: 1.4,
          padding: 1,
        })
      : 0;
    const itemSize = hasItem
      ? fitFontSize(content.item!, sheet.label.w, sheet.label.h * 0.3, {
          max: 3,
          min: 1.6,
          padding: 1,
        })
      : 0;

    cells.push({
      x: round2(x),
      y: round2(y),
      w: sheet.label.w,
      h: sheet.label.h,
      radius: sheet.radius,
      content,
      ownerSize,
      furiganaSize,
      itemSize,
    });
  }
  return cells;
}

const EMPTY: LabelContent = { owner: "" };

/** 総必要枚数から、印刷に必要なシート枚数を求める。 */
export function sheetsNeeded(sheet: LabelSheet, queueLength: number): number {
  const per = cellsPerSheet(sheet);
  if (queueLength <= 0) return 1;
  return Math.max(1, Math.ceil(queueLength / per));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
