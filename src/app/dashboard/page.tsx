import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, DollarSign, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return redirect("/login");
  }

  const { user } = session;

  // Примерные данные (в реальном приложении эти данные должны приходить с сервера)
  const orderCount = 42;
  const salary = 1500;
  const workHours = { start: "09:00", end: "18:00" };

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Добро пожаловать, {user.firstName} {user.lastName}!
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Количество заказов
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderCount}</div>
            <p className="text-xs text-muted-foreground">
              Всего обработано заказов
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Заработная плата
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salary}</div>
            <p className="text-xs text-muted-foreground">
              Обновляется каждые 3 часа
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Часы работы</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workHours.start} - {workHours.end}
            </div>
            <p className="text-xs text-muted-foreground">
              Сегодняшняя активность
            </p>
          </CardContent>
        </Card>
      </div>
      {/* <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          Telegram ID: {user.telegramId}
        </p>
        {user.isAdmin && (
          <Badge variant="outline" className="mt-2">
            Администратор
          </Badge>
        )}
      </div> */}
    </div>
  );
}
