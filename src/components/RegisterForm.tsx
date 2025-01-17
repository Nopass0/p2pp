"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    login: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const registerMutation = api.auth.register.useMutation();
  const loginMutation = api.auth.login.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting registration form:", formData);

    try {
      const registerResult = await registerMutation.mutateAsync(formData);
      console.log("Registration successful:", registerResult);

      const loginResult = await loginMutation.mutateAsync({
        login: formData.login,
        password: formData.password,
      });
      console.log("Auto login successful:", loginResult);

      toast({
        title: "Registration successful",
        description: "Your account has been created and you're now logged in.",
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Registration or login failed:", error);
      toast({
        title: "Registration failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login">Login</Label>
        <Input
          id="login"
          name="login"
          type="text"
          required
          onChange={handleInputChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          onChange={handleInputChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name (optional)</Label>
        <Input
          id="firstName"
          name="firstName"
          type="text"
          onChange={handleInputChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name (optional)</Label>
        <Input
          id="lastName"
          name="lastName"
          type="text"
          onChange={handleInputChange}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={registerMutation.isLoading || loginMutation.isLoading}
      >
        {registerMutation.isLoading || loginMutation.isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Register"
        )}
      </Button>
      {(registerMutation.error || loginMutation.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {registerMutation.error?.message || loginMutation.error?.message}
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
