import { createReviewCard, fetchPublicReviews } from './reviews.js';

const reviewList = document.querySelector('[data-review-list]');
const reviewAverage = document.querySelector('[data-review-average]');
const reviewSummaryStars = document.querySelector('[data-review-summary-stars]');
const reviewCount = document.querySelector('[data-review-count]');

async function loadAllReviews() {
  try {
    const reviews = await fetchPublicReviews();
    reviewCount.textContent = `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`;

    if (reviews.length) {
      const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
      reviewAverage.textContent = average.toFixed(1);
      reviewSummaryStars.textContent = '★'.repeat(Math.round(average)) + '☆'.repeat(5 - Math.round(average));
      reviewList.replaceChildren(...reviews.map(createReviewCard));
    } else {
      reviewAverage.textContent = '—';
      reviewSummaryStars.textContent = '☆☆☆☆☆';
      reviewList.textContent = 'No customer reviews yet.';
    }
  } catch (error) {
    reviewCount.textContent = 'Reviews could not be loaded';
    reviewList.textContent = 'Please try again later.';
    console.error(error);
  }
}

loadAllReviews();