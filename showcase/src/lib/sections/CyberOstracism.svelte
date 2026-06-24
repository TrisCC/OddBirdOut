<script>
  let { visible } = $props();
  const base = import.meta.env.BASE_URL;
</script>

<section
  id="cyber-ostracism"
  class="content-section {visible ? 'visible' : ''}"
>
  <h2>What is Cyber Ostracism?</h2>

  <div class="intro">
    <p>
      Social exclusion does not need to be explicitly stated to be felt. Humans
      are highly sensitive to signs of being left out, because belonging to a
      group is a basic social need. In face-to-face interactions, we rely on
      non-verbal cues such as tone of voice, facial expression, eye contact,
      body language. But digital environments strip away these cues, leaving
      social interactions open to interpretation.
    </p>
    <p>
      Cyber ostracism refers to the experience of being <strong
        >ignored, excluded, or rejected</strong
      >
      in a digital environment. The digital interface becomes an intermediary
      that cannot fully encompass the social situation. There is a
      <strong>gap</strong>
      between what is actually happening and what the user <em>feels</em> is happening.
      The user is left to fill in the meaning, and that uncertainty is what makes
      digital exclusion so potent.
    </p>
  </div>

  <div class="paradigms">
    <article class="pixel-card">
      <div class="paradigm-header">
        <span class="paradigm-icon" aria-hidden="true">&#x26BD;</span>
        <h3>Cyberball (2006)</h3>
      </div>
      <p class="paradigm-meta">Williams &amp; Jarvis</p>
      <p>
        Participants believe they are playing a simple online ball-tossing game
        with two other players. After receiving the ball a few times, the others
        begin <strong>passing only to each other</strong>. Even though the game
        is trivial and the other players are fictional, excluded participants
        reported lower belonging, self-esteem, control, and meaningful
        existence.
      </p>
    </article>

    <article class="pixel-card">
      <div class="paradigm-header">
        <span class="paradigm-icon" aria-hidden="true">&#x2764;</span>
        <h3>Ostracism Online (2014)</h3>
      </div>
      <p class="paradigm-meta">
        Wolf, Levordashka, Ruff, Kraaijeveld, Lueckmann &amp; Williams
      </p>
      <p>
        Built on Cyberball but grounded in social media: participants create
        profiles and receive varying amounts of attention (likes, comments) from
        other profiles. The study showed that varying levels of attention can
        produce ostracism effects, with negative impacts on need-threat and mood
        similar to Cyberball.
      </p>
    </article>
  </div>

  <div class="decorative-divider" aria-hidden="true">
    <img
      src="{base}assets/sprites/blue ostrich in sand.png"
      alt=""
      class="divider-sprite"
    />
    <img
      src="{base}assets/sprites/red ostrich in sand.png"
      alt=""
      class="divider-sprite"
    />
    <img
      src="{base}assets/sprites/green ostrich in sand.png"
      alt=""
      class="divider-sprite"
    />
  </div>

  <p class="bridge">
    These earlier studies show that very little manipulation is needed to make
    people feel excluded. This however applies only when the exclusion comes
    from other people. This is the foundation we built Odd Bird Out upon.
  </p>
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

  .intro {
    max-width: 860px;
    margin-bottom: 48px;
  }

  .paradigms {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 48px;
  }

  .paradigm-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .paradigm-icon {
    font-size: 28px;
  }

  .paradigm-meta {
    font-family: var(--pixel);
    font-size: 11px;
    color: var(--orange);
    margin-bottom: 16px;
    letter-spacing: 0.5px;
  }

  .paradigms p {
    font-size: 16px;
  }

  .insight {
    border-left: 4px solid var(--gold);
    padding-left: 16px;
    margin-top: 16px;
    color: var(--gold);
    font-size: 15px;
  }

  .divider-sprite {
    width: 60px;
    image-rendering: pixelated;
    animation: bob 2s ease-in-out infinite;
    animation-delay: var(--bob-delay, 0s);
  }

  .divider-sprite:nth-child(1) {
    --bob-delay: 0s;
  }
  .divider-sprite:nth-child(2) {
    --bob-delay: 0.4s;
  }
  .divider-sprite:nth-child(3) {
    --bob-delay: 0.8s;
  }

  .bridge {
    text-align: center;
    max-width: 720px;
    margin: 32px auto 0;
    font-size: 17px;
  }

  @media (max-width: 768px) {
    .paradigms {
      grid-template-columns: 1fr;
    }
  }
</style>
