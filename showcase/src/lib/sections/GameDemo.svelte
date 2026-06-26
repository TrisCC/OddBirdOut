<script>
  import SpriteAnim from "../SpriteAnim.svelte";
  let { visible } = $props();
  let currentSlide = $state(0);

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

  const LEFT = "left";
  const YOU = "you";
  const RIGHT = "right";

  let round = $state(0);
  let scores = $state({ [LEFT]: 0, [YOU]: 0, [RIGHT]: 0 });
  let phase = $state("idle");

  let yourTarget = $state(null);
  let leftTarget = $state(null);
  let rightTarget = $state(null);

  let flyingHearts = $state([]);
  let deltaPopups = $state([]);
  let resultText = $state("");
  let ostrichReact = $state({});

  const PLAYERS = [LEFT, YOU, RIGHT];
  const NAMES = { [LEFT]: "Player C", [YOU]: "Player A (You)", [RIGHT]: "Player B" };
  const COLORS = { [LEFT]: "blue", [YOU]: "orange", [RIGHT]: "green" };
  const posMap = {
    [LEFT]: { x: 15, y: 18 },
    [YOU]: { x: 50, y: 55 },
    [RIGHT]: { x: 85, y: 18 },
  };

  let nextHeartId = 0;
  let nextDeltaId = 0;
  let resultTimer = null;

  function shareWith(target) {
    if (phase === "animating") return;
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
    yourTarget = target;
    phase = "animating";
    executeRound();
  }

  async function executeRound() {
    leftTarget = Math.random() < 0.5 ? YOU : RIGHT;
    rightTarget = Math.random() < 0.5 ? YOU : LEFT;

    await delay(400);

    await animateHeart(YOU, yourTarget);
    await delay(500);

    await animateHeart(LEFT, leftTarget);
    await delay(500);

    await animateHeart(RIGHT, rightTarget);
    await delay(600);

    const shareTarget = { [LEFT]: leftTarget, [YOU]: yourTarget, [RIGHT]: rightTarget };

    const mutualPair = PLAYERS.find(
      (p) => shareTarget[p] && shareTarget[shareTarget[p]] === p
    );

    const deltas = { [LEFT]: 0, [YOU]: 0, [RIGHT]: 0 };
    if (mutualPair) {
      deltas[mutualPair] += 1;
      deltas[shareTarget[mutualPair]] += 1;
    } else {
      for (const p of PLAYERS) deltas[p] += 1;
    }

    for (const p of PLAYERS) {
      if (deltas[p] > 0) {
        const id = nextDeltaId++;
        deltaPopups = [...deltaPopups, { id, player: p, value: deltas[p] }];
      }
    }

    const newScores = { ...scores };
    for (const p of PLAYERS) newScores[p] += deltas[p];
    scores = newScores;
    round++;

    if (mutualPair) {
      const other = shareTarget[mutualPair];
      resultText = `${NAMES[mutualPair]} + ${NAMES[other]} shared — both get +1`;
    } else {
      resultText = "No mutual pair — everyone gets +1";
    }

    phase = "result";

    resultTimer = setTimeout(() => {
      deltaPopups = [];
      yourTarget = null;
      leftTarget = null;
      rightTarget = null;
      resultText = "";
      ostrichReact = {};
      phase = "idle";
      resultTimer = null;
    }, 3000);
  }

  function animateHeart(from, to) {
    return new Promise((resolve) => {
      const id = nextHeartId++;
      flyingHearts = [...flyingHearts, { id, from, to, state: "fly" }];

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flyingHearts = flyingHearts.map((h) =>
            h.id === id ? { ...h, state: "fly-active" } : h
          );
        });
      });

      setTimeout(() => {
        ostrichReact = { ...ostrichReact, [to]: true };
        setTimeout(() => {
          ostrichReact = { ...ostrichReact, [to]: false };
        }, 200);
      }, 550);

      setTimeout(() => {
        flyingHearts = flyingHearts.map((h) =>
          h.id === id ? { ...h, state: "burst" } : h
        );
      }, 650);

      setTimeout(() => {
        flyingHearts = flyingHearts.filter((h) => h.id !== id);
        resolve();
      }, 1000);
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function resetGame() {
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null; }
    round = 0;
    scores = { [LEFT]: 0, [YOU]: 0, [RIGHT]: 0 };
    phase = "idle";
    yourTarget = null;
    leftTarget = null;
    rightTarget = null;
    flyingHearts = [];
    deltaPopups = [];
    resultText = "";
    ostrichReact = {};
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
      <h3>Egg Counter</h3>
      <p class="counter-desc">
        If two players <strong>share with each other</strong>, they each gain +1
        egg. If nobody forms a mutual pair,
        <strong>everyone gets +1</strong>.
      </p>

      <div class="game-stage">
        {#if flyingHearts.length > 0}
          <div class="fx-layer hearts-layer" aria-hidden="true">
            {#each flyingHearts as heart (heart.id)}
              <div
                class="heart-proj"
                class:fly-active={heart.state === 'fly-active'}
                class:burst={heart.state === 'burst'}
                style="
                  --fx-x: {posMap[heart.from].x}%;
                  --fx-y: {posMap[heart.from].y}%;
                  --to-x: {posMap[heart.to].x}%;
                  --to-y: {posMap[heart.to].y}%;
                "
              >
                <SpriteAnim
                  src="{base}assets/sprites/heart.png"
                  frames={4}
                  fps={8}
                  alt=""
                  class="heart-img"
                />
              </div>
            {/each}
          </div>
        {/if}

        {#if deltaPopups.length > 0}
          <div class="fx-layer deltas-layer" aria-hidden="true">
            {#each deltaPopups as popup (popup.id)}
              <div
                class="delta-pop"
                style="
                  --fx-x: {posMap[popup.player].x}%;
                  --fx-y: {posMap[popup.player].y}%;
                "
              >
                +{popup.value}
              </div>
            {/each}
          </div>
        {/if}

        <div class="birds-top">
          <div class="bird-slot">
            <SpriteAnim
              src="{base}assets/sprites/ostrich {COLORS[LEFT]}.png"
              frames={3}
              fps={4}
              alt=""
              class="bird-sprite {ostrichReact[LEFT] ? 'react-shake' : ''}"
            />
            <div class="bird-label">{NAMES[LEFT]}</div>
            {#if scores[LEFT] > 0 || phase === 'result'}
              <div class="bird-score">
                <SpriteAnim src="{base}assets/sprites/1egg.png" frames={4} fps={6} alt="" class="score-egg" />
                <span class="score-num">{scores[LEFT]}</span>
              </div>
            {/if}
          </div>

          <div class="bird-slot">
            <SpriteAnim
              src="{base}assets/sprites/ostrich {COLORS[RIGHT]}.png"
              frames={3}
              fps={4}
              alt=""
              class="bird-sprite {ostrichReact[RIGHT] ? 'react-shake' : ''}"
            />
            <div class="bird-label">{NAMES[RIGHT]}</div>
            {#if scores[RIGHT] > 0 || phase === 'result'}
              <div class="bird-score">
                <SpriteAnim src="{base}assets/sprites/1egg.png" frames={4} fps={6} alt="" class="score-egg" />
                <span class="score-num">{scores[RIGHT]}</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="center-row">
          {#if phase === 'idle' || phase === 'result'}
            <button class="pixel-btn pair-btn" onclick={() => shareWith(LEFT)}>
              Pair
            </button>
          {:else}
            <div class="pair-btn-spacer"></div>
          {/if}

          <div class="bird-slot is-you">
            <SpriteAnim
              src="{base}assets/sprites/ostrich {COLORS[YOU]}.png"
              frames={3}
              fps={4}
              alt=""
              class="bird-sprite {ostrichReact[YOU] ? 'react-shake' : ''}"
            />
            <div class="bird-label">{NAMES[YOU]}</div>
            {#if scores[YOU] > 0 || phase === 'result'}
              <div class="bird-score">
                <SpriteAnim src="{base}assets/sprites/1egg.png" frames={4} fps={6} alt="" class="score-egg" />
                <span class="score-num">{scores[YOU]}</span>
              </div>
            {/if}
          </div>

          {#if phase === 'idle' || phase === 'result'}
            <button class="pixel-btn pair-btn" onclick={() => shareWith(RIGHT)}>
              Pair
            </button>
          {:else}
            <div class="pair-btn-spacer"></div>
          {/if}
        </div>

        {#if phase === 'animating'}
          <div class="phase-label">Sharing...</div>
        {/if}

        {#if phase === 'result'}
          <div class="phase-label result-label">{resultText}</div>
        {/if}

        <div class="game-footer">
          {#if round > 0}
            <span class="round-badge">Round {round}</span>
          {/if}
          <button
            class="pixel-btn reset-btn"
            onclick={resetGame}
            disabled={phase === 'animating'}
          >
            Reset
          </button>
        </div>
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
    grid-template-columns: 1fr 1fr;
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

  .counter-desc {
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .game-stage {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0 8px;
    min-height: 260px;
  }

  .fx-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5;
    overflow: hidden;
  }

  .birds-top {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 16px;
  }

  .bird-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .bird-slot.is-you {
  }

  .center-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: auto;
    margin-bottom: 12px;
  }

  .pair-btn-spacer {
    width: 90px;
  }

  :global(.bird-sprite) {
    width: 60px;
    height: 60px;
  }

  .bird-slot.is-you :global(.bird-sprite) {
    width: 76px;
    height: 76px;
  }

  :global(.bird-sprite.react-shake) {
    animation: shake 200ms ease-in-out;
  }

  .bird-label {
    font-family: var(--pixel);
    font-size: 9px;
    color: var(--text-dim);
  }

  .bird-slot.is-you .bird-label {
    color: var(--gold);
    font-size: 10px;
  }

  .bird-score {
    display: flex;
    align-items: center;
    gap: 2px;
    animation: score-in 300ms ease-out;
  }

  :global(.score-egg) {
    width: 18px;
    height: 18px;
  }

  .score-num {
    font-family: var(--pixel);
    font-size: 14px;
    color: var(--gold);
  }

  .bird-slot.is-you .score-num {
    font-size: 16px;
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

  .pixel-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pair-btn {
    min-width: 90px;
    justify-content: center;
  }

  :global(.btn-heart) {
    width: 18px;
    height: 18px;
  }

  .reset-btn {
    background: var(--bg-card);
    border-color: var(--text-dim);
  }

  .phase-label {
    font-family: var(--pixel);
    font-size: 11px;
    color: var(--text-dim);
    margin: 16px 0 8px;
    min-height: 18px;
  }

  .result-label {
    color: var(--gold);
  }

  .game-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 8px;
  }

  .round-badge {
    font-family: var(--pixel);
    font-size: 11px;
    color: var(--gold);
    background: var(--bg-deeper);
    border: 2px solid var(--gold);
    padding: 4px 10px;
  }

  .heart-proj {
    position: absolute;
    width: 28px;
    height: 28px;
    left: calc(var(--fx-x) - 14px);
    top: calc(var(--fx-y) - 14px);
    transition:
      left 600ms cubic-bezier(0.4, 0, 0.6, 1),
      top 600ms cubic-bezier(0.4, 0, 0.6, 1);
    opacity: 1;
    z-index: 6;
  }

  .heart-proj.fly-active {
    left: calc(var(--to-x) - 14px);
    top: calc(var(--to-y) - 14px);
  }

  .heart-proj.burst {
    animation: burst 400ms ease-out forwards;
  }

  :global(.heart-proj .heart-img) {
    width: 28px;
    height: 28px;
  }

  .delta-pop {
    position: absolute;
    left: calc(var(--fx-x) - 16px);
    top: calc(var(--fx-y) + 20px);
    font-family: var(--pixel);
    font-size: 16px;
    color: #44ff88;
    text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.6);
    animation: float-up 1.4s ease-out forwards;
    z-index: 7;
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

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }

  @keyframes burst {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.8);
      opacity: 0.6;
    }
    100% {
      transform: scale(2.4);
      opacity: 0;
    }
  }

  @keyframes float-up {
    0% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-48px);
    }
  }

  @keyframes score-in {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 768px) {
    .demo-layout {
      grid-template-columns: 1fr;
    }
    :global(.bird-sprite) {
      width: 48px;
      height: 48px;
    }
    .bird-slot.is-you :global(.bird-sprite) {
      width: 60px;
      height: 60px;
    }
  }
</style>
