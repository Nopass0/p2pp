"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/_components/auth-provider";

export function LoginForm() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    login: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log("Submitting login form:", formData); // Add this line for debugging

    try {
      await login(formData.login, formData.password);
      console.log("Login successful"); // Add this line for debugging
      toast({
        title: "Login successful",
        description: "You have been logged in successfully.",
      });
    } catch (error) {
      console.error("Login error:", error); // Add this line for debugging
      setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
      toast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
