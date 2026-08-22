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
  return `
    <div class="purchase-card" data-purchase-id="${escapeHtml(purchase.id)}">
      ${
        purchase.image
          ? imageTagMarkup('purchase-thumb', purchase.image)
          : `<div class="purchase-thumb purchase-thumb-empty" aria-hidden="true">🛍</div>`
      }
      <div class="purchase-body">
        <div class="purchase-name">${escapeHtml(purchase.name)}</div>
        ${metaParts.length ? `<div class="purchase-meta">${escapeHtml(metaParts.join(' · '))}</div>` : ''}
        <div class="purchase-date">${escapeHtml(formatPurchaseDate(purchase.purchasedAt))}</div>
        <button type="button" class="btn-text edit-purchase-btn" data-id="${escapeHtml(purchase.id)}">Edit</button>
      </div>
    </div>`;
}
