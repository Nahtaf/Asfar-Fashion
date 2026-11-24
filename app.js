import { createReviewCard, fetchPublicReviews, supabase } from './reviews.js';

// WhatsApp number in international format, digits only.
const WHATSAPP_NUMBER = "2347039244305";

(function theme() {
  const t = document.querySelector('[data-theme-toggle]'), r = document.documentElement;
  const sun = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  const apply = () => {
    r.setAttribute('data-theme', d);
    t.innerHTML = d === 'dark' ? sun : moon;
    t.setAttribute('aria-label', 'Switch to ' + (d === 'dark' ? 'light' : 'dark') + ' mode');
  };
  apply();
  t.addEventListener('click', () => { d = d === 'dark' ? 'light' : 'dark'; apply(); });
})();

const waLink = text => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
const openWhatsApp = text => window.open(waLink(text), '_blank', 'noopener');

document.querySelectorAll('a[data-wa]').forEach(a => {
  a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener';
});
document.querySelectorAll('button[data-wa]').forEach(b => b.addEventListener('click', () => openWhatsApp(b.dataset.wa)));
document.querySelectorAll('[data-ask]').forEach(b => b.addEventListener('click', () => {
  openWhatsApp(`Hello Asfar Fashion, I'm interested in your ${b.dataset.ask}. Could you share the sizes, colours and prices?`);
}));

let publishedReviews = [];
const reviewList = document.querySelector('[data-review-list]');
const reviewAverage = document.querySelector('[data-review-average]');
const reviewSummaryStars = document.querySelector('[data-review-summary-stars]');
const reviewCount = document.querySelector('[data-review-count]');
const reviewSeeAll = document.querySelector('[data-review-see-all]');
const REVIEW_PREVIEW_LIMIT = 4;

function renderReviews() {
  reviewList.replaceChildren(...publishedReviews.slice(0, REVIEW_PREVIEW_LIMIT).map(createReviewCard));
  reviewSeeAll.hidden = publishedReviews.length <= REVIEW_PREVIEW_LIMIT;
  const customerReviews = publishedReviews.filter(review => !review.sample);
  if (!customerReviews.length) {
    reviewAverage.textContent = '—';
    reviewSummaryStars.textContent = '☆☆☆☆☆';
    reviewCount.textContent = 'Example shown · no customer reviews published';
  } else {
    const average = customerReviews.reduce((total, review) => total + review.rating, 0) / customerReviews.length;
    reviewAverage.textContent = average.toFixed(1);
    reviewSummaryStars.textContent = '★'.repeat(Math.round(average)) + '☆'.repeat(5 - Math.round(average));
    reviewCount.textContent = `${customerReviews.length} ${customerReviews.length === 1 ? 'review' : 'reviews'}`;
  }

}

async function loadPublicReviews() {
  try {
    publishedReviews = await fetchPublicReviews();
    renderReviews();
  } catch (error) {
    reviewCount.textContent = 'Reviews could not be loaded';
    console.error(error);
  }
}

loadPublicReviews();

const reviewForm = document.getElementById('review-form');
const reviewStatus = reviewForm.querySelector('.review-form__status');
const reviewToast = document.querySelector('[data-review-toast]');
const ratingContainer = reviewForm.querySelector('.review-form__stars');
const ratingLabels = [...ratingContainer.querySelectorAll('label')];
const reviewPhotoInput = reviewForm.elements.photo;
const reviewPhotoPreview = document.querySelector('[data-photo-preview]');
const reviewPhotoPreviewImage = document.querySelector('[data-photo-preview-image]');
let reviewToastTimer;
let reviewPhotoPreviewUrl;

async function compressReviewPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.82, 0.72, 0.62]) {
    const compressed = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (compressed && compressed.size <= 1.8 * 1024 * 1024) {
      return new File([compressed], 'review-photo.jpg', { type: 'image/jpeg' });
    }
  }
  throw new Error('Photo could not be compressed to the upload limit.');
}

function clearReviewPhotoPreview() {
  if (reviewPhotoPreviewUrl) URL.revokeObjectURL(reviewPhotoPreviewUrl);
  reviewPhotoPreviewUrl = null;
  reviewPhotoPreviewImage.removeAttribute('src');
  reviewPhotoPreview.hidden = true;
}

reviewPhotoInput.addEventListener('change', () => {
  const photo = reviewPhotoInput.files[0];
  if (!photo) {
    clearReviewPhotoPreview();
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 12 * 1024 * 1024) {
    reviewPhotoInput.value = '';
    clearReviewPhotoPreview();
    reviewStatus.textContent = 'Choose a JPEG, PNG or WebP photo under 12 MB.';
    return;
  }
  clearReviewPhotoPreview();
  reviewPhotoPreviewUrl = URL.createObjectURL(photo);
  reviewPhotoPreviewImage.src = reviewPhotoPreviewUrl;
  reviewPhotoPreview.hidden = false;
  reviewStatus.textContent = '';
});

document.querySelector('[data-photo-remove]').addEventListener('click', () => {
  reviewPhotoInput.value = '';
  clearReviewPhotoPreview();
});

function setRatingPreview(value) {
  ratingLabels.forEach((label, index) => {
    label.classList.toggle('is-active', index < value);
  });
}

