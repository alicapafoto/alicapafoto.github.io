const state = {
  records: [],
  selectedId: "",
  selectedRecord: null,
  events: [],
  busy: false,
};

const grid = document.querySelector('[data-admin-grid]');
const message = document.querySelector('[data-system-message]');
const list = document.querySelector('[data-order-list]');
const count = document.querySelector('[data-record-count]');
const emptyState = document.querySelector('[data-empty-state]');
const recordView = document.querySelector('[data-record-view]');
const packingForm = document.querySelector('[data-packing-form]');
const refreshButton = document.querySelector('[data-refresh]');
const readyButton = document.querySelector('[data-ready-label]');
const shipmentButton = document.querySelector('[data-create-shipment]');

function formatEuro(cents) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatParcel(parcel) {
  if (!parcel) return 'Not measured';
  return `${parcel.lengthCm} × ${parcel.widthCm} × ${parcel.heightCm} cm · ${parcel.weightKg} kg`;
}

function formatAddress(address = {}) {
  return [
    address.addressLine1,
    address.addressLine2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.state,
    address.countryCode,
  ].filter(Boolean).join('\n');
}

function setMessage(text, type = '') {
  message.textContent = text || '';
  message.classList.remove('is-error', 'is-success');
  if (type) message.classList.add(`is-${type}`);
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value || 'Not provided';
}

function setBusy(busy) {
  state.busy = busy;
  refreshButton.disabled = busy;
  packingForm.querySelectorAll('input, textarea, button').forEach((node) => { node.disabled = busy; });
  updateActionStates();
}

function updateActionStates() {
  const record = state.selectedRecord;
  const packingEditable = record && ['paid-awaiting-packing', 'packed-measured'].includes(record.status);
  packingForm.querySelectorAll('input, textarea').forEach((node) => { node.disabled = state.busy || !packingEditable; });
  packingForm.querySelector('[data-save-packing]').disabled = state.busy || !packingEditable;
  readyButton.disabled = state.busy || record?.status !== 'packed-measured';
  shipmentButton.disabled = state.busy || record?.status !== 'ready-for-label';
  shipmentButton.textContent = record?.status === 'ready-for-label'
    ? 'Attempt approved DHL creation'
    : 'DHL adapter awaiting approval';
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The private request could not be completed.');
  return payload;
}

function renderList() {
  list.replaceChildren();
  count.textContent = String(state.records.length);
  if (state.records.length === 0) {
    const paragraph = document.createElement('p');
    paragraph.className = 'order-button';
    paragraph.textContent = 'No paid Original Works orders are awaiting fulfilment.';
    list.append(paragraph);
    return;
  }

  state.records.forEach((record) => {
    const button = document.createElement('button');
    button.className = 'order-button';
    button.type = 'button';
    button.classList.toggle('is-active', record.fulfilmentId === state.selectedId);
    const title = document.createElement('strong');
    title.textContent = record.title;
    const status = document.createElement('span');
    status.textContent = record.status.replaceAll('-', ' ');
    button.append(title, status);
    button.addEventListener('click', () => selectRecord(record.fulfilmentId));
    list.append(button);
  });
}

function populatePackingForm(record) {
  const parcel = record.actualParcel || record.provisionalParcel;
  packingForm.querySelector('[data-length]').value = parcel?.lengthCm ?? '';
  packingForm.querySelector('[data-width]').value = parcel?.widthCm ?? '';
  packingForm.querySelector('[data-height]').value = parcel?.heightCm ?? '';
  packingForm.querySelector('[data-weight]').value = parcel?.weightKg ?? '';
  packingForm.querySelector('[data-packing-notes]').value = record.packingNotes || '';
  packingForm.querySelector('[data-address-reviewed]').checked = Boolean(record.addressReviewedAt);
}

function renderEvents() {
  const eventList = document.querySelector('[data-event-list]');
  eventList.replaceChildren();
  state.events.forEach((event) => {
    const item = document.createElement('li');
    const type = document.createElement('strong');
    type.textContent = event.type.replaceAll('-', ' ');
    const actor = document.createElement('span');
    actor.textContent = event.actorEmail || 'System';
    const time = document.createElement('time');
    time.dateTime = event.createdAt;
    time.textContent = formatDate(event.createdAt);
    item.append(type, actor, time);
    eventList.append(item);
  });
}

