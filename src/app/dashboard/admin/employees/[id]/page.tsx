import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EmployeeDetails } from "@/components/admin/EmployeeDetails";
import { EmployeeTransactions } from "@/components/admin/EmployeeTransactions";
import { EmployeeMetrics } from "@/components/admin/EmployeeMetrics";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

export default function EmployeeDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  //@ts-ignore

  const employeeId = parseInt(params.id);
  //@ts-ignore

  if (isNaN(employeeId)) {
    notFound();
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Детали сотрудника</h1>
      <DateRangePicker />
      <Suspense fallback={<div>Загрузка деталей сотрудника...</div>}>
        <EmployeeDetails employeeId={employeeId} />
      </Suspense>
      <Suspense fallback={<div>Загрузка метрик сотрудника...</div>}>
        <EmployeeMetrics employeeId={employeeId} />
      </Suspense>
      <Suspense fallback={<div>Загрузка транзакций сотрудника...</div>}>
        <EmployeeTransactions employeeId={employeeId} />
      </Suspense>
    </div>
  );
}
