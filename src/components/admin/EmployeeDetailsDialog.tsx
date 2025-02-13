"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"

interface EmployeeDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  employee: any
  fromDate: Date
  toDate: Date
  onDateChange: (from: Date, to: Date) => void
}

/** Хелпер для вычисления цвета по строке */
function hashToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

/** Индикатор для телефонного номера – теперь стилизован так же, как и для id IDEX */
const PhoneBadge = ({ phone }: { phone: string }) => {
  if (!phone) return null
  const color = hashToColor(phone)
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
  )
}

/** Индикатор для id IDEX с прозрачным бордером и тонкой тенью */
const IdexBadge = ({ idex }: { idex: string }) => {
  if (!idex) return null
  const color = hashToColor(idex)
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
  )
}

/** Универсальная функция сортировки по дате.
 * @param txs Массив транзакций
 * @param dateGetter Функция, которая из транзакции возвращает дату
 * @param sortOrder Порядок сортировки: "asc" или "desc"
 */
const sortTransactionsByDate = (
  txs: any[],
  dateGetter: (tx: any) => Date,
  sortOrder: "asc" | "desc"
) => {
  return [...txs].sort((a, b) => {
    const dateA = dateGetter(a).getTime()
    const dateB = dateGetter(b).getTime()
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA
  })
}

