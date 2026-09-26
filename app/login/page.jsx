import LoginClient from "./logintclient"

export const metadata = {
  title: "Login | Finex",
  description: "Sign in to your Expense Tracker account",
};

export default async function LoginPage({ searchParams }) {
    const params = await searchParams;
    return (
        <LoginClient hasAuthError={Boolean(params?.error)} />
    );
}
