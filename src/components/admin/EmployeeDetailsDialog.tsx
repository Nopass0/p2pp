"use client"

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

export function EmployeeDetailsDialog({
  isOpen,
  onClose,
  employee,
  fromDate,
  toDate,
  onDateChange,
}: EmployeeDetailsDialogProps) {
  if (!employee) return null

  // Calculate statistics
  const matchedTransactions = (employee.matchTransactions || []).filter((tx: any) => {
    const p2pDate = tx.P2PTransaction?.completedAt ? new Date(tx.P2PTransaction.completedAt) : null;
    const gateDate = tx.GateTransaction?.approvedAt ? new Date(tx.GateTransaction.approvedAt) : null;
    
    return (p2pDate && p2pDate >= fromDate && p2pDate <= toDate) ||
           (gateDate && gateDate >= fromDate && gateDate <= toDate);
  })

  const grossExpense = matchedTransactions.reduce((sum: number, tx: any) => 
    sum + (tx.P2PTransaction?.amount ?? 0), 0)
  
  const grossIncome = matchedTransactions.reduce((sum: number, tx: any) => 
    sum + (tx.GateTransaction?.totalUsdt ?? 0), 0)
  
  const commission = 1.009;

  const grossProfit = (grossIncome * commission) - grossExpense
  const profitPercentage = grossExpense ? (grossProfit / grossExpense) * 100 : 0
  const matchedCount = matchedTransactions.length
  const profitPerOrder = matchedCount ? grossProfit / matchedCount : 0
  const expensePerOrder = matchedCount ? grossExpense / matchedCount : 0

  const unmatchedP2PTransactions = (employee.P2PTransaction || []).filter(
    (tx: any) => 
      !(employee.matchTransactions || []).some((match: any) => match.p2pTxId === tx.id) &&
      new Date(tx.createdAt) >= fromDate && 
      new Date(tx.createdAt) <= toDate
  )

  const unmatchedGateTransactions = (employee.gateTransactions || []).filter(
    (tx: any) => 
      !(employee.matchTransactions || []).some((match: any) => match.gateTxId === tx.id) &&
      new Date(tx.createdAt) >= fromDate && 
      new Date(tx.createdAt) <= toDate
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Детальная статистика: {employee.firstName} {employee.lastName}
          </DialogTitle>
          <div className="flex gap-4 mt-4">
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
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
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
            <TabsTrigger value="matched">Заметченные транзакции</TabsTrigger>
            <TabsTrigger value="unmatched-p2p">Незаметченные P2P</TabsTrigger>
            <TabsTrigger value="unmatched-gate">Незаметченные Gate</TabsTrigger>
          </TabsList>

          <TabsContent value="matched">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата (P2P/IDEX)</TableHead>
                    <TableHead>Телефон (P2P)</TableHead>
                    <TableHead>ID Idex</TableHead>
                    <TableHead>Сумма P2P (И сумма с комиссией)</TableHead>
                    <TableHead>Сумма Gate</TableHead>
                    <TableHead>Прибыль</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {tx.P2PTransaction?.completedAt ? format(new Date(tx.P2PTransaction.completedAt), "dd.MM.yyyy HH:mm") : 'N/A'} /
                        {tx.GateTransaction?.approvedAt ? format(new Date(tx.GateTransaction.approvedAt), "dd.MM.yyyy HH:mm") : 'N/A'}
                      </TableCell>
                      <TableCell>{tx.P2PTransaction?.currentTgPhone ?? 'N/A'}</TableCell>
                      <TableCell>{tx.GateTransaction?.idexId ?? 'N/A'}</TableCell>
                      <TableCell>{(tx.P2PTransaction?.amount ?? 0).toFixed(2)} USDT ({(tx.P2PTransaction?.amount  * commission ?? 0).toFixed(2)} USDT)</TableCell>
                      <TableCell>{(tx.GateTransaction?.totalUsdt ?? 0).toFixed(2)} USDT</TableCell>
                      <TableCell>
                        {((tx.GateTransaction?.totalUsdt ?? 0) - (tx.P2PTransaction?.amount ?? 0)).toFixed(2)} USDT
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unmatched-p2p">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatchedP2PTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                      <TableCell>{tx.telegramId ?? 'N/A'}</TableCell>
                      <TableCell>{(tx.amount ?? 0).toFixed(2)} USDT</TableCell>
                      <TableCell>{tx.status ?? 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unmatched-gate">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>ID транзакции</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatchedGateTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                      <TableCell>{tx.transactionId ?? 'N/A'}</TableCell>
                      <TableCell>{(tx.amount ?? 0).toFixed(2)} USDT</TableCell>
                      <TableCell>{tx.status ?? 'N/A'}</TableCell>
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
