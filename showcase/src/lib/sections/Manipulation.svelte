<script>
  import SpriteAnim from "../SpriteAnim.svelte";
  let { visible } = $props();
  let revealActive = $state(false);
  const base = import.meta.env.BASE_URL;

  const illusions = [
    {
      id: "A",
      label: "Player A sees:",
      desc: "B and C ally together against A.",
      color: "#4CAF50",
      ally1: "blue",
      ally2: "orange",
      leftout: "green",
    },
    {
      id: "B",
      label: "Player B sees:",
      desc: "A and C ally together against B.",
      color: "#42A5F5",
      ally1: "green",
      ally2: "orange",
      leftout: "blue",
    },
    {
      id: "C",
      label: "Player C sees:",
      desc: "A and B ally together against C.",
      color: "#FF9800",
      ally1: "green",
      ally2: "blue",
      leftout: "orange",
    },
  ];

  const truth = {
    desc: "In reality, nobody was excluded. All three players were subjected to the <strong>same manipulation</strong> at the same time. The interface fabricated every rejection.",
  };
</script>

<section id="manipulation" class="content-section {visible ? 'visible' : ''}">
  <h2>The Catch: How We Manipulate the Game</h2>

  <p class="section-intro">
    After round 6, the server <strong
      >stops broadcasting the true actions</strong
    >. Instead, it generates a tailored reality for each player in which the
    <em>other two players</em> appear to cooperate exclusively and reject the
    one watching. Every player privately believes <strong>they</strong> are the odd
    bird out.
  </p>

  <div class="illusion-grid">
    {#each illusions as ill}
      <div class="illusion-card pixel-card" style="--player-color: {ill.color}">
        <div class="player-badge" style="background: {ill.color}">
          {ill.id}
        </div>
        <h3>{ill.label}</h3>
        <p>{ill.desc}</p>
        <div class="mini-scene" aria-hidden="true">
          <div class="scene-top-row">
            <SpriteAnim
              src="{base}assets/sprites/ostrich {ill.ally1}.png"
              frames={3}
              fps={4}
              alt=""
              class="scene-ostrich scene-ostrich--ally"
            />
            <SpriteAnim
              src="{base}assets/sprites/heart.png"
              frames={4}
              fps={6}
              alt=""
              class="scene-heart"
            />
            <SpriteAnim
              src="{base}assets/sprites/ostrich {ill.ally2}.png"
              frames={3}
              fps={4}
              alt=""
              class="scene-ostrich scene-ostrich--ally"
            />
          </div>
          <SpriteAnim
            src="{base}assets/sprites/ostrich {ill.leftout}.png"
            frames={3}
            fps={4}
            alt=""
            class="scene-ostrich scene-ostrich--leftout"
          />
        </div>
      </div>
    {/each}
  </div>

  <div class="reveal-section">
    <button
      class="reveal-btn"
      class:revealed={revealActive}
      onclick={() => (revealActive = true)}
      disabled={revealActive}
    >
      {revealActive ? "The Truth" : "What really happened?"}
    </button>

    {#if revealActive}
      <div class="truth-card pixel-card reveal-enter">
        <div class="reveal-screenshot">
          <img
            src="{base}assets/screenshots/sc_reveal.png"
            alt="Reveal screen showing true scores"
          />
        </div>
        <div class="truth-text">
          <h3>The Reveal</h3>
          <p>{@html truth.desc}</p>
        </div>
      </div>
    {/if}
  </div>

  <div class="statement-block">
    <h2 class="statement-title">Exclusion is impersonal.</h2>
    <p>
      The painful feeling of being the odd one out was produced by the
      <strong>interface</strong>, not by any real social decision. All three
      players felt singled out, which is only possible if the exclusion was
      never really about them as individuals. The installation invites visitors
      to reconsider moments of feeling ignored online: how many were genuine
      rejections, and how many were gaps in meaning they filled in themselves?
    </p>
  </div>

  <div class="decorative-divider bottom-divider" aria-hidden="true">
    <SpriteAnim
      src="{base}assets/sprites/blue ostrich in sand.png"
      frames={6}
      fps={6}
      alt=""
      class="scene-sand"
    />
    <SpriteAnim
      src="{base}assets/sprites/red ostrich in sand.png"
      frames={6}
      fps={6}
      alt=""
      class="scene-sand"
    />
    <SpriteAnim
      src="{base}assets/sprites/green ostrich in sand.png"
      frames={6}
      fps={6}
      alt=""
      class="scene-sand"
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
    margin-bottom: 48px;
  }

  .illusion-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 48px;
  }

  .illusion-card {
    text-align: center;
    border-top: 6px solid var(--player-color, var(--gold));
  }

  .player-badge {
    width: 44px;
    height: 44px;
    border-radius: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--pixel);
    font-size: 20px;
    color: #fff;
    margin-bottom: 12px;
    box-shadow: var(--shadow-pixel);
  }

  .illusion-card h3 {
    font-size: 13px;
    color: var(--text-h);
    margin-bottom: 12px;
  }

  .illusion-card p {
    font-size: 14px;
  }

  .mini-scene {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .scene-top-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.scene-ostrich) {
    width: 48px;
    height: 48px;
  }
  :global(.scene-top-row .scene-ostrich--ally) {
    width: 40px;
    height: 40px;
  }
  :global(.scene-ostrich--leftout) {
    width: 56px;
    height: 56px;
    opacity: 0.4;
    filter: grayscale(0.5);
    animation: bob 2.5s ease-in-out infinite;
  }
  :global(.scene-ostrich--ally) {
    animation: bob 2s ease-in-out infinite;
  }
  :global(.scene-top-row .scene-ostrich--ally:last-child) {
    animation-delay: 0.3s;
  }

  :global(.scene-heart) {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .reveal-section {
    text-align: center;
    margin-bottom: 48px;
  }

  .reveal-btn {
    font-family: var(--pixel);
    font-size: 20px;
    background: var(--green);
    color: #fff;
    border: 4px solid #2e7d32;
    padding: 20px 48px;
    cursor: pointer;
    box-shadow: var(--shadow-pixel);
    transition:
      transform 0.1s,
      background 0.3s;
  }

  .reveal-btn:hover:not(:disabled) {
    background: #388e3c;
  }

  .reveal-btn:active:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.4);
  }

  .reveal-btn.revealed {
    background: var(--bg-card);
    border-color: var(--gold);
    color: var(--gold);
  }

  .truth-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    align-items: center;
    margin-top: 32px;
    text-align: left;
    border-top: 6px solid var(--gold);
  }

  .reveal-screenshot img {
    width: 100%;
    border: 3px solid var(--bg-deeper);
  }

  .truth-text h3 {
    font-size: 16px;
    color: var(--gold);
  }

  .truth-text p {
    font-size: 15px;
  }

  .statement {
    color: var(--gold);
    border-left: 4px solid var(--gold);
    padding-left: 16px;
    margin-top: 20px;
    font-size: 16px;
  }

  @keyframes revealEnter {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .reveal-enter {
    animation: revealEnter 0.6s ease-out;
  }

  .statement-block {
    text-align: center;
    max-width: 750px;
    margin: 0 auto;
  }

  .statement-title {
    font-size: 32px;
    color: var(--gold);
    margin-bottom: 24px;
  }

  @media (max-width: 768px) {
    .illusion-grid {
      grid-template-columns: 1fr;
    }
    .truth-card {
      grid-template-columns: 1fr;
    }
    .statement-title {
      font-size: 22px;
    }
  }
  .bottom-divider {
    margin-top: 48px;
    margin-bottom: 0;
  }

  :global(.scene-sand) {
    width: 60px;
    height: 60px;
    animation: bob 2s ease-in-out infinite;
  }
  :global(.scene-sand:nth-child(1)) {
    animation-delay: 0s;
  }
  :global(.scene-sand:nth-child(2)) {
    animation-delay: 0.4s;
  }
  :global(.scene-sand:nth-child(3)) {
    animation-delay: 0.8s;
  }
</style>
