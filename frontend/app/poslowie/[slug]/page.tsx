export type PageParams = { params: Promise<{ slug: string }> }

export default async function Page({ params }: PageParams) {
  const { slug } = await params

  return <div>Posel {slug} page</div>
}