export function EmployeeDetailsDialog({
  isOpen,
  onClose,
  employee,
  fromDate,
  toDate,
  onDateChange,
}: EmployeeDetailsDialogProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  if (!employee) return null

  // Вычисление статистики
  const matchedTransactions = (employee.matchTransactions || []).filter((tx: any) => {
    const p2pDate = tx.P2PTransaction?.completedAt ? new Date(tx.P2PTransaction.completedAt) : null
    const gateDate = tx.GateTransaction?.approvedAt ? new Date(tx.GateTransaction.approvedAt) : null

    return (p2pDate && p2pDate >= fromDate && p2pDate <= toDate) ||
           (gateDate && gateDate >= fromDate && gateDate <= toDate)
  })

  const commission = 1.009
  const grossExpense =
    matchedTransactions.reduce((sum: number, tx: any) => sum + (tx.P2PTransaction?.amount ?? 0), 0) * commission

  const grossIncome = matchedTransactions.reduce((sum: number, tx: any) => sum + (tx.GateTransaction?.totalUsdt ?? 0), 0)

  const grossProfit = grossIncome - grossExpense
  const profitPercentage = grossExpense ? (grossProfit / grossExpense) * 100 : 0
  const matchedCount = matchedTransactions.length
  const profitPerOrder = matchedCount ? grossProfit / matchedCount : 0
  const expensePerOrder = matchedCount ? grossExpense / matchedCount : 0

  const unmatchedP2PTransactions = (employee.P2PTransaction || []).filter((tx: any) =>
    !(employee.matchTransactions || []).some((match: any) => match.p2pTxId === tx.id) &&
    new Date(tx.createdAt) >= fromDate &&
    new Date(tx.createdAt) <= toDate
  )

  const unmatchedGateTransactions = (employee.gateTransactions || []).filter((tx: any) =>
    !(employee.matchTransactions || []).some((match: any) => match.gateTxId === tx.id) &&
    new Date(tx.createdAt) >= fromDate &&
    new Date(tx.createdAt) <= toDate
  )

  // Функции для получения даты из транзакций для сортировки
  const getMatchedTxDate = (tx: any) =>
    tx.P2PTransaction?.completedAt
      ? new Date(tx.P2PTransaction.completedAt)
      : tx.GateTransaction?.approvedAt
      ? new Date(tx.GateTransaction.approvedAt)
      : new Date(0)

  const getP2PTxDate = (tx: any) =>
    tx.completedAt ? new Date(tx.completedAt) : new Date(tx.createdAt)

  const getGateTxDate = (tx: any) =>
    tx.approvedAt ? new Date(tx.approvedAt) : new Date(tx.createdAt)

  // Применяем сортировку к массивам транзакций
  const sortedMatchedTransactions = sortTransactionsByDate(matchedTransactions, getMatchedTxDate, sortOrder)
  const sortedUnmatchedP2PTransactions = sortTransactionsByDate(unmatchedP2PTransactions, getP2PTxDate, sortOrder)
  const sortedUnmatchedGateTransactions = sortTransactionsByDate(unmatchedGateTransactions, getGateTxDate, sortOrder)
  const sortedAllP2PTransactions = sortTransactionsByDate(
    (employee.P2PTransaction || []).filter((tx: any) => {
      const txDate = tx.completedAt ? new Date(tx.completedAt) : new Date(tx.createdAt)
      return txDate >= fromDate && txDate <= toDate
    }),
    getP2PTxDate,
    sortOrder
  )
  const sortedAllGateTransactions = sortTransactionsByDate(
    (employee.gateTransactions || []).filter((tx: any) => {
      const txDate = tx.approvedAt ? new Date(tx.approvedAt) : new Date(tx.createdAt)
      return txDate >= fromDate && txDate <= toDate
    }),
    getGateTxDate,
    sortOrder
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Детальная статистика: {employee.firstName} {employee.lastName}
          </DialogTitle>
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <DateTimePicker
              date={fromDate}
              setDate={(date) => onDateChange(date, toDate)}
              label="С"
            />
            <DateTimePicker
              date={toDate}
              setDate={(date) => onDateChange(fromDate, date)}
              label="По"
            />
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-300"
            >
              Сортировать по дате: {sortOrder === "asc" ? "От меньшего к большему" : "От большего к меньшему"}
            </button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
          <div className="space-y-2">
            <div>Валовый расход: {grossExpense.toFixed(2)} USDT</div>
            <div>Валовый доход: {grossIncome.toFixed(2)} USDT</div>
            <div>Валовая прибыль: {grossProfit.toFixed(2)} USDT</div>
            <div>Процент от выручки: {profitPercentage.toFixed(2)}%</div>
          </div>
          <div className="space-y-2">
            <div>Количество метченных ордеров: {matchedCount}</div>
            <div>Средняя прибыль на ордер: {profitPerOrder.toFixed(2)} USDT</div>
            <div>Средний расход на ордер: {expensePerOrder.toFixed(2)} USDT</div>
          </div>
        </div>

        <Tabs defaultValue="matched">
          <TabsList>
            <TabsTrigger value="matched">Метченные транзакции</TabsTrigger>
            <TabsTrigger value="unmatched-p2p">Незаметченные P2P</TabsTrigger>
            <TabsTrigger value="unmatched-gate">Незаметченные Gate</TabsTrigger>
            <TabsTrigger value="all-p2p">Все P2P транзакции</TabsTrigger>
            <TabsTrigger value="all-gate">Все IDEX транзакции</TabsTrigger>
          </TabsList>

          {/* Метченные транзакции */}
          <TabsContent value="matched">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата (P2P/IDEX)</TableHead>
                    <TableHead>Телефон (P2P)</TableHead>
                    <TableHead>ID IDEX</TableHead>
                    <TableHead>Сумма рублевая (P2P/IDEX)</TableHead>
                    <TableHead>Сумма P2P</TableHead>
                    <TableHead>Сумма Gate</TableHead>
                    <TableHead>Прибыль</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMatchedTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {tx.P2PTransaction?.completedAt
                          ? format(new Date(tx.P2PTransaction.completedAt), "dd.MM.yyyy HH:mm")
                          : "N/A"}{" "}
                        /{" "}
                        {tx.GateTransaction?.approvedAt
                          ? format(new Date(tx.GateTransaction.approvedAt), "dd.MM.yyyy HH:mm")
                          : "N/A"}
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
                      <TableCell>{(tx.P2PTransaction?.totalRub).toFixed(2)}/{(tx.P2PTransaction?.amountRub).toFixed(2)} RUB</TableCell>
                      <TableCell>
                        {(tx.P2PTransaction?.amount * commission ?? 0).toFixed(2)} USDT
                      </TableCell>
                      <TableCell>
                        {(tx.GateTransaction?.totalUsdt ?? 0).toFixed(2)} USDT
                      </TableCell>
                      <TableCell>
                        {(
                          (tx.GateTransaction?.totalUsdt ?? 0) -
                          (tx.P2PTransaction?.amount * commission ?? 0)
                        ).toFixed(2)}{" "}
                        USDT
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Незаметченные P2P */}
          <TabsContent value="unmatched-p2p">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Сумма рублевая</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUnmatchedP2PTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(getP2PTxDate(tx), "dd.MM.yyyy HH:mm")}</TableCell>
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
                      <TableCell>{(tx.amount* commission ?? 0).toFixed(2)} USDT</TableCell>
                      <TableCell>{(tx.totalRub ?? 0).toFixed(2)} RUB</TableCell>
                      <TableCell>{tx.status ?? "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Незаметченные Gate */}
          <TabsContent value="unmatched-gate">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>ID транзакции</TableHead>
                    <TableHead>ID IDEX</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUnmatchedGateTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(getGateTxDate(tx), "dd.MM.yyyy HH:mm")}</TableCell>
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
                      <TableCell>{tx.status ?? "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Все P2P транзакции */}
          <TabsContent value="all-p2p">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Сумма рублевая</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAllP2PTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {tx.completedAt
                          ? format(new Date(tx.completedAt), "dd.MM.yyyy HH:mm")
                          : format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}
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
                      <TableCell>{(tx.amount ).toFixed(2)} RUB</TableCell>
                      <TableCell>
                        {(employee.matchTransactions || []).some((match: any) => match.p2pTxId === tx.id)
                          ? (
                            <span className="bg-green-500 text-white rounded-full px-2 py-1 text-xs">
                              Замечен
                            </span>
                          )
                          : (
                            <span className="bg-yellow-500 text-white rounded-full px-2 py-1 text-xs">
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

          {/* Все IDEX транзакции */}
          <TabsContent value="all-gate">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>ID IDEX</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAllGateTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {tx.approvedAt
                          ? format(new Date(tx.approvedAt), "dd.MM.yyyy HH:mm")
                          : format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}
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
                      <TableCell>
                        {(employee.matchTransactions || []).some((match: any) => match.gateTxId === tx.id)
                          ? (
                            <span className="bg-green-500 text-white rounded-full px-2 py-1 text-xs">
                              Замечен
                            </span>
                          )
                          : (
                            <span className="bg-yellow-500 text-white rounded-full px-2 py-1 text-xs">
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
  )
}
