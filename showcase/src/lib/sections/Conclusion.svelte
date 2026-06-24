<script>
  let { visible } = $props();
</script>

<section id="conclusion" class="content-section {visible ? 'visible' : ''}">
  <h2>Reflection &amp; Results</h2>

  <div class="reflection-grid">
    <article class="pixel-card">
      <h3>The Magic Circle</h3>
      <p>
        A game can create a protective "magic circle" — a sense that "it's only
        a game" — which gives players emotional distance. We addressed this by
        making sure exclusion happens even when a player <strong>genuinely
        cooperates</strong>, keeping competition light, and limiting
        communication between players so the uncertainty remains.
      </p>
    </article>

    <article class="pixel-card">
      <h3>The Tension</h3>
      <p>
        The elements that make the installation fun — competition and a clear
        goal — are also the ones that can <strong>weaken the feeling of
        ostracism</strong> by giving players a rational explanation for being
        left out. We cannot claim the exhibition reproduces the measured
        effects of a controlled study, but the experience is grounded in
        established paradigms that show how little manipulation is needed.
      </p>
    </article>

    <article class="pixel-card">
      <h3>Our Doubts</h3>
      <p>
        Does the short exposure (12 rounds, ~3 minutes of gameplay) create a
        strong enough emotional response? Will the "game" framing cause people
        to dismiss the ostracism as part of the rules? These are questions
        we continue to explore as we observe how visitors interact with the
        installation.
      </p>
    </article>

    <article class="pixel-card">
      <h3>Future Work</h3>
      <p>
        We see potential in extending the concept beyond three players, adding
        more nuanced social interactions, or incorporating real-time biometric
        feedback to study the physical effects of digital ostracism. The
        installation could also be adapted for educational settings to teach
        about the psychological impact of social media dynamics.
      </p>
    </article>
  </div>

  <div class="decorative-divider" aria-hidden="true">
    <img src="/assets/sprites/1egg.png" alt="" class="divider-egg" />
    <img src="/assets/sprites/2egg.png" alt="" class="divider-egg" />
    <img src="/assets/sprites/3egg.png" alt="" class="divider-egg" />
  </div>

  <div class="references">
    <h3>References</h3>
    <ul>
      <li>
        Williams, K. D., &amp; Jarvis, B. (2006). Cyberball: A program for use in
        research on interpersonal ostracism and acceptance. <em>Behavior Research
        Methods</em>, <em>38</em>(1), 174–180.
      </li>
      <li>
        Wolf, W., Levordashka, A., Ruff, J. R., Kraaijeveld, S., Lueckmann, J.,
        &amp; Williams, K. D. (2014). Ostracism Online: A social media ostracism
        paradigm. <em>Behavior Research Methods</em>, <em>47</em>(2), 361–373.
      </li>
    </ul>
  </div>
</section>

<style>
  .content-section { opacity: 0; transform: translateY(30px); transition: opacity 0.8s ease-out, transform 0.8s ease-out; }
  .content-section.visible { opacity: 1; transform: translateY(0); }

  .reflection-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 48px;
  }

  .reflection-grid h3 {
    font-size: 14px;
    color: var(--gold);
  }

  .reflection-grid p {
    font-size: 15px;
    line-height: 1.6;
  }

  .divider-egg {
    width: 28px;
    image-rendering: pixelated;
    animation: bob 2s ease-in-out infinite;
  }

  .divider-egg:nth-child(2) { animation-delay: 0.3s; }
  .divider-egg:nth-child(3) { animation-delay: 0.6s; }

  .references {
    max-width: 750px;
    margin: 48px auto 0;
  }

  .references h3 {
    font-size: 16px;
    color: var(--orange);
    margin-bottom: 16px;
  }

  .references ul {
    list-style: none;
    padding: 0;
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.8;
  }

  .references li {
    padding-left: 20px;
    border-left: 3px solid var(--bg-deeper);
    margin-bottom: 12px;
  }

  .references em {
    font-style: italic;
    color: var(--text);
  }

  @media (max-width: 768px) {
    .reflection-grid { grid-template-columns: 1fr; }
  }
</style>
