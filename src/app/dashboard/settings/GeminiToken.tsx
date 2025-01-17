import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export function GeminiTokenCard() {
  const [studentToken, setStudentToken] = useState("");
  const { toast } = useToast();
  const utils = api.useContext();

  //on load
  useEffect(() => {
    //@ts-ignore

    const getToken = utils.gemini.getUserGeminiToken.fetch();
    //@ts-ignore
    getToken.then((data) => {
      setStudentToken(data.token);
    });
  }, []);

  //@ts-ignore
  const { mutate: setGeminiToken, isLoading } =
    api.gemini.setUserGeminiToken.useMutation({
      //@ts-ignore

      onSuccess: () => {
        toast({
          title: "Токен сохранен",
          description: "Токен студента успешно сохранен.",
        });
        setStudentToken("");
      },
      onError: (error) => {
        toast({
          title: "Ошибка сохранения",
          description: error.message || "Не удалось сохранить токен студента.",
          variant: "destructive",
        });
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    //@ts-ignore

    setGeminiToken({ key: studentToken.trim() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Токен студента для подключения к Gemini</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Введите токен студента"
              value={studentToken}
              onChange={(e) => setStudentToken(e.target.value)}
            />
          </div>
          <div>
            {/* @ts-ignore */}

            <Button type="submit" disabled={isLoading || !studentToken.trim()}>
              {isLoading ? "Сохранение..." : "Сохранить токен"}
            </Button>
            <Link href="https://aistudio.google.com/apikey" className="ml-2">
              {/* @ts-ignore */}

              <Button variant="outline">Получить токен</Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
