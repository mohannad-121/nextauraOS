import { CheckoutEventNames, initializePaddle, type Paddle } from '@paddle/paddle-js';

let paddlePromise: Promise<Paddle | undefined> | null = null;
let paddleInstance: Paddle | undefined;

export interface PaddleCheckoutRequest {
  priceId: string;
  quantity: number;
  customerEmail?: string;
  customData: Record<string, string>;
}

export function closePaddleCheckout() {
  paddleInstance?.Checkout.close();
}

export async function openPaddleCheckout(request: PaddleCheckoutRequest) {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  const environment = import.meta.env.VITE_PADDLE_ENV || 'sandbox';
  if (!token) throw new Error('Paddle Sandbox is not configured. Add VITE_PADDLE_CLIENT_TOKEN to your frontend environment.');
  if (environment !== 'sandbox' && environment !== 'production') throw new Error('VITE_PADDLE_ENV must be sandbox or production.');

  paddlePromise ??= initializePaddle({
    token,
    environment,
    eventCallback: (event) => {
      if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) closePaddleCheckout();
    },
  });
  const paddle = await paddlePromise;
  if (!paddle) throw new Error('Paddle Checkout could not be initialized.');
  paddleInstance = paddle;

  paddle.Checkout.open({
    items: [{ priceId: request.priceId, quantity: request.quantity }],
    ...(request.customerEmail ? { customer: { email: request.customerEmail } } : {}),
    customData: request.customData,
    settings: { variant: 'one-page', successUrl: `${window.location.origin}/billing/success` },
  });
}
