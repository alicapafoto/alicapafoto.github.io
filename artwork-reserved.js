const STORAGE_KEY = 'aliCapaOriginalReservation';
const artworkNode = document.querySelector('[data-reserved-artwork]');
const summaryNode = document.querySelector('[data-reservation-summary]');
const priceNode = document.querySelector('[data-reserved-price]');
const shippingNode = document.querySelector('[data-reserved-shipping]');
const totalNode = document.querySelector('[data-reserved-total]');
const timerNode = document.querySelector('[data-reservation-timer]');
const messageNode = document.querySelector('[data-reservation-message]');
const continueLink = document.querySelector('[data-continue-checkout]');
const cancelButton = document.querySelector('[data-cancel-reservation]');
let timer = null;
let releasing = false;

function formatEuro(cents) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);
}

function readReservation() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!value?.artworkId || !value?.reservationId || !value?.reservedUntil || !value?.checkoutUrl) return null;
    return value;
  } catch {
    return null;
  }
}

function safeCheckoutUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !(url.hostname === 'checkout.stripe.com' || url.hostname.endsWith('.stripe.com'))) return '';
    return url.href;
  } catch {
    return '';
  }
}

function setUnavailable(message) {
  if (timer) clearInterval(timer);
  timerNode.textContent = '00:00';
  continueLink.setAttribute('aria-disabled', 'true');
  continueLink.removeAttribute('href');
  cancelButton.disabled = true;
  messageNode.textContent = message;
}

async function releaseReservation(reservation, reason) {
  if (releasing || !reservation?.reservationToken) return false;
  releasing = true;
  cancelButton.disabled = true;
  continueLink.setAttribute('aria-disabled', 'true');
  messageNode.textContent = reason === 'expired'
    ? 'The reservation has expired. Releasing the artwork…'
    : 'Releasing the artwork reservation…';
  try {
    const response = await fetch('/api/original-artworks/release', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        artworkId: reservation.artworkId,
        reservationId: reservation.reservationId,
        reservationToken: reservation.reservationToken,
      }),
    });
    const payload = await response.json();
    if (!response.ok && response.status !== 409) throw new Error(payload.error || 'The reservation could not be released.');
    sessionStorage.removeItem(STORAGE_KEY);
    setUnavailable(reason === 'expired'
      ? 'The temporary reservation expired. The artwork is available again.'
      : 'No payment was made. The artwork is available again.');
    return true;
  } catch (error) {
    console.error(error);
    setUnavailable('The hold will expire automatically. You may safely leave this page.');
    return false;
  } finally {
    releasing = false;
  }
}

const reservation = readReservation();
const checkoutUrl = safeCheckoutUrl(reservation?.checkoutUrl);
if (!reservation || !checkoutUrl) {
  setUnavailable('No active artwork reservation was found.');
} else {
  artworkNode.textContent = reservation.title || 'Unique original artwork';
  priceNode.textContent = formatEuro(reservation.priceCents);
  shippingNode.textContent = formatEuro(reservation.shippingCents);
  totalNode.textContent = formatEuro(reservation.totalCents);
  summaryNode.hidden = false;
  continueLink.href = checkoutUrl;

  const updateTimer = () => {
    const remaining = Math.max(0, Number(reservation.reservedUntil) - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerNode.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (remaining <= 0) releaseReservation(reservation, 'expired');
  };
  updateTimer();
  timer = setInterval(updateTimer, 1000);

  cancelButton.addEventListener('click', () => releaseReservation(reservation, 'cancelled'));
}
