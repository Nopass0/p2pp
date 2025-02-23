"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

interface EmployeeDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  fromDate: Date;
  toDate: Date;
  onDateChange: (from: Date, to: Date) => void;
}

/** Хелпер для вычисления цвета по строке */
function hashToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/** Отображение телефонной метки */
const PhoneBadge = ({ phone }: { phone: string }) => {
  if (!phone) return null;
  const color = hashToColor(phone);
  return (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        backgroundColor: color,
        borderRadius: "50%",
        marginRight: "5px",
        border: "2px solid rgba(0, 0, 0, 0.4)",
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.2)",
      }}
    />
  );
};

/** Отображение метки для IDEX */
const IdexBadge = ({ idex }: { idex: string }) => {
  if (!idex) return null;
  const color = hashToColor(idex);
  return (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        backgroundColor: color,
        borderRadius: "50%",
        marginRight: "5px",
        border: "2px solid rgba(0, 0, 0, 0.4)",
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.2)",
      }}
    />
  );
};

/** Форматированный вывод даты и времени */
interface FormattedDateTimeProps {
  date?: string | Date | null;
}
const FormattedDateTime = ({ date }: FormattedDateTimeProps) => {
  if (!date) return <span>N/A</span>;
  const d = new Date(date);
  return (
    <span className="inline-flex items-center">
      <span>{format(d, "d MMMM yyyy'г.'", { locale: ru })}</span>
      <span className="ml-2 inline-block bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
        {format(d, "HH:mm")}
      </span>
    </span>
  );
};

/** Универсальная функция сортировки по дате */
const sortTransactionsByDate = (
  txs: any[],
  dateGetter: (tx: any) => Date,
  sortOrder: "asc" | "desc"
) => {
  return [...txs].sort((a, b) => {
    const dateA = dateGetter(a).getTime();
    const dateB = dateGetter(b).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });
};

/** Панель для отображения выбранных транзакций (слева и справа) */
function ManualMatchPanel({
  source,
  target,
  commission,
}: {
  source: { type: "p2p" | "gate"; tx: any };
  target: { type: "p2p" | "gate"; tx: any };
  commission: number;
}) {
  const formatDateTime = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return {
      date: format(d, "d MMMM yyyy'г.'", { locale: ru }),
      time: format(d, "HH:mm"),
    };
  };

  const getTxDetails = (item: { type: "p2p" | "gate"; tx: any }) => {
    const { type, tx } = item;
    let dateTime = "";
    let id = "";
    let usdt = "";
    let rub = "";
    if (type === "p2p") {
      const dt = tx.completedAt ? tx.completedAt : tx.createdAt;
      const { date, time } = formatDateTime(dt);
      dateTime = `${date} ${time}`;
      id = tx.id;
      usdt = (tx.amount * commission).toFixed(2);
      rub = tx.totalRub ? tx.totalRub.toFixed(2) : "N/A";
    } else {
      const dt = tx.approvedAt ? tx.approvedAt : tx.createdAt;
      const { date, time } = formatDateTime(dt);
      dateTime = `${date} ${time}`;
      id = tx.transactionId || tx.id;
      usdt = tx.totalUsdt ? tx.totalUsdt.toFixed(2) : "N/A";
      rub = tx.amountRub ? tx.amountRub.toFixed(2) : "N/A";
    }
    return { dateTime, id, usdt, rub };
  };

  const sourceDetails = getTxDetails(source);
  const targetDetails = getTxDetails(target);

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-4 p-3 border border-blue-500 dark:border-blue-300 rounded bg-blue-100 dark:bg-blue-800 text-sm">
      <div className="flex-1 p-2 border-r border-blue-300 dark:border-blue-200">
        <h4 className="font-semibold mb-1">Исходная транзакция ({source.type.toUpperCase()})</h4>
        <p><strong>Дата и время:</strong> {sourceDetails.dateTime}</p>
        <p><strong>ID:</strong> {sourceDetails.id}</p>
        <p><strong>Сумма USDT:</strong> {sourceDetails.usdt}</p>
        <p><strong>Сумма RUB:</strong> {sourceDetails.rub}</p>
      </div>
      <div className="flex-1 p-2">
        <h4 className="font-semibold mb-1">Выбранная транзакция ({target.type.toUpperCase()})</h4>
        <p><strong>Дата и время:</strong> {targetDetails.dateTime}</p>
        <p><strong>ID:</strong> {targetDetails.id}</p>
        <p><strong>Сумма USDT:</strong> {targetDetails.usdt}</p>
        <p><strong>Сумма RUB:</strong> {targetDetails.rub}</p>
      </div>
    </div>
  );
}

