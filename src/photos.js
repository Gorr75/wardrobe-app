import { brandIconClass, brandInitial, escapeHtml } from './frame.js';
import { t } from './i18n.js';
import { getCatalogPhoto } from './photos/catalog.js';

export async function processImageFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxSize = 480;
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}

export function imageTagMarkup(classNames, src) {
  return `<img class="${classNames}" src="${escapeHtml(src)}" alt="" decoding="async" />`;
}

export function renderStoreThumb(image, brand, sizeClass = '', iconClass = '') {
  if (image) {
    return imageTagMarkup(`restaurant-photo ${sizeClass}`.trim(), image);
  }
  return `<div class="restaurant-icon ${iconClass} ${sizeClass}">${brandInitial(brand)}</div>`;
}

export function renderPlaceholderHero(store) {
  return `
    <div class="detail-hero-mark ${brandIconClass(store.brand)}">
      <span class="detail-monogram" aria-hidden="true">${escapeHtml(brandInitial(store.brand))}</span>
      <span class="detail-brand-caption">${escapeHtml(store.brand)}</span>
    </div>`;
}

function catalogCreditMarkup(photo) {
  const text = t('Photo: {credit}', { credit: `${photo.author}, ${photo.license}` });
  return `<a class="photo-credit" href="${escapeHtml(photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
}

export function renderBoutiqueHero(store, userImage) {
  if (userImage) {
    return {
      kind: 'user',
      html: `<img class="detail-hero-photo" src="${escapeHtml(userImage)}" alt="" />`,
    };
  }
  const catalog = getCatalogPhoto(store.id);
  if (catalog) {
    return {
      kind: 'catalog',
      html: `<img class="detail-hero-photo" src="${escapeHtml(catalog.src)}" alt="" />${catalogCreditMarkup(catalog)}`,
    };
  }
  return { kind: 'placeholder', html: renderPlaceholderHero(store) };
}

export function renderGoogleHero(photo) {
  const credits = (photo?.attributions || [])
    .map((attr) => {
      const name = (attr.displayName || '').trim();
      if (!name) return '';
      if (attr.uri) {
        return `<a href="${escapeHtml(attr.uri)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`;
      }
      return escapeHtml(name);
    })
    .filter(Boolean);
  const credit = credits.length
    ? `<p class="photo-credit"><span class="photo-credit-kicker">${escapeHtml(t('Photo'))}</span> ${credits.join(', ')}</p>`
    : '';
  return `<img class="detail-hero-photo" src="${escapeHtml(photo.src)}" alt="" />${credit}`;
}

export function heroCreditText(photo) {
  if (!photo) return '';
  return t('Photo: {credit}', { credit: `${photo.author}, ${photo.license}` });
}

export function photoPickerMarkup({ previewImage, placeholder, placeholderClass = '' }) {
  return `
    <div class="photo-picker">
      <div class="photo-preview ${placeholderClass}" id="photo-preview" data-placeholder="${escapeHtml(placeholder)}">
        ${
          previewImage
            ? imageTagMarkup('', previewImage)
            : `<span class="photo-placeholder-text">${escapeHtml(placeholder)}</span>`
        }
      </div>
      <div class="photo-actions">
        <div class="photo-action-row">
          <label class="btn btn-secondary photo-choose-btn">
            ${t('Take photo')}
            <input type="file" id="photo-input-camera" accept="image/*" capture="environment" hidden />
          </label>
          <label class="btn btn-secondary photo-choose-btn">
            ${t('Choose from library')}
            <input type="file" id="photo-input-library" accept="image/*" hidden />
          </label>
        </div>
        <button type="button" class="btn-text danger" id="remove-photo" ${previewImage ? '' : 'hidden'}>${t('Remove')}</button>
      </div>
      <p class="field-error" id="photo-error" hidden></p>
    </div>`;
}

export function bindPhotoPicker(container, { initialImage = '', placeholder = 'Add photo' } = {}) {
  let imageData = initialImage || null;
  let imageRemoved = false;
  const preview = container.querySelector('#photo-preview');
  const cameraInput = container.querySelector('#photo-input-camera');
  const libraryInput = container.querySelector('#photo-input-library');
  const removeBtn = container.querySelector('#remove-photo');
  const errorEl = container.querySelector('#photo-error');

  function setPhotoError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }

  function updatePreview(src) {
    if (!preview) return;
    if (src) {
      preview.innerHTML = imageTagMarkup('', src);
      if (removeBtn) removeBtn.hidden = false;
    } else {
      preview.innerHTML = `<span class="photo-placeholder-text">${escapeHtml(placeholder)}</span>`;
      if (removeBtn) removeBtn.hidden = true;
    }
  }

  async function handleFile(file, input) {
    if (!file) return;
    setPhotoError('');
    try {
      imageData = await processImageFile(file);
      imageRemoved = false;
      updatePreview(imageData);
    } catch {
      setPhotoError(t('Could not load that photo.'));
    }
    if (input) input.value = '';
  }

  cameraInput?.addEventListener('change', () => handleFile(cameraInput.files?.[0], cameraInput));
  libraryInput?.addEventListener('change', () => handleFile(libraryInput.files?.[0], libraryInput));
  removeBtn?.addEventListener('click', () => {
    imageData = null;
    imageRemoved = true;
    setPhotoError('');
    updatePreview(null);
  });

  return {
    getImagePayload(existingImage = '') {
      if (imageRemoved) return '';
      if (imageData !== null) return imageData;
      return existingImage;
    },
  };
}
