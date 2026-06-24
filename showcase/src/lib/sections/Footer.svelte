<script>
</script>

<footer>
  <div class="footer-content">
    <div class="footer-main">
      <p class="footer-title">Odd Bird Out</p>
      <p class="footer-sub">An Exploration of Cyber Ostracism</p>
    </div>

    <div class="footer-links">
      <a
        href="https://github.com/TrisCC/OddBirdOut.git"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
      >
        <svg
          class="github-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        View on GitHub
      </a>
    </div>

    <div class="footer-credits">
      <p>
        Created by Tristan Cotino, Aidan Ferentinos and Huub Speijkers for the
        course Science to Experience which is part of the Master Creative
        Intelligence and Technology at Leiden University, June 2026
      </p>
    </div>
  </div>
</footer>

<style>
  footer {
    padding: 60px 24px;
    text-align: center;
    border-top: 4px solid var(--bg-deeper);
    margin: 0;
    max-width: 1126px;
    margin: 0 auto;
  }

  .footer-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
  }

  .footer-title {
    font-family: var(--pixel);
    font-size: 18px;
    color: var(--gold);
  }

  .footer-sub {
    font-size: 14px;
    color: var(--text-dim);
  }

  .github-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: var(--pixel);
    font-size: 13px;
    color: var(--text);
    background: var(--bg-card);
    border: 3px solid var(--text-dim);
    padding: 12px 24px;
    box-shadow: var(--shadow-pixel);
    transition:
      border-color 0.2s,
      color 0.2s,
      transform 0.1s;
  }

  .github-link:hover {
    border-color: var(--gold);
    color: var(--gold);
  }

  .github-link:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.4);
  }

  .github-icon {
    width: 22px;
    height: 22px;
  }

  .footer-credits {
    font-size: 13px;
    color: var(--text-dim);
  }
</style>
