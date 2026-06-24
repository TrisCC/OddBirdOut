<script>
  import { onMount } from 'svelte';
  import Hero from './lib/sections/Hero.svelte';
  import CyberOstracism from './lib/sections/CyberOstracism.svelte';
  import GameDemo from './lib/sections/GameDemo.svelte';
  import Manipulation from './lib/sections/Manipulation.svelte';
  import Conclusion from './lib/sections/Conclusion.svelte';
  import Footer from './lib/sections/Footer.svelte';

  let cyberVisible = $state(false);
  let gameVisible = $state(false);
  let manipVisible = $state(false);
  let conclVisible = $state(false);

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          if (id === 'cyber-ostracism') cyberVisible = true;
          if (id === 'game-demo') gameVisible = true;
          if (id === 'manipulation') manipVisible = true;
          if (id === 'conclusion') conclVisible = true;
        }
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.content-section').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  });

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<main>
  <Hero onScrollClick={() => scrollToSection('cyber-ostracism')} />

  <CyberOstracism visible={cyberVisible} />

  <GameDemo visible={gameVisible} />

  <Manipulation visible={manipVisible} />

  <Conclusion visible={conclVisible} />

  <Footer />
</main>
