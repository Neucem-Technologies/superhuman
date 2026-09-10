import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return <AuthScreen mode="login" />;
}