export function EmployeeDetailsDialog({
  isOpen,
  onClose,
  employee,
  fromDate,
  toDate,
  onDateChange,
}: EmployeeDetailsDialogProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("matched");

  // Получаем TRPC-контекст для инвалидации запроса
  const trpcContext = api.useContext();
  // Используем мутацию для создания мэтча
  const createMatch = api.admin.createTransactionMatch.useMutation();

  // Состояния для ручного скрепления
  const [attachmentMode, setAttachmentMode] = useState(false);
  const [manualAttachmentSource, setManualAttachmentSource] = useState<any>(null);
  const [manualAttachmentTarget, setManualAttachmentTarget] = useState<any>(null);

  if (!employee) return null;

  // Расчёт агрегированных показателей
  const matchedTransactions = (employee.matchTransactions || []).filter((tx: any) => {
    const p2pDate = tx.P2PTransaction?.completedAt ? new Date(tx.P2PTransaction.completedAt) : null;
    const gateDate = tx.GateTransaction?.approvedAt ? new Date(tx.GateTransaction.approvedAt) : null;
    return (p2pDate && p2pDate >= fromDate && p2pDate <= toDate) ||
           (gateDate && gateDate >= fromDate && gateDate <= toDate);
  });

  const commission = 1.009;
  const grossExpense =
    matchedTransactions.reduce((sum: number, tx: any) => sum + (tx.P2PTransaction?.amount ?? 0), 0) * commission;
  const grossIncome = matchedTransactions.reduce((sum: number, tx: any) => sum + (tx.GateTransaction?.totalUsdt ?? 0), 0);
  const grossProfit = grossIncome - grossExpense;
  const profitPercentage = grossExpense ? (grossProfit / grossExpense) * 100 : 0;
  const matchedCount = matchedTransactions.length;
  const profitPerOrder = matchedCount ? grossProfit / matchedCount : 0;
  const expensePerOrder = matchedCount ? grossExpense / matchedCount : 0;

  const aggregatedStats = { grossExpense, grossIncome, grossProfit, profitPercentage, matchedCount, profitPerOrder, expensePerOrder };

  const unmatchedP2PTransactions = (employee.P2PTransaction || []).filter((tx: any) =>
    !(employee.matchTransactions || []).some((match: any) => match.p2pTxId === tx.id) &&
    new Date(tx.completedAt) >= fromDate &&
    new Date(tx.completedAt) <= toDate
  );
  const unmatchedGateTransactions = (employee.gateTransactions || []).filter((tx: any) =>
    !(employee.matchTransactions || []).some((match: any) => match.gateTxId === tx.id) &&
    new Date(tx.createdAt) >= fromDate &&
    new Date(tx.createdAt) <= toDate
  );

  const allP2PTransactions = (employee.P2PTransaction || []).filter((tx: any) => {
    const txDate = tx.completedAt ? new Date(tx.completedAt) : new Date(tx.createdAt);
    return txDate >= fromDate && txDate <= toDate;
  });
  const allGateTransactions = (employee.gateTransactions || []).filter((tx: any) => {
    const txDate = tx.approvedAt ? new Date(tx.approvedAt) : new Date(tx.createdAt);
    return txDate >= fromDate && txDate <= toDate;
  });

  // Функции для получения дат транзакций
  const getMatchedTxDate = (tx: any) =>
    tx.P2PTransaction?.completedAt
      ? new Date(tx.P2PTransaction.completedAt)
      : tx.GateTransaction?.approvedAt
      ? new Date(tx.GateTransaction.approvedAt)
      : new Date(0);
  const getP2PTxDate = (tx: any) =>
    tx.completedAt ? new Date(tx.completedAt) : new Date(tx.createdAt);
  const getGateTxDate = (tx: any) =>
    tx.approvedAt ? new Date(tx.approvedAt) : new Date(tx.createdAt);

  // --- Функции ручного скрепления ---
  const initiateAttachment = (tx: any, type: "p2p" | "gate") => {
    setManualAttachmentSource({ type, tx });
    setAttachmentMode(true);
    setActiveTab(type === "p2p" ? "unmatched-gate" : "unmatched-p2p");
  };

  const selectTarget = (tx: any, type: "p2p" | "gate") => {
    if (manualAttachmentSource && manualAttachmentSource.type !== type) {
      setManualAttachmentTarget({ type, tx });
    }
  };

  const handleApplyAttachment = async () => {
    if (!manualAttachmentSource || !manualAttachmentTarget) return;
    let p2pTxId, gateTxId;
    if (manualAttachmentSource.type === "p2p") {
      p2pTxId = manualAttachmentSource.tx.id;
      gateTxId = manualAttachmentTarget.tx.id;
    } else {
      p2pTxId = manualAttachmentTarget.tx.id;
      gateTxId = manualAttachmentSource.tx.id;
    }

    // Check if either transaction is already matched
    const isP2PMatched = (employee.matchTransactions || []).some((match: any) => match.p2pTxId === p2pTxId);
    const isGateMatched = (employee.matchTransactions || []).some((match: any) => match.gateTxId === gateTxId);

    if (isP2PMatched || isGateMatched) {
      console.error("Одна или обе транзакции уже скреплены с другими транзакциями.");
      return;
    }

    try {
      await createMatch.mutateAsync({ p2pTxId, gateTxId });
      // Сброс режима скрепления
      setAttachmentMode(false);
      setManualAttachmentSource(null);
      setManualAttachmentTarget(null);
      // Обновляем данные: инвалидируем запрос, чтобы перезапросить обновлённые данные
      await trpcContext.admin.getEmployees.invalidate();
    } catch (error) {
      console.error("Ошибка при создании скрепления:", error);
    }
  };

  const handleCancelAttachment = () => {
    setAttachmentMode(false);
    setManualAttachmentSource(null);
    setManualAttachmentTarget(null);
  };
  // --- Конец функций ручного скрепления ---

  const sortedMatchedTransactions = sortTransactionsByDate(matchedTransactions, getMatchedTxDate, sortOrder);
  const sortedUnmatchedP2PTransactions = sortTransactionsByDate(unmatchedP2PTransactions, getP2PTxDate, sortOrder);
  const sortedUnmatchedGateTransactions = sortTransactionsByDate(unmatchedGateTransactions, getGateTxDate, sortOrder);
  const sortedAllP2PTransactions = sortTransactionsByDate(allP2PTransactions, getP2PTxDate, sortOrder);
  const sortedAllGateTransactions = sortTransactionsByDate(allGateTransactions, getGateTxDate, sortOrder);

  const filterData = (data: any[]) => {
    if (!searchQuery) return data;
    return data.filter(tx => JSON.stringify(tx).toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredMatchedTransactions = filterData(sortedMatchedTransactions);
  const filteredUnmatchedP2PTransactions = filterData(sortedUnmatchedP2PTransactions);
  const filteredUnmatchedGateTransactions = filterData(sortedUnmatchedGateTransactions);
  const filteredAllP2PTransactions = filterData(sortedAllP2PTransactions);
  const filteredAllGateTransactions = filterData(sortedAllGateTransactions);

  const handleExport = () => {
    let dataToExport: any[] = [];
    let headers: string[] = [];
    switch (activeTab) {
      case "matched":
        headers = [
          "Дата (P2P)",
          "Время (P2P)",
          "Дата (IDEX)",
          "Время (IDEX)",
          "Телефон (P2P)",
          "ID IDEX",
          "Сумма рублевая (P2P)",
          "Сумма рублевая (IDEX)",
          "Сумма P2P",
          "Сумма Gate",
          "Прибыль",
        ];
        dataToExport = filteredMatchedTransactions.map((tx: any) => {
          const p2pDate = tx.P2PTransaction?.completedAt ? new Date(tx.P2PTransaction.completedAt) : null;
          const gateDate = tx.GateTransaction?.approvedAt ? new Date(tx.GateTransaction.approvedAt) : null;
          return [
            p2pDate ? format(p2pDate, "d MMMM yyyy'г.'", { locale: ru }) : "N/A",
            p2pDate ? format(p2pDate, "HH:mm") : "N/A",
            gateDate ? format(gateDate, "d MMMM yyyy'г.'", { locale: ru }) : "N/A",
            gateDate ? format(gateDate, "HH:mm") : "N/A",
            tx.P2PTransaction?.currentTgPhone || "N/A",
            tx.GateTransaction?.idexId || "N/A",
            (tx.P2PTransaction?.totalRub ?? 0).toFixed(2),
            (tx.GateTransaction?.amountRub ?? 0).toFixed(2),
            (tx.P2PTransaction?.amount * commission ?? 0).toFixed(2),
            (tx.GateTransaction?.totalUsdt ?? 0).toFixed(2),
            ((tx.GateTransaction?.totalUsdt ?? 0) - (tx.P2PTransaction?.amount * commission ?? 0)).toFixed(2),
          ];
        });
        break;
      case "unmatched-p2p":
        headers = ["Дата", "Телефон", "Сумма", "Сумма рублевая", "Статус"];
        dataToExport = filteredUnmatchedP2PTransactions.map((tx: any) => {
          const d = getP2PTxDate(tx);
          return [
            d ? format(d, "d MMMM yyyy'г.' HH:mm", { locale: ru }) : "N/A",
            tx.currentTgPhone || "N/A",
            (tx.amount * commission ?? 0).toFixed(2),
            (tx.totalRub ?? 0).toFixed(2),
            tx.status || "N/A",
          ];
        });
        break;
      case "unmatched-gate":
        headers = ["Дата", "ID транзакции", "ID IDEX", "Сумма", "Сумма рублевая", "Статус"];
        dataToExport = filteredUnmatchedGateTransactions.map((tx: any) => {
          const d = getGateTxDate(tx);
          return [
            d ? format(d, "d MMMM yyyy'г.' HH:mm", { locale: ru }) : "N/A",
            tx.transactionId || "N/A",
            tx.idexId || "N/A",
            (tx.totalUsdt ?? 0).toFixed(2),
            (tx.totalRub ?? 0).toFixed(2),
            tx.status || "N/A",
          ];
        });
        break;
      case "all-p2p":
        headers = ["Дата", "Телефон", "Сумма", "Сумма рублевая", "Статус"];
        dataToExport = filteredAllP2PTransactions.map((tx: any) => {
          const d = tx.completedAt ? new Date(tx.completedAt) : new Date(tx.createdAt);
          return [
            d ? format(d, "d MMMM yyyy'г.' HH:mm", { locale: ru }) : "N/A",
            tx.currentTgPhone || "N/A",
            (tx.amount * commission).toFixed(2),
            (tx.totalRub ?? 0).toFixed(2),
            (employee.matchTransactions || []).some((match: any) => match.p2pTxId === tx.id)
              ? "Замечен"
              : "Не замечен",
          ];
        });
        break;
      case "all-gate":
        headers = ["Дата", "ID IDEX", "Сумма", "Статус"];
        dataToExport = filteredAllGateTransactions.map((tx: any) => {
          const d = tx.approvedAt ? new Date(tx.approvedAt) : new Date(tx.createdAt);
          return [
            d ? format(d, "d MMMM yyyy'г.' HH:mm", { locale: ru }) : "N/A",
            tx.idexId || "N/A",
            (tx.totalUsdt ?? 0).toFixed(2),
            (employee.matchTransactions || []).some((match: any) => match.gateTxId === tx.id)
              ? "Замечен"
              : "Не замечен",
          ];
        });
        break;
      default:
        break;
    }

    const csvContent =
      "\uFEFF" +
      headers.join("\t") +
      "\n" +
      dataToExport.map(row => row.join("\t")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTab}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Детальная статистика: {employee.firstName} {employee.lastName}
          </DialogTitle>
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <DateTimePicker date={fromDate} setDate={(date) => onDateChange(date, toDate)} label="С" />
            <DateTimePicker date={toDate} setDate={(date) => onDateChange(fromDate, date)} label="По" />
            <Button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} variant="secondary">
              Сортировать по дате: {sortOrder === "asc" ? "От меньшего к большему" : "От большего к меньшему"}
            </Button>
          </div>
        </DialogHeader>

        {/* Верхняя панель агрегированных показателей */}
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Валовый расход</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.grossExpense.toFixed(2)} USDT</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Валовый доход</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.grossIncome.toFixed(2)} USDT</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Валовая прибыль</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.grossProfit.toFixed(2)} USDT</div>
                <p className="text-xs text-muted-foreground">
                  {aggregatedStats.profitPercentage.toFixed(2)}% от выручки
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Метченные ордера</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregatedStats.matchedCount}</div>
                <p className="text-xs text-muted-foreground">
                  Ср. прибыль: {aggregatedStats.profitPerOrder.toFixed(2)} USDT
                </p>
                <p className="text-xs text-muted-foreground">
                  Ср. расход: {aggregatedStats.expensePerOrder.toFixed(2)} USDT
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Панель ручного скрепления */}
        {attachmentMode && manualAttachmentSource && (
          <div className="mb-3">
            {manualAttachmentTarget ? (
              <ManualMatchPanel
                source={manualAttachmentSource}
                target={manualAttachmentTarget}
                commission={commission}
              />
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch gap-4 p-3 border border-blue-500 dark:border-blue-300 rounded bg-blue-100 dark:bg-blue-800 text-sm">
                <div className="flex-1 p-2 border-r border-blue-300 dark:border-blue-200">
                  <h4 className="font-semibold mb-1">
                    Исходная транзакция ({manualAttachmentSource.type.toUpperCase()})
                  </h4>
                  <p>
                    <strong>Дата и время:</strong>{" "}
                    {manualAttachmentSource.type === "p2p"
                      ? format(new Date(manualAttachmentSource.tx.completedAt || manualAttachmentSource.tx.createdAt), "d MMMM yyyy HH:mm", { locale: ru })
                      : format(new Date(manualAttachmentSource.tx.approvedAt || manualAttachmentSource.tx.createdAt), "d MMMM yyyy HH:mm", { locale: ru })}
                  </p>
                  <p>
                    <strong>ID:</strong>{" "}
                    {manualAttachmentSource.type === "p2p"
                      ? manualAttachmentSource.tx.id
                      : manualAttachmentSource.tx.transactionId || manualAttachmentSource.tx.id}
                  </p>
                  <p>
                    <strong>Сумма USDT:</strong>{" "}
                    {manualAttachmentSource.type === "p2p"
                      ? (manualAttachmentSource.tx.amount * commission).toFixed(2)
                      : manualAttachmentSource.tx.totalUsdt?.toFixed(2) || "N/A"}
                  </p>
                  <p>
                    <strong>Сумма RUB:</strong>{" "}
                    {manualAttachmentSource.type === "p2p"
                      ? manualAttachmentSource.tx.totalRub?.toFixed(2) || "N/A"
                      : manualAttachmentSource.tx.amountRub?.toFixed(2) || "N/A"}
                  </p>
                </div>
                <div className="flex-1 p-2 flex items-center justify-center">
                  <span>Выберите транзакцию для скрепления</span>
                </div>
              </div>
            )}
            <div className="mt-2">
              {manualAttachmentTarget && (
                <Button onClick={handleApplyAttachment}>Применить скрепление</Button>
              )}
              <Button variant="destructive" onClick={handleCancelAttachment} className="ml-2">
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Вкладки, поиск и экспорт */}
        <Tabs defaultValue="matched" onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="matched">
                Метченные транзакции
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {filteredMatchedTransactions.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="unmatched-p2p">
                Незамэтченные P2P
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {filteredUnmatchedP2PTransactions.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="unmatched-gate">
                Незамэтченные Gate
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {filteredUnmatchedGateTransactions.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="all-p2p">
                Все P2P транзакции
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {filteredAllP2PTransactions.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="all-gate">
                Все IDEX транзакции
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {filteredAllGateTransactions.length}
                </span>
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleExport} variant="destructive">
                Экспорт .xls
              </Button>
            </div>
          </div>

          {/* Вкладка "Метченные транзакции" */}
          <TabsContent value="matched">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead>Дата (P2P/IDEX)</TableHead>
                    <TableHead>Телефон (P2P)</TableHead>
                    <TableHead>ID IDEX</TableHead>
                    <TableHead>Сумма рублевая (P2P / IDEX)</TableHead>
                    <TableHead>Сумма P2P</TableHead>
                    <TableHead>Сумма Gate</TableHead>
                    <TableHead>Прибыль</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatchedTransactions.map((tx: any, index: number) => (
                    <TableRow key={tx.id || `matched-${index}`} className="h-8">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {tx.P2PTransaction?.completedAt ? (
                            <FormattedDateTime date={tx.P2PTransaction.completedAt} />
                          ) : (
                            "N/A"
                          )}
                          {tx.GateTransaction?.approvedAt ? (
                            <FormattedDateTime date={tx.GateTransaction.approvedAt} />
                          ) : (
                            "N/A"
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.P2PTransaction?.currentTgPhone ? (
                          <div className="flex items-center">
                            <PhoneBadge phone={tx.P2PTransaction.currentTgPhone} />
                            <span>{tx.P2PTransaction.currentTgPhone}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.GateTransaction?.idexId ? (
                          <div className="flex items-center">
                            <IdexBadge idex={tx.GateTransaction.idexId} />
                            <span>{tx.GateTransaction.idexId}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span>{(tx.P2PTransaction?.totalRub ?? 0).toFixed(2)} RUB</span>
                          <span className="mx-2 border-l border-gray-300 h-4" />
                          <span>{(tx.GateTransaction?.amountRub ?? 0).toFixed(2)} RUB</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(tx.P2PTransaction?.amount * commission ?? 0).toFixed(2)} USDT
                      </TableCell>
                      <TableCell>
                        {(tx.GateTransaction?.totalUsdt ?? 0).toFixed(2)} USDT
                      </TableCell>
                      <TableCell>
                        {((tx.GateTransaction?.totalUsdt ?? 0) - (tx.P2PTransaction?.amount * commission ?? 0)).toFixed(2)} USDT
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Вкладка "Незамэтченные P2P" */}
          <TabsContent value="unmatched-p2p">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead>Дата</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Сумма рублевая</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnmatchedP2PTransactions.map((tx: any, index: number) => (
                    <TableRow key={tx.id || `unmatched-p2p-${index}`} className="h-8">
                      <TableCell>
                        <FormattedDateTime date={getP2PTxDate(tx)} />
                      </TableCell>
                      <TableCell>
                        {tx.currentTgPhone ? (
                          <div className="flex items-center">
                            <PhoneBadge phone={tx.currentTgPhone} />
                            <span>{tx.currentTgPhone}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{(tx.amount * commission ?? 0).toFixed(2)} USDT</TableCell>
                      <TableCell>{(tx.totalRub ?? 0).toFixed(2)} RUB</TableCell>
                      <TableCell>{tx.status ?? "N/A"}</TableCell>
                      <TableCell>
                        {!attachmentMode && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateAttachment(tx, "p2p");
                            }}
                          >
                            Скрепить вручную
                          </Button>
                        )}
                        {attachmentMode && manualAttachmentSource?.type === "p2p" && (
                          <Button disabled>Скрепить вручную</Button>
                        )}
                        {attachmentMode && manualAttachmentSource?.type !== "p2p" && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTarget(tx, "p2p");
                            }}
                          >
                            Выбрать
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Вкладка "Незамэтченные Gate" */}
          <TabsContent value="unmatched-gate">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead>Дата</TableHead>
                    <TableHead>ID транзакции</TableHead>
                    <TableHead>ID IDEX</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Сумма рублевая</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnmatchedGateTransactions.map((tx: any, index: number) => (
                    <TableRow key={tx.id || `unmatched-gate-${index}`} className="h-8">
                      <TableCell>
                        <FormattedDateTime date={getGateTxDate(tx)} />
                      </TableCell>
                      <TableCell>{tx.transactionId ?? "N/A"}</TableCell>
                      <TableCell>
                        {tx.idexId ? (
                          <div className="flex items-center">
                            <IdexBadge idex={tx.idexId} />
                            <span>{tx.idexId}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{(tx.totalUsdt ?? 0).toFixed(2)} USDT</TableCell>
                      <TableCell>{(tx.amountRub ?? 0).toFixed(2)} RUB</TableCell>
                      <TableCell>{tx.status ?? "N/A"}</TableCell>
                      <TableCell>
                        {!attachmentMode && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateAttachment(tx, "gate");
                            }}
                          >
                            Скрепить вручную
                          </Button>
                        )}
                        {attachmentMode && manualAttachmentSource?.type === "gate" && (
                          <Button disabled>Скрепить вручную</Button>
                        )}
                        {attachmentMode && manualAttachmentSource?.type !== "gate" && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTarget(tx, "gate");
                            }}
                          >
                            Выбрать
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Вкладка "Все P2P транзакции" */}
          <TabsContent value="all-p2p">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead>Дата</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Сумма рублевая</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllP2PTransactions.map((tx: any, index: number) => (
                    <TableRow key={tx.id || `all-p2p-${index}`} className="h-8">
                      <TableCell>
                        <FormattedDateTime date={tx.completedAt ? tx.completedAt : tx.createdAt} />
                      </TableCell>
                      <TableCell>
                        {tx.currentTgPhone ? (
                          <div className="flex items-center">
                            <PhoneBadge phone={tx.currentTgPhone} />
                            <span>{tx.currentTgPhone}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{(tx.amount * commission).toFixed(2)} USDT</TableCell>
                      <TableCell>{(tx.totalRub ?? 0).toFixed(2)} RUB</TableCell>
                      <TableCell>
                        {(employee.matchTransactions || []).some((match: any) => match.p2pTxId === tx.id)
                          ? (
                            <span className="bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
                              Замечен
                            </span>
                          )
                          : (
                            <span className="bg-yellow-500 text-white rounded-full px-2 py-0.5 text-xs">
                              Не замечен
                            </span>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Вкладка "Все IDEX транзакции" */}
          <TabsContent value="all-gate">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead>Дата</TableHead>
                    <TableHead>ID IDEX</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Сумма рублевая</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllGateTransactions.map((tx: any, index: number) => (
                    <TableRow key={tx.id || `all-gate-${index}`} className="h-8">
                      <TableCell>
                        <FormattedDateTime date={tx.approvedAt ? tx.approvedAt : tx.createdAt} />
                      </TableCell>
                      <TableCell>
                        {tx.idexId ? (
                          <div className="flex items-center">
                            <IdexBadge idex={tx.idexId} />
                            <span>{tx.idexId}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{(tx.totalUsdt ?? 0).toFixed(2)} USDT</TableCell>
                      <TableCell>{(tx.amountRub ?? 0).toFixed(2)} RUB</TableCell>
                      <TableCell>
                        {(employee.matchTransactions || []).some((match: any) => match.gateTxId === tx.id)
                          ? (
                            <span className="bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
                              Замечен
                            </span>
                          )
                          : (
                            <span className="bg-yellow-500 text-white rounded-full px-2 py-0.5 text-xs">
                              Не замечен
                            </span>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
