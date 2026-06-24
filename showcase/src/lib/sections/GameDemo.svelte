<script>
  import SpriteAnim from "../SpriteAnim.svelte";
  let { visible } = $props();
  let currentSlide = $state(0);
  let eggs = $state(0);
  const base = import.meta.env.BASE_URL;

  const slides = [
    {
      src: `${base}assets/screenshots/sc_start.png`,
      alt: "Start screen — title splash",
      label: "Start Screen",
      desc: "Each player taps the screen to enter the game.",
    },
    {
      src: `${base}assets/screenshots/sc_lobby.png`,
      alt: "Lobby — all players ready up",
      label: "Lobby",
      desc: "Players choose a color and ready up and learn the rules.",
    },
    {
      src: `${base}assets/screenshots/sc_game.png`,
      alt: "Gameplay — sharing eggs",
      label: "Gameplay",
      desc: "During the game, partners who share with each other each gain an egg. The objective is to collect as many eggs as possible.",
    },
    {
      src: `${base}assets/screenshots/sc_gameover.png`,
      alt: "Game Over — results screen",
      label: "End Screen",
      desc: "After 12 rounds, each player sees their results, or what they <em>think</em> are their results.",
    },
  ];

  function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  }

  function addEgg() {
    if (eggs < 12) eggs++;
  }

  function resetEggs() {
    eggs = 0;
  }
</script>

