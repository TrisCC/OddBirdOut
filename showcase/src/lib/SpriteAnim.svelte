<script>
  let {
    src = '',
    frames = 1,
    fps = 4,
    alt = '',
    class: className = '',
    style: inlineStyle = '',
    loop = true,
    bounce = true,
  } = $props();

  let frame = $state(0);
  let dir = $state(1);

  $effect(() => {
    if (frames <= 1) return;
    const interval = setInterval(() => {
      if (bounce && frames > 2) {
        const next = frame + dir;
        if (next >= frames) { frame = frames - 2; dir = -1; }
        else if (next < 0) { frame = 1; dir = 1; }
        else { frame = next; }
      } else {
        frame = (frame + 1) % frames;
        if (!loop && frame === 0) {
          clearInterval(interval);
        }
      }
    }, 1000 / fps);
    return () => clearInterval(interval);
  });

  function resetPlay() {
    if (frames <= 1) return;
    frame = 0;
    dir = 1;
  }
</script>

{#if frames > 1}
  <span
    class={`sprite-anim ${className}`}
    role="img"
    aria-label={alt}
    onmouseenter={resetPlay}
    style={inlineStyle}
  >
    <img
      {src}
      alt=""
      aria-hidden="true"
      style="height: 100%; width: auto; image-rendering: pixelated; transform: translateX({-frame * 100 / frames}%)"
    />
  </span>
{:else}
  <img
    class={className}
    {src}
    {alt}
    style="image-rendering: pixelated"
  />
{/if}

<style>
  .sprite-anim {
    display: inline-block;
    overflow: hidden;
    vertical-align: middle;
  }
</style>
