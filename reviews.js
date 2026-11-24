const SUPABASE_URL = 'https://hvdufdlrcvanzutzdmnu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZKfLiB9mPwSnYf3BkHRtgA_B5gNVUkG';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchPublicReviews() {
  let { data, error } = await supabase
    .from('reviews')
    .select('name, product, rating, review, photo_path, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) {
    ({ data, error } = await supabase
      .from('reviews')
      .select('name, product, rating, review, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false }));
  }

  if (error) throw error;

  return (data || []).map(item => ({
    name: item.name,
    product: item.product,
    rating: item.rating,
    text: item.review,
    photoUrl: item.photo_path
      ? supabase.storage.from('review-photos').getPublicUrl(item.photo_path).data.publicUrl
      : null,
    createdAt: item.created_at,
  }));
}

export function createReviewCard(review) {
  const article = document.createElement('article');
  article.className = review.photoUrl ? 'review-item review-item--with-photo' : 'review-item';
  const head = document.createElement('div');
  head.className = 'review-item__head';
  const identity = document.createElement('div');
  const name = document.createElement('strong');
  name.className = 'review-item__name';
  name.textContent = review.name.split(/\s+/)[0];
  const product = document.createElement('span');
  product.className = 'review-item__product';
  product.textContent = review.product;
  identity.append(name, product);

  const rating = document.createElement('div');
  rating.className = 'review-item__rating';
  const stars = document.createElement('span');
  stars.className = 'review-item__stars';
  stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
  stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  rating.append(stars);

  if (review.createdAt) {
    const date = document.createElement('time');
    date.className = 'review-item__date';
    date.dateTime = review.createdAt;
    date.textContent = new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(review.createdAt));
    rating.append(date);
  }

  head.append(identity, rating);
  const text = document.createElement('p');
  text.className = 'review-item__text';
  text.textContent = review.text;

  if (review.photoUrl) {
    const photo = document.createElement('img');
    photo.className = 'review-item__photo';
    photo.src = review.photoUrl;
    photo.alt = `Customer photo of ${review.product}`;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    const content = document.createElement('div');
    content.className = 'review-item__content';
    content.append(head, text);
    article.append(photo, content);
  } else {
    article.append(head, text);
  }

  return article;
}