<section id="game-demo" class="content-section {visible ? 'visible' : ''}">
  <h2>The Game: Odd Bird Out</h2>

  <p class="section-intro">
    Three players stand around a central triangular structure, each with their
    own Android tablet in front of them, separated by panels so nobody can see
    the others' screens. Players take the role of <strong
      >ostriches collecting eggs</strong
    >. Every round, each player chooses a neighbor to share with. Mutual pairs
    gain eggs and if everyone plays right, everyone can end up with an equal
    amount of eggs. It might also happen that someone gets left out.
  </p>

  <div class="demo-layout">
    <div class="carousel">
      <button
        class="carousel-btn"
        onclick={prevSlide}
        aria-label="Previous slide">&lsaquo;</button
      >

      <div class="slide-frame">
        <img
          src={slides[currentSlide].src}
          alt={slides[currentSlide].alt}
          class="slide-img"
        />
        <div class="slide-info">
          <h3>{slides[currentSlide].label}</h3>
          <p>{@html slides[currentSlide].desc}</p>
        </div>
        <div class="slide-dots">
          {#each slides as _, i}
            <button
              class="dot"
              class:active={i === currentSlide}
              onclick={() => (currentSlide = i)}
              aria-label="Go to slide {i + 1}"
            ></button>
          {/each}
        </div>
      </div>

      <button class="carousel-btn" onclick={nextSlide} aria-label="Next slide"
        >&rsaquo;</button
      >
    </div>

    <aside class="egg-counter pixel-card">
      <div class="ostrich-row" aria-hidden="true">
        <SpriteAnim
          src="{base}assets/sprites/ostrich blue.png"
          frames={3}
          fps={4}
          alt=""
          class="mini-ostrich"
        />
        <SpriteAnim
          src="{base}assets/sprites/ostrich green.png"
          frames={3}
          fps={4}
          alt=""
          class="mini-ostrich"
        />
        <SpriteAnim
          src="{base}assets/sprites/ostrich orange.png"
          frames={3}
          fps={4}
          alt=""
          class="mini-ostrich"
        />
      </div>

      <h3>Egg Counter</h3>
      <p class="counter-label">How it works:</p>
      <p class="counter-desc">
        If two players <strong>share with each other</strong>, they each gain +1
        egg. If nobody forms a mutual pair,
        <strong>everyone gets +1</strong>.
      </p>

      <div class="counter-display">
        <span class="egg-count">{eggs}</span>
        <span class="egg-label">eggs</span>
      </div>

      <div class="counter-actions">
        <button class="pixel-btn" onclick={addEgg}>
          <SpriteAnim
            src="{base}assets/sprites/1egg.png"
            frames={4}
            fps={6}
            alt=""
            class="btn-egg"
          />
          Share (+1)
        </button>
        <button class="pixel-btn reset" onclick={resetEggs}> Reset </button>
      </div>

      <div class="decorative-eggs" aria-hidden="true">
        {#each Array(eggs > 6 ? 6 : eggs) as _}
          <SpriteAnim
            src="{base}assets/sprites/1egg.png"
            frames={4}
            fps={6}
            alt=""
            class="float-egg"
            style="animation-delay: {Math.random() * 2}s"
          />
        {/each}
      </div>
    </aside>
  </div>

  <div class="decorative-divider" aria-hidden="true">
    <SpriteAnim
      src="{base}assets/sprites/heart.png"
      frames={4}
      fps={6}
      alt=""
      class="divider-heart"
    />
    <SpriteAnim
      src="{base}assets/sprites/heart.png"
      frames={4}
      fps={6}
      alt=""
      class="divider-heart"
    />
    <SpriteAnim
      src="{base}assets/sprites/heart.png"
      frames={4}
      fps={6}
      alt=""
      class="divider-heart"
    />
  </div>
</section>

<style>
  .content-section {
    opacity: 0;
    transform: translateY(30px);
    transition:
      opacity 0.8s ease-out,
      transform 0.8s ease-out;
  }
  .content-section.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .section-intro {
    max-width: 800px;
    margin-bottom: 40px;
  }

  .demo-layout {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 40px;
    align-items: start;
    margin-bottom: 48px;
  }

  .carousel {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .carousel-btn {
    background: var(--bg-card);
    border: var(--border-pixel) var(--bg-deeper);
    color: var(--text);
    font-size: 32px;
    font-family: var(--pixel);
    cursor: pointer;
    padding: 8px 16px;
    transition:
      color 0.2s,
      border-color 0.2s;
    flex-shrink: 0;
  }

  .carousel-btn:hover {
    color: var(--gold);
    border-color: var(--gold);
  }

  .slide-frame {
    flex: 1;
    text-align: center;
  }

  .slide-img {
    width: 100%;
    border: 4px solid var(--bg-deeper);
    box-shadow: var(--shadow-pixel);
    image-rendering: auto;
    border-radius: 0;
  }

  .slide-info {
    margin-top: 16px;
    text-align: left;
  }

  .slide-info h3 {
    font-size: 14px;
    color: var(--gold);
  }

  .slide-info p {
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  .slide-dots {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 12px;
  }

  .dot {
    width: 14px;
    height: 14px;
    border: 3px solid var(--text-dim);
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition:
      background 0.2s,
      border-color 0.2s;
  }

  .dot.active {
    background: var(--gold);
    border-color: var(--gold);
  }

  .egg-counter {
    text-align: center;
  }

  .ostrich-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  :global(.mini-ostrich) {
    width: 50px;
    height: 50px;
    animation: bob 2s ease-in-out infinite;
  }

  :global(.mini-ostrich:nth-child(2)) {
    animation-delay: 0.3s;
  }
  :global(.mini-ostrich:nth-child(3)) {
    animation-delay: 0.6s;
  }

  .counter-label {
    font-family: var(--pixel);
    font-size: 12px;
    color: var(--text-dim);
    margin-bottom: 8px;
  }

  .counter-desc {
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .counter-display {
    margin-bottom: 20px;
  }

  .egg-count {
    font-family: var(--pixel);
    font-size: 56px;
    color: var(--gold);
    display: block;
    text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.5);
  }

  .egg-label {
    font-family: var(--pixel);
    font-size: 14px;
    color: var(--text-dim);
  }

  .counter-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-bottom: 16px;
  }

  .pixel-btn {
    font-family: var(--pixel);
    font-size: 12px;
    background: var(--green);
    color: #fff;
    border: 3px solid #2e7d32;
    padding: 10px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: var(--shadow-pixel);
    transition: transform 0.1s;
  }

  .pixel-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.4);
  }

  .pixel-btn.reset {
    background: var(--bg-card);
    border-color: var(--text-dim);
  }

  :global(.btn-egg) {
    width: 20px;
    height: 20px;
  }

  .decorative-eggs {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  :global(.float-egg) {
    width: 24px;
    height: 24px;
    animation: bob 2s ease-in-out infinite;
  }

  :global(.divider-heart) {
    width: 32px;
    height: 32px;
    animation: bob 2s ease-in-out infinite;
  }

  :global(.divider-heart:nth-child(2)) {
    animation-delay: 0.3s;
  }
  :global(.divider-heart:nth-child(3)) {
    animation-delay: 0.6s;
  }

  @media (max-width: 768px) {
    .demo-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
