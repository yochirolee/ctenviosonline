  // lib/collections.ts
export type Collection = {
    id: string
    handle: string
    title: string
  }
  
  export async function getCollections(): Promise<Collection[]> {
    const res = await fetch('http://localhost:9000/store/collections', {
      headers: {
        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_API_KEY!,
      },
      cache: 'no-store',
    })
  
    const data = await res.json()
    return data.collections
  }