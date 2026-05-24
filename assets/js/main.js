// Nav scroll state（桌機）
const topNav = document.querySelector('.top-nav');
if (topNav) {
  window.addEventListener('scroll', () => {
    topNav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

// Scroll reveal（頁面直接引用時用）
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(({ isIntersecting, target }) => {
    if (isIntersecting) { target.classList.add('visible'); revealObs.unobserve(target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
