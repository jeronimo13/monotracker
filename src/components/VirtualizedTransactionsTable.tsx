import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Filters, Transaction } from "../types";
import {
  formatAmount,
  formatOriginalAmount,
  formatDate,
  formatDateHeader,
  getCurrencyCode,
} from "../utils/formatters";
import Tooltip from "./Tooltip";

interface VirtualizedTransactionsTableProps {
  sortedDates: string[];
  groupedTransactions: Record<string, Transaction[]>;
  dateSortDirection: "asc" | "desc";
  onToggleDateSort: () => void;
  onAddFilter: (type: keyof Filters, value: string) => void;
  getMccDescription: (mccCode: number) => string;
}

type VirtualRow =
  | {
      id: string;
      kind: "date";
      dateKey: string;
      estimatedHeight: number;
    }
  | {
      id: string;
      kind: "transaction";
      transaction: Transaction;
      indexInDate: number;
      estimatedHeight: number;
    };

const DATE_HEADER_ESTIMATED_HEIGHT = 28;
const TRANSACTION_ESTIMATED_HEIGHT = 62;
const OVERSCAN_ROWS = 20;

const findRowIndexByOffset = (offsets: number[], targetOffset: number): number => {
  const rowCount = offsets.length - 1;
  if (rowCount <= 0) {
    return 0;
  }

  let low = 0;
  let high = rowCount - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid + 1] <= targetOffset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.min(Math.max(low, 0), rowCount - 1);
};

