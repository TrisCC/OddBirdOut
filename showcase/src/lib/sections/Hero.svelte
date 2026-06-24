<script>
  let { onScrollClick } = $props();
  const base = import.meta.env.BASE_URL;
</script>

<section class="hero">
  <div
    class="hero-bg"
    style="background-image: url('{base}assets/bg_day.png')"
  ></div>
  <div class="starfield" aria-hidden="true"></div>

  <div class="hero-content fade-in visible">
    <img
      class="title-img"
      src="{base}assets/obo-title.png"
      alt="Odd Bird Out"
    />

    <h2 class="subtitle">An Exploration of Cyber Ostracism</h2>

    <p class="authors">
      Tristan Cotino &amp; Aidan Ferentinos &amp; Huub Speijkers
    </p>

    <button class="scroll-btn" onclick={onScrollClick}>
      <span>Discover the story</span>
      <span class="arrow">&#x25BC;</span>
    </button>
  </div>

  <div class="ostrich-left" aria-hidden="true">
    <img src="{base}assets/sprites/ostrich green.png" alt="" />
  </div>
  <div class="ostrich-right" aria-hidden="true">
    <img src="{base}assets/sprites/ostrich orange.png" alt="" />
  </div>
</section>

<style>
  .hero {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 24px;
    margin: 0;
    max-width: none;
    overflow: hidden;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background: center / cover no-repeat;
    z-index: 0;
  }

  .hero-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(26, 15, 10, 0.55) 0%,
      rgba(26, 15, 10, 0.4) 40%,
      rgba(26, 15, 10, 0.75) 85%,
      var(--bg-dark) 100%
    );
  }

  .starfield {
    position: absolute;
    inset: 0;
    z-index: 1;
    background-image: radial-gradient(
        2px 2px at 10% 20%,
        rgba(255, 255, 255, 0.8),
        transparent
      ),
      radial-gradient(1px 1px at 25% 60%, rgba(255, 255, 255, 0.6), transparent),
      radial-gradient(2px 2px at 45% 15%, rgba(255, 255, 255, 0.7), transparent),
      radial-gradient(1px 1px at 60% 40%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(2px 2px at 75% 70%, rgba(255, 255, 255, 0.8), transparent),
      radial-gradient(1px 1px at 85% 25%, rgba(255, 255, 255, 0.6), transparent),
      radial-gradient(2px 2px at 90% 55%, rgba(255, 255, 255, 0.7), transparent),
      radial-gradient(1px 1px at 15% 80%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(2px 2px at 35% 35%, rgba(255, 255, 255, 0.6), transparent),
      radial-gradient(1px 1px at 55% 85%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(2px 2px at 70% 10%, rgba(255, 255, 255, 0.7), transparent),
      radial-gradient(1px 1px at 5% 45%, rgba(255, 255, 255, 0.4), transparent);
    animation: twinkle 3s ease-in-out infinite;
  }

  .hero-content {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .title-img {
    width: min(85vw, 700px);
    height: auto;
    animation: breathe 2.4s ease-in-out infinite;
    image-rendering: pixelated;
  }

  .subtitle {
    font-family: var(--pixel);
    font-size: clamp(12px, 2.5vw, 20px);
    color: var(--gold);
    text-shadow: 3px 3px 0px #000;
    margin: 0;
  }

  .authors {
    font-family: var(--pixel);
    font-size: clamp(9px, 1.8vw, 14px);
    color: var(--text);
    text-shadow: 2px 2px 0px #000;
  }

  .scroll-btn {
    margin-top: 24px;
    background: none;
    border: none;
    color: var(--text-dim);
    font-family: var(--pixel);
    font-size: 13px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    opacity: 0.7;
    transition: opacity 0.3s;
  }

  .scroll-btn:hover {
    opacity: 1;
    color: var(--gold);
  }

  .arrow {
    animation: bob 1.5s ease-in-out infinite;
    font-size: 20px;
  }

  .ostrich-left,
  .ostrich-right {
    position: absolute;
    bottom: 30px;
    z-index: 2;
    animation: bob 3s ease-in-out infinite;
    opacity: 0.6;
  }

  .ostrich-left {
    left: max(16px, 5%);
    animation-delay: 0s;
  }

  .ostrich-right {
    right: max(16px, 5%);
    animation-delay: 0.5s;
  }

  .ostrich-left img,
  .ostrich-right img {
    width: clamp(50px, 8vw, 100px);
    image-rendering: pixelated;
  }

  @media (max-width: 768px) {
    .ostrich-left,
    .ostrich-right {
      display: none;
    }
  }
</style>
