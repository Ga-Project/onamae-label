"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  SHEETS,
  DEFAULT_SHEET,
  FREE_MAX_COLS,
  FREE_MAX_ROWS,
  sheetById,
  withFreeform,
  type LabelSheet,
} from "./lib/labels";
import {
  buildLabelQueue,
  imposeSheet,
  cellsPerSheet,
  sheetsNeeded,
  type Item,
  type PlacedCell,
} from "./lib/imposition";

// 96dpi 基準の 1mm = 3.7795px。プレビューはこれを基準に transform で縮小する。
const PX_PER_MM = 96 / 25.4;
// プレビュー＝印刷対象。過大な枚数でも DOM が破綻しないための安全上限。
// 通常の1人分は数枚で収まる。ここを超える指定は警告して分割印刷を促す。
const MAX_SHEETS = 40;

interface ItemRow extends Item {
  id: number;
}

let _rowSeq = 1;
function newRow(name = "", count = 8): ItemRow {
  return { id: _rowSeq++, name, count };
}

// 数値入力の空欄/NaN でプレビューが壊れないよう、範囲へ丸めた安全な数値を返す。
function safeInt(
  value: string,
  fallback: number,
  lo: number,
  hi: number,
): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}
function safeNum(
  value: string,
  fallback: number,
  lo: number,
  hi: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

export default function Home() {
  const [owner, setOwner] = useState("");
  const [furigana, setFurigana] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    newRow("えんぴつ", 12),
    newRow("したじき", 2),
  ]);
  const [sheetId, setSheetId] = useState<string>(DEFAULT_SHEET.id);
  const [freeCols, setFreeCols] = useState(4);
  const [freeRows, setFreeRows] = useState(13);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const baseSheet = sheetById(sheetId);
  const sheet: LabelSheet = useMemo(
    () =>
      applyOffset(
        baseSheet.freeform
          ? withFreeform(baseSheet, { cols: freeCols, rows: freeRows })
          : baseSheet,
        offsetX,
        offsetY,
      ),
    [baseSheet, freeCols, freeRows, offsetX, offsetY],
  );

  const queue = useMemo(
    () =>
      buildLabelQueue(
        owner,
        furigana,
        items.map((r) => ({ name: r.name, count: r.count })),
      ),
    [owner, furigana, items],
  );

  const totalLabels = queue.some((q) => q.item)
    ? queue.length
    : cellsPerSheet(sheet); // 名前だけなら1シート敷き詰め
  const needSheets = queue.some((q) => q.item)
    ? sheetsNeeded(sheet, queue.length)
    : 1;
  // プレビューと印刷は同じ集合を描く（印刷だけ枚数が欠ける不整合を避ける）。
  const renderSheets = Math.min(needSheets, MAX_SHEETS);

  const hasName = owner.trim().length > 0;

  // 各シート分の面付け（queue をシートごとにスライス）
  const perSheet = cellsPerSheet(sheet);
  const sheetsCells: PlacedCell[][] = useMemo(() => {
    if (!hasName) return [];
    const out: PlacedCell[][] = [];
    const hasItems = queue.some((q) => q.item);
    for (let s = 0; s < renderSheets; s++) {
      // 持ち物あり → 枚数ぶんだけ配置し残りは空き。名前だけ → 循環で敷き詰め。
      const slice = hasItems
        ? queue.slice(s * perSheet, (s + 1) * perSheet)
        : queue;
      out.push(imposeSheet(sheet, slice, !hasItems));
    }
    return out;
  }, [sheet, queue, renderSheets, perSheet, hasName]);

  // --- プレビューのスケール（コンテナ幅に合わせる） ---
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const sheetPxW = sheet.page.w * PX_PER_MM;
    const fit = () => {
      const avail = el.clientWidth - 4;
      setScale(Math.min(1, avail / sheetPxW));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sheet.page.w]);

  function updateItem(id: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeItem(id: number) {
    setItems((rows) =>
      rows.length > 1 ? rows.filter((r) => r.id !== id) : rows,
    );
  }

  const scaledW = sheet.page.w * PX_PER_MM * scale;
  const scaledH = sheet.page.h * PX_PER_MM * scale;

  return (
    <>
      <a className="skip" href="#stage">
        本文へスキップ
      </a>
      <div className="wrap">
        <header className="masthead">
          <h1 className="brand">
            <span className="brand-mark" aria-hidden="true" />
            おなまえ工房
          </h1>
          <span className="tagline">
            入園・入学の「名前つけ」を、貼るだけの状態に。
          </span>
          <span className="freeze-note" title="無料で使えます">
            無料・登録不要
          </span>
        </header>

        <p className="lede">
          名前と持ち物を入れると、市販のラベルシートやA4普通紙に
          <strong>mm単位でぴったり面付け</strong>
          した印刷用の台紙を作ります。文字数に合わせて自動で大きさを調整。
          <strong>
            入力した名前はこの端末の中だけで処理され、送信しません。
          </strong>
        </p>

        <div className="studio">
          {/* ---------------- 入力レール ---------------- */}
          <div className="rail">
            <section className="slip" aria-labelledby="s1">
              <h2 id="s1">
                <span className="num">1</span>おなまえ
              </h2>
              <label className="field">
                <span className="label">
                  なまえ（ひらがな・漢字どちらでも）
                </span>
                <input
                  className="input"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="やまだ はなこ"
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span className="label">
                  フリガナ（任意・小さく上に入ります）
                </span>
                <input
                  className="input"
                  value={furigana}
                  onChange={(e) => setFurigana(e.target.value)}
                  placeholder="ヤマダ ハナコ"
                  autoComplete="off"
                />
              </label>
            </section>

            <section className="slip" aria-labelledby="s2">
              <h2 id="s2">
                <span className="num">2</span>持ち物と枚数
              </h2>
              <div className="items">
                {items.map((r) => (
                  <div className="item-row" key={r.id}>
                    <input
                      className="input"
                      value={r.name}
                      onChange={(e) =>
                        updateItem(r.id, { name: e.target.value })
                      }
                      placeholder="えんぴつ"
                      aria-label="持ち物の名前"
                      autoComplete="off"
                    />
                    <input
                      className="input count"
                      type="number"
                      min={1}
                      max={999}
                      value={r.count}
                      onChange={(e) =>
                        updateItem(r.id, {
                          count: safeInt(e.target.value, 1, 1, 999),
                        })
                      }
                      aria-label="枚数"
                    />
                    <button
                      className="icon-btn"
                      onClick={() => removeItem(r.id)}
                      aria-label="この持ち物を削除"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="add-item"
                onClick={() => setItems((rows) => [...rows, newRow("", 8)])}
              >
                ＋ 持ち物を追加
              </button>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--ink-soft)",
                  marginTop: "0.55rem",
                }}
              >
                持ち物を空にすると、名前だけのラベルでシートを敷き詰めます。
              </p>
            </section>

            <section className="slip" aria-labelledby="s3">
              <h2 id="s3">
                <span className="num">3</span>シートを選ぶ
              </h2>
              <div
                className="sheet-picker"
                role="group"
                aria-label="ラベルシート"
              >
                {SHEETS.map((s) => (
                  <button
                    key={s.id}
                    className="sheet-opt"
                    aria-pressed={s.id === sheetId}
                    onClick={() => setSheetId(s.id)}
                  >
                    <MiniGrid sheet={s} />
                    <span className="t">{s.name}</span>
                    <span className="d">{s.note}</span>
                  </button>
                ))}
              </div>

              {baseSheet.freeform && (
                <div className="free-grid" style={{ marginTop: "0.7rem" }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span className="label">列（横）</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={FREE_MAX_COLS}
                      value={freeCols}
                      onChange={(e) =>
                        setFreeCols(
                          safeInt(e.target.value, 1, 1, FREE_MAX_COLS),
                        )
                      }
                    />
                  </label>
                  <label className="field" style={{ margin: 0 }}>
                    <span className="label">段（縦）</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={FREE_MAX_ROWS}
                      value={freeRows}
                      onChange={(e) =>
                        setFreeRows(
                          safeInt(e.target.value, 1, 1, FREE_MAX_ROWS),
                        )
                      }
                    />
                  </label>
                </div>
              )}

              <div style={{ marginTop: "0.8rem" }}>
                <span className="label" style={{ fontWeight: 700 }}>
                  位置の微調整（試し刷りがずれる時）
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: "0.8rem",
                    marginTop: "0.3rem",
                  }}
                >
                  <span className="nudge">
                    右へ
                    <input
                      className="input"
                      type="number"
                      step={0.5}
                      value={offsetX}
                      onChange={(e) =>
                        setOffsetX(safeNum(e.target.value, 0, -30, 30))
                      }
                      aria-label="横方向の微調整mm"
                    />
                    mm
                  </span>
                  <span className="nudge">
                    下へ
                    <input
                      className="input"
                      type="number"
                      step={0.5}
                      value={offsetY}
                      onChange={(e) =>
                        setOffsetY(safeNum(e.target.value, 0, -30, 30))
                      }
                      aria-label="縦方向の微調整mm"
                    />
                    mm
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* ---------------- プレビュー ---------------- */}
          <div className="stage" id="stage" tabIndex={-1}>
            <div className="stage-bar">
              <span className="meta">
                合計 <b>{totalLabels}</b> 枚 / シート <b>{needSheets}</b> 枚
                {needSheets > MAX_SHEETS && (
                  <span className="warn">
                    {" "}
                    ⚠ 一度に扱えるのは{MAX_SHEETS}枚まで（残り
                    {needSheets - MAX_SHEETS}
                    枚は枚数を分けて印刷してください）
                  </span>
                )}
              </span>
              <span className="spacer" />
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
                disabled={!hasName}
                title={
                  hasName ? "印刷（PDFで保存もできます）" : "先に名前を入力"
                }
              >
                🖨 印刷 / PDFで保存
              </button>
            </div>

            <div className="paper-stage" ref={stageRef}>
              {hasName ? (
                <div id="print-area">
                  <div className="sheet-scaler">
                    {sheetsCells.map((cells, i) => (
                      <div
                        key={i}
                        className={
                          "print-sheet" +
                          (i < renderSheets - 1 ? " page-break" : "")
                        }
                        // 外側は「縮小後の実寸」を占めるレイアウト箱（transform は
                        // レイアウト高さに影響しないため、箱側で高さを確保して隙間を防ぐ）。
                        style={{
                          width: scaledW,
                          height: scaledH,
                          marginBottom: i < renderSheets - 1 ? 16 : 0,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          className="sheet-transform"
                          style={{
                            transform: `scale(${scale})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <SheetView
                            sheet={sheet}
                            cells={cells}
                            showPeel={i === 0}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="empty-hint">
                  ① に名前を入れると、ここに印刷用の台紙が現れます。
                  <br />
                  まずは「やまだ はなこ」で試してみてください。
                </p>
              )}
            </div>
          </div>
        </div>

        <section className="checklist">
          <h2>印刷まえのチェック</h2>
          <ul>
            <li>プリンタの用紙は選んだシート（またはA4普通紙）と同じか</li>
            <li>
              印刷設定の倍率は
              <b>「実際のサイズ / 100%」</b>
              にして、「用紙に合わせる」は外す（縮小されると位置がずれます）
            </li>
            <li>
              本番の前に普通紙で試し刷りして、ずれたら「位置の微調整」で合わせる
            </li>
            <li>ラベルシートは印刷後、破線に沿ってはがして貼る</li>
          </ul>
        </section>

        <footer className="foot">
          おなまえ工房 — 入園・入学の名前つけを時短する無料ツール。
          入力内容はこの端末内でのみ処理し、サーバーへ送信しません。
        </footer>
      </div>
    </>
  );
}

/** 実寸1シートを絶対配置セルで描く（mm 指定・印刷時は等倍）。 */
function SheetView({
  sheet,
  cells,
  showPeel,
}: {
  sheet: LabelSheet;
  cells: PlacedCell[];
  showPeel: boolean;
}) {
  return (
    <div
      className="sheet"
      style={{
        width: `${sheet.page.w}mm`,
        height: `${sheet.page.h}mm`,
      }}
    >
      {showPeel && <span className="peel" aria-hidden="true" />}
      {cells.map((c, i) => (
        <div
          key={i}
          className="cell"
          style={{
            left: `${c.x}mm`,
            top: `${c.y}mm`,
            width: `${c.w}mm`,
            height: `${c.h}mm`,
            borderRadius: `${c.radius}mm`,
          }}
        >
          {c.content.furigana && (
            <span className="fg" style={{ fontSize: `${c.furiganaSize}mm` }}>
              {c.content.furigana}
            </span>
          )}
          <span className="owner" style={{ fontSize: `${c.ownerSize}mm` }}>
            {c.content.owner}
          </span>
          {c.content.item && (
            <span className="item" style={{ fontSize: `${c.itemSize}mm` }}>
              {c.content.item}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** シート選択カードの実寸ミニプレビュー（列×行のグリッド見本）。 */
function MiniGrid({ sheet }: { sheet: LabelSheet }) {
  const cols = Math.min(sheet.cols, 6);
  const rows = Math.min(sheet.rows, 6);
  return (
    <span
      className="mini"
      aria-hidden="true"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

/** シートの余白に X/Y オフセットを足した新しい定義を返す（印刷位置の微調整）。 */
function applyOffset(sheet: LabelSheet, dx: number, dy: number): LabelSheet {
  if (!dx && !dy) return sheet;
  return {
    ...sheet,
    margin: {
      left: sheet.margin.left + (Number.isFinite(dx) ? dx : 0),
      top: sheet.margin.top + (Number.isFinite(dy) ? dy : 0),
    },
  };
}