function renderRecord() {
  const record = state.selectedRecord;
  emptyState.hidden = Boolean(record);
  recordView.hidden = !record;
  if (!record) return;

  setText('[data-title]', record.title);
  setText('[data-reference]', `${record.fulfilmentId} · ${record.checkoutSessionId}`);
  setText('[data-status]', record.status.replaceAll('-', ' '));
  setText('[data-recipient-name]', record.recipient.name);
  setText('[data-recipient-email]', record.recipient.email);
  setText('[data-recipient-phone]', record.recipient.phone);
  setText('[data-recipient-address]', formatAddress(record.recipient.address));
  setText('[data-sale-price]', formatEuro(record.salePriceCents));
  setText('[data-shipping-price]', formatEuro(record.shippingChargedCents));
  setText('[data-declared-value]', formatEuro(record.declaredValueCents));
  setText('[data-provisional-parcel]', formatParcel(record.provisionalParcel));
  populatePackingForm(record);
  renderEvents();
  updateActionStates();
}

async function loadRecords({ keepSelection = true } = {}) {
  setBusy(true);
  setMessage('Loading the private fulfilment ledger…');
  try {
    const payload = await fetchJson('/api/admin/original-artworks/fulfilment');
    state.records = payload.records || [];
    grid.hidden = false;
    if (!keepSelection || !state.records.some((record) => record.fulfilmentId === state.selectedId)) {
      state.selectedId = '';
      state.selectedRecord = null;
      state.events = [];
    }
    renderList();
    renderRecord();
    setMessage(payload.senderConfigured
      ? 'Private Access verified. Sender configuration is complete.'
      : 'Private Access verified. Sender configuration is still incomplete.',
      payload.senderConfigured ? 'success' : '');
  } catch (error) {
    console.error(error);
    grid.hidden = true;
    setMessage(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function selectRecord(fulfilmentId) {
  if (state.busy) return;
  setBusy(true);
  setMessage('Loading the selected paid order…');
  try {
    const payload = await fetchJson(`/api/admin/original-artworks/fulfilment?fulfilmentId=${encodeURIComponent(fulfilmentId)}`);
    state.selectedId = fulfilmentId;
    state.selectedRecord = payload.record;
    state.events = payload.events || [];
    renderList();
    renderRecord();
    setMessage('Paid order loaded from the private D1 ledger.', 'success');
  } catch (error) {
    console.error(error);
    setMessage(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

packingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.busy || !state.selectedRecord || !packingForm.reportValidity()) return;
  setBusy(true);
  setMessage('Saving the real parcel measurements…');
  try {
    const payload = await fetchJson('/api/admin/original-artworks/packing', {
      method: 'POST',
      body: JSON.stringify({
        fulfilmentId: state.selectedRecord.fulfilmentId,
        lengthCm: packingForm.querySelector('[data-length]').value,
        widthCm: packingForm.querySelector('[data-width]').value,
        heightCm: packingForm.querySelector('[data-height]').value,
        weightKg: packingForm.querySelector('[data-weight]').value,
        packingNotes: packingForm.querySelector('[data-packing-notes]').value,
        addressReviewed: packingForm.querySelector('[data-address-reviewed]').checked,
      }),
    });
    state.selectedRecord = payload.record;
    await selectRecord(state.selectedRecord.fulfilmentId);
    setMessage('Packing measurements and address review were saved.', 'success');
  } catch (error) {
    console.error(error);
    setMessage(error.message, 'error');
  } finally {
    setBusy(false);
  }
});

readyButton.addEventListener('click', async () => {
  if (state.busy || !state.selectedRecord) return;
  setBusy(true);
  setMessage('Checking packing, address review, and private sender configuration…');
  try {
    const payload = await fetchJson('/api/admin/original-artworks/ready-for-label', {
      method: 'POST',
      body: JSON.stringify({ fulfilmentId: state.selectedRecord.fulfilmentId }),
    });
    state.selectedRecord = payload.record;
    await selectRecord(state.selectedRecord.fulfilmentId);
    setMessage('The packed artwork is ready for the final DHL label gate.', 'success');
  } catch (error) {
    console.error(error);
    setMessage(error.message, 'error');
  } finally {
    setBusy(false);
  }
});

shipmentButton.addEventListener('click', async () => {
  if (state.busy || !state.selectedRecord) return;
  const confirmed = window.confirm('This is the final shipment gate. Continue to the DHL adapter check?');
  if (!confirmed) return;
  setBusy(true);
  setMessage('Checking the DHL shipment gate…');
  try {
    await fetchJson('/api/admin/original-artworks/create-shipment', {
      method: 'POST',
      body: JSON.stringify({ fulfilmentId: state.selectedRecord.fulfilmentId }),
    });
  } catch (error) {
    console.error(error);
    setMessage(error.message, 'error');
  } finally {
    setBusy(false);
  }
});

refreshButton.addEventListener('click', () => loadRecords());
loadRecords({ keepSelection: false });
