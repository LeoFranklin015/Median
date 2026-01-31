import { ConnectWallet } from "@/components/ConnectWallet";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      <main className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Circle Smart Wallet</h1>
          <p className="text-muted-foreground">Passkey authentication with gasless transactions</p>
        </div>
        <Card className="shadow-2xl border-primary/10">
          <CardContent className="p-8">
            <ConnectWallet />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
