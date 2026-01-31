import { ConnectWallet } from "@/components/ConnectWallet";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="w-full max-w-2xl p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <ConnectWallet />
        </div>
      </main>
    </div>
  );
}
