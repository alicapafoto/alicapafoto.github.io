const titleNode = document.querySelector('[data-confirmation-title]');
const statusNode = document.querySelector('[data-confirmation-status]');
const contentNode = document.querySelector('[data-confirmed-content]');
const artworkNode = document.querySelector('[data-confirmed-artwork]');
const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';

async function verifyConfirmation() {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    titleNode.textContent = 'Confirmation unavailable.';
    statusNode.textContent = 'A valid paid Stripe session was not provided.';
    return;
  }

  try {
    const response = await fetch(`/api/original-artworks/confirmation?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { accept: 'application/json' },
    });
    const payload = await response.json();
    if (!response.ok || !payload.confirmed) throw new Error(payload.error || 'The payment confirmation could not be verified.');

    sessionStorage.removeItem('aliCapaOriginalReservation');
    titleNode.textContent = 'Thank you!';
    artworkNode.textContent = payload.artwork?.title || 'the original artwork';
    contentNode.hidden = false;
    statusNode.textContent = 'Payment confirmed securely.';
  } catch (error) {
    console.error(error);
    titleNode.textContent = 'Confirmation pending.';
    statusNode.textContent = 'The payment could not be verified on this page yet. Keep your Stripe receipt and contact Ali Capa Foto if this message remains.';
  }
}

verifyConfirmation();
