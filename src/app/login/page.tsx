import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Sign In | Pyrexx AI" };

export default function LoginPage() {
  // Suspense boundary required because LoginForm uses useSearchParams()
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}