function showReviewNotification(message, isError = false) {
  clearTimeout(reviewToastTimer);
  reviewToast.textContent = message;
  reviewToast.classList.toggle('is-error', isError);
  reviewToast.classList.add('is-visible');
  reviewToastTimer = setTimeout(() => reviewToast.classList.remove('is-visible'), 5000);
}

ratingLabels.forEach((label, index) => {
  label.addEventListener('mouseenter', () => setRatingPreview(index + 1));
  label.querySelector('input').addEventListener('change', event => {
    const value = Number(event.target.value);
    ratingLabels.forEach((ratingLabel, ratingIndex) => {
      ratingLabel.classList.toggle('is-selected', ratingIndex < value);
    });
    setRatingPreview(value);
  });
});

ratingContainer.addEventListener('mouseleave', () => {
  const selected = Number(new FormData(reviewForm).get('rating')) || 0;
  setRatingPreview(selected);
});

reviewForm.addEventListener('submit', async event => {
  event.preventDefault();
  const values = new FormData(reviewForm);
  const name = values.get('name').toString().trim();
  const product = values.get('product').toString().trim();
  const rating = Number(values.get('rating'));
  const text = values.get('review').toString().trim();
  const selectedPhoto = values.get('photo');
  const photo = selectedPhoto instanceof File && selectedPhoto.size ? selectedPhoto : null;
  const consent = values.get('consent') === 'yes';

  if (!consent) {
    reviewStatus.textContent = 'Please give publishing permission before submitting.';
    showReviewNotification('Please give publishing permission before submitting.', true);
    return;
  }

  if (photo && (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 12 * 1024 * 1024)) {
    reviewStatus.textContent = 'Choose a JPEG, PNG or WebP photo under 12 MB.';
    showReviewNotification('Choose a JPEG, PNG or WebP photo under 12 MB.', true);
    return;
  }

  const submitButton = reviewForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  reviewStatus.textContent = '';

  let photoPath = null;
  if (photo) {
    let compressedPhoto;
    try {
      compressedPhoto = await compressReviewPhoto(photo);
    } catch (compressionError) {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit review';
      reviewStatus.textContent = 'Your photo could not be prepared. Please try another photo or submit without it.';
      showReviewNotification('Photo could not be prepared. You can try another or submit without a photo.', true);
      console.error(compressionError);
      return;
    }

    const { data: uploadedPhoto, error: photoError } = await supabase.storage
      .from('review-photos')
      .upload(`reviews/${crypto.randomUUID()}.jpg`, compressedPhoto, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      });

    if (photoError) {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit review';
      reviewStatus.textContent = 'Your photo could not be uploaded. Please try again or submit without it.';
      showReviewNotification('Photo upload failed. You can try again or submit without a photo.', true);
      console.error(photoError);
      return;
    }
    photoPath = uploadedPhoto.path;
  }

  const reviewData = {
    name,
    product,
    rating,
    review: text,
    publishing_permission: true,
    is_approved: true,
  };
  if (photoPath) reviewData.photo_path = photoPath;
  const { error } = await supabase.from('reviews').insert(reviewData);

  submitButton.disabled = false;
  submitButton.textContent = 'Submit review';

  if (error) {
    reviewStatus.textContent = 'Your review could not be submitted. Please try again.';
    showReviewNotification('Your review could not be submitted. Please try again.', true);
    console.error(error);
    return;
  }

  reviewForm.reset();
  clearReviewPhotoPreview();
  ratingLabels.forEach(label => label.classList.remove('is-selected', 'is-active'));
  reviewStatus.textContent = 'Thank you. Your review is now published.';
  showReviewNotification('Review published successfully.');
  await loadPublicReviews();
});

document.querySelector('[data-copy-review-link]').addEventListener('click', async () => {
  const status = document.querySelector('.reviews__share-status');
  const link = `${window.location.href.split('#')[0]}#reviews`;
  try {
    await navigator.clipboard.writeText(link);
    status.textContent = 'Review link copied.';
  } catch {
    const field = document.createElement('textarea');
    field.value = link;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    status.textContent = copied ? 'Review link copied.' : link;
  }
});

const form = document.getElementById('order-form');
form.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(form), err = form.querySelector('.form__error');
  const v = k => (f.get(k) || '').toString().trim();
  if (!v('name')) { err.hidden = false; form.elements.name.focus(); return; }
  err.hidden = true;
  const lines = [
    'Hello Asfar Fashion, I\'d like a quote.',
    `Name: ${v('name')}`,
    v('org') && `Organisation: ${v('org')}`,
    `Bag type: ${v('bag')}`,
    `Quantity: ${v('qty')}`,
    `Branding: ${v('brand')}`,
    v('city') && `Delivery city: ${v('city')}`,
    v('message') && `Details: ${v('message')}`,
  ].filter(Boolean);
  openWhatsApp(lines.join('\n'));
});

document.querySelector('[data-year]').textContent = new Date().getFullYear();

const header = document.querySelector('.header');
addEventListener('scroll', () => header.classList.toggle('is-scrolled', scrollY > 8), { passive: true });

const els = document.querySelectorAll('.section__head, .product, .g, .aud, .bulk__img, .bulk__text, .about > *, .contact__text, .form');
els.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: 0.1 });
els.forEach(el => io.observe(el));
