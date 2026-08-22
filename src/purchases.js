import { imageTagMarkup } from './photos.js';
import { escapeHtml } from './frame.js';

export function normalizePurchase(purchase) {
  const purchasedAt =
    typeof purchase.purchasedAt === 'number'
      ? purchase.purchasedAt
      : new Date(purchase.purchasedAt || Date.now()).getTime();
  return {
    id: purchase.id,
    storeId: purchase.storeId || '',
    name: purchase.name || '',
    price: purchase.price || '',
    size: purchase.size || '',
    image: purchase.image || '',
    purchasedAt,
  };
}

export function formatPurchaseDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function renderPurchaseCard(purchase) {
  const metaParts = [purchase.size, purchase.price].filter(Boolean);
  const photoHtml = purchase.image
    ? `<button type="button" class="purchase-thumb-btn" data-photo-action="view" aria-label="View item photo">
        ${imageTagMarkup('purchase-thumb', purchase.image)}
      </button>`
    : `<button type="button" class="purchase-thumb-btn purchase-thumb-empty" data-photo-action="add" aria-label="Add item photo">
        <span class="purchase-thumb-icon" aria-hidden="true">📷</span>
        <span class="purchase-thumb-label">Add photo</span>
      </button>`;
  return `
    <div class="purchase-card" data-purchase-id="${escapeHtml(purchase.id)}">
      ${photoHtml}
      <div class="purchase-body">
        <div class="purchase-name">${escapeHtml(purchase.name)}</div>
        ${metaParts.length ? `<div class="purchase-meta">${escapeHtml(metaParts.join(' · '))}</div>` : ''}
        <div class="purchase-date">${escapeHtml(formatPurchaseDate(purchase.purchasedAt))}</div>
        <div class="purchase-actions">
          ${purchase.image ? `<button type="button" class="btn-text purchase-photo-btn" data-photo-action="change">Change photo</button>` : ''}
          <button type="button" class="btn-text edit-purchase-btn" data-id="${escapeHtml(purchase.id)}">Edit</button>
        </div>
      </div>
    </div>`;
}
