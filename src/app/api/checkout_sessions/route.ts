import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

type CartItem = {
  name: string;
  price: number;
  quantity: number;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const locale = body.locale || 'en';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: body.items.map((item: CartItem) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: item.price * 100, // cents
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/${locale}/checkout/success`,
      cancel_url: `${req.nextUrl.origin}/${locale}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error creating Stripe session' }, { status: 500 });
  }
}