const VirtualizedTransactionsTable: React.FC<VirtualizedTransactionsTableProps> = ({
  sortedDates,
  groupedTransactions,
  dateSortDirection,
  onToggleDateSort,
  onAddFilter,
  getMccDescription,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const virtualRows = useMemo(() => {
    const rows: VirtualRow[] = [];

    sortedDates.forEach((dateKey) => {
      rows.push({
        id: `date-${dateKey}`,
        kind: "date",
        dateKey,
        estimatedHeight: DATE_HEADER_ESTIMATED_HEIGHT,
      });

      const transactionsForDate = groupedTransactions[dateKey] || [];
      transactionsForDate.forEach((transaction, indexInDate) => {
        rows.push({
          id: `tx-${transaction.id}`,
          kind: "transaction",
          transaction,
          indexInDate,
          estimatedHeight: TRANSACTION_ESTIMATED_HEIGHT,
        });
      });
    });

    return rows;
  }, [sortedDates, groupedTransactions]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const syncViewportMetrics = () => {
      setViewportHeight(scrollContainer.clientHeight);
      setScrollTop(scrollContainer.scrollTop);
    };

    const handleScroll = () => {
      setScrollTop(scrollContainer.scrollTop);
    };

    syncViewportMetrics();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      syncViewportMetrics();
    });
    resizeObserver.observe(scrollContainer);

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const offsets = useMemo(() => {
    const nextOffsets = new Array<number>(virtualRows.length + 1);
    nextOffsets[0] = 0;

    for (let index = 0; index < virtualRows.length; index += 1) {
      const row = virtualRows[index];
      const measuredHeight = measuredHeightsRef.current.get(row.id);
      const rowHeight = measuredHeight ?? row.estimatedHeight;
      nextOffsets[index + 1] = nextOffsets[index] + rowHeight;
    }

    return nextOffsets;
  }, [virtualRows, layoutVersion]);

  const totalHeight = offsets[offsets.length - 1] ?? 0;

  const {
    visibleRows,
    topSpacerHeight,
    bottomSpacerHeight,
  } = useMemo(() => {
    if (virtualRows.length === 0) {
      return {
        visibleRows: [] as VirtualRow[],
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const viewportBottom = scrollTop + Math.max(viewportHeight, 1);
    const firstVisibleIndex = findRowIndexByOffset(offsets, scrollTop);
    const lastVisibleIndex = findRowIndexByOffset(offsets, viewportBottom);

    const startIndex = Math.max(0, firstVisibleIndex - OVERSCAN_ROWS);
    const endIndex = Math.min(virtualRows.length - 1, lastVisibleIndex + OVERSCAN_ROWS);

    const topHeight = offsets[startIndex] ?? 0;
    const bottomHeight = Math.max(totalHeight - (offsets[endIndex + 1] ?? totalHeight), 0);

    return {
      visibleRows: virtualRows.slice(startIndex, endIndex + 1),
      topSpacerHeight: topHeight,
      bottomSpacerHeight: bottomHeight,
    };
  }, [virtualRows, offsets, scrollTop, viewportHeight, totalHeight]);

  const measureRow = useCallback((rowId: string, rowElement: HTMLTableRowElement | null) => {
    if (!rowElement) {
      return;
    }

    const measuredHeight = Math.ceil(rowElement.getBoundingClientRect().height);
    if (measuredHeight <= 0) {
      return;
    }

    const previousHeight = measuredHeightsRef.current.get(rowId);
    if (previousHeight !== measuredHeight) {
      measuredHeightsRef.current.set(rowId, measuredHeight);
      setLayoutVersion((value) => value + 1);
    }
  }, []);

  return (
    <div ref={scrollContainerRef} className="overflow-y-auto flex-1">
      <table className="min-w-full divide-y divide-gray-200 tabular-nums">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[1%] whitespace-nowrap">
              <button
                type="button"
                onClick={onToggleDateSort}
                className="inline-flex items-center gap-1 hover:text-gray-700"
                title={`Сортування за датою: ${
                  dateSortDirection === "desc"
                    ? "спочатку новіші"
                    : "спочатку старіші"
                }`}
                aria-label={`Змінити сортування за датою. Зараз: ${
                  dateSortDirection === "desc"
                    ? "спочатку новіші"
                    : "спочатку старіші"
                }`}
              >
                <span>Дата</span>
                <span className="text-[10px] leading-none">
                  {dateSortDirection === "desc" ? "▼" : "▲"}
                </span>
              </button>
            </th>
            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Опис
            </th>
            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              MCC
            </th>
            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Категорія
            </th>
            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Джерело (accountId)
            </th>
            <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Сума
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {topSpacerHeight > 0 && (
            <tr aria-hidden="true">
              <td colSpan={6} style={{ height: `${topSpacerHeight}px`, padding: 0, border: "none" }} />
            </tr>
          )}

          {visibleRows.map((row) => {
            if (row.kind === "date") {
              return (
                <tr
                  key={row.id}
                  className="bg-gray-100"
                  ref={(rowElement) => {
                    measureRow(row.id, rowElement);
                  }}
                >
                  <td colSpan={6} className="px-3 py-1 text-xs font-medium text-gray-900">
                    {formatDateHeader(row.dateKey)}
                  </td>
                </tr>
              );
            }

            const transaction = row.transaction;
            const rowClassName =
              row.indexInDate % 2 === 0
                ? "bg-white hover:bg-gray-100"
                : "bg-gray-50 hover:bg-gray-100";

            return (
              <tr
                key={row.id}
                className={rowClassName}
                ref={(rowElement) => {
                  measureRow(row.id, rowElement);
                }}
              >
                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">
                  <div className="flex items-center space-x-0.5">
                    <span>{formatDate(transaction.time)}</span>
                    {transaction.hold && (
                      <Tooltip content="Транзакція утримана (не завершена)">
                        <span className="text-yellow-600 text-xs">⏳</span>
                      </Tooltip>
                    )}
                    {(transaction.receiptId || transaction.invoiceId) && (
                      <Tooltip content={`Є чек/рахунок: ${transaction.receiptId || transaction.invoiceId}`}>
                        <span className="text-blue-600 text-xs">🧾</span>
                      </Tooltip>
                    )}
                    {transaction.counterEdrpou && (
                      <Tooltip content={`Бізнес транзакція: ЄДРПОУ ${transaction.counterEdrpou}`}>
                        <span className="text-purple-600 text-xs">💼</span>
                      </Tooltip>
                    )}
                    {transaction.counterIban && (
                      <Tooltip content={`Переказ: ${transaction.counterIban}`}>
                        <span className="text-green-600 text-xs">🏦</span>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-900">
                  <div>
                    <Tooltip
                      content={[
                        `Опис: ${transaction.description}`,
                        transaction.comment && `Коментар: ${transaction.comment}`,
                        transaction.receiptId && `ID чеку: ${transaction.receiptId}`,
                        transaction.invoiceId && `ID рахунку: ${transaction.invoiceId}`,
                        transaction.originalMcc !== transaction.mcc && `Оригінальний MCC: ${transaction.originalMcc}`,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                    >
                      <button
                        onClick={() => onAddFilter("description", transaction.description)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                      >
                        {transaction.description}
                      </button>
                    </Tooltip>
                    {transaction.comment && (
                      <div className="text-gray-500 text-xs">
                        {transaction.comment}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-500">
                  <div>
                    <button
                      onClick={() => onAddFilter("mcc", transaction.mcc.toString())}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {transaction.mcc || "-"}
                    </button>
                    {getMccDescription(transaction.mcc) && (
                      <Tooltip content={getMccDescription(transaction.mcc)} className="ml-1">
                        <div className="text-xs text-gray-400 truncate max-w-32 pointer-events-none">
                          {getMccDescription(transaction.mcc)}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-xs">
                  {transaction.category ? (
                    <button
                      onClick={() => onAddFilter("category", transaction.category || "")}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 transition-colors cursor-pointer"
                    >
                      {transaction.category}
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-500">
                  <button
                    onClick={() => onAddFilter("source", transaction.accountId)}
                    className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    title={`Фільтрувати за accountId: ${transaction.accountId}`}
                  >
                    {transaction.accountId}
                  </button>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-xs text-right tabular-nums">
                  <Tooltip
                    content={[
                      `Сума: ${formatAmount(transaction.amount)}`,
                      `Залишок після: ${formatAmount(transaction.balance)}`,
                      transaction.commissionRate > 0 && `Комісія: ${transaction.commissionRate}%`,
                      transaction.cashbackAmount > 0 && `Кешбек: ${formatAmount(transaction.cashbackAmount)}`,
                      transaction.operationAmount !== transaction.amount &&
                        `В валюті операції: ${formatOriginalAmount(transaction.operationAmount)} ${getCurrencyCode(transaction.currencyCode)}`,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  >
                    <span className="cursor-help">
                      <span
                        className={`font-medium ${
                          transaction.amount > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {formatAmount(transaction.amount)}
                      </span>
                      {transaction.operationAmount !== transaction.amount && (
                        <span className="text-gray-500 ml-1.5">
                          ({transaction.operationAmount > 0 ? "+" : ""}
                          {formatOriginalAmount(transaction.operationAmount)}{" "}
                          {getCurrencyCode(transaction.currencyCode)})
                        </span>
                      )}
                      {transaction.cashbackAmount > 0 && (
                        <span className="text-green-500 ml-1.5">
                          +{formatAmount(transaction.cashbackAmount)} CB
                        </span>
                      )}
                    </span>
                  </Tooltip>
                </td>
              </tr>
            );
          })}

          {bottomSpacerHeight > 0 && (
            <tr aria-hidden="true">
              <td colSpan={6} style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: "none" }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VirtualizedTransactionsTable;
