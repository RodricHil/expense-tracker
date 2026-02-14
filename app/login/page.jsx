import LoginClient from "./logintclient"

export const metadata = {
  title: "Login | Expense Tracker",
  description: "Sign in to your Expense Tracker account",
};

export default function LoginPage() {
    return (
        <LoginClient />
    );
}