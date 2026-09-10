import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  return <AuthScreen mode="signup" />;
}
