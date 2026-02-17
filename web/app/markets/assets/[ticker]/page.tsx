import { redirect } from "next/navigation"

type Props = {
  params: Promise<{ ticker: string }>
}

export default async function AssetPage({ params }: Props) {
  redirect("/")
}
