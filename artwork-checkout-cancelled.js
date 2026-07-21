const STORAGE_KEY = 'aliCapaOriginalReservation';
const statusNode = document.querySelector('[data-cancel-status]');

async function releaseStoredReservation() {
  let reservation;
  try { reservation = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch { reservation = null; }
  if (!reservation?.artworkId || !reservation?.reservationId || !reservation?.reservationToken) {
    statusNode.textContent = 'There is no active payment or artwork reservation.';
    return;
  }

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
    statusNode.textContent = 'The temporary reservation has been released. The artwork is available again.';
  } catch (error) {
    console.error(error);
    statusNode.textContent = 'The temporary hold will expire automatically. No payment was made.';
  }
}

releaseStoredReservation();
