<script setup></script>

<!-- OffSeason.vue -->
<template>
  <div class="off-season-modal">
    <div class="off-season-content">
      <h2>Season’s over 🥹</h2>
      <p>Enjoy winter break — see you next year on the grid! 🏎️❄️</p>
    </div>
  </div>
</template>

<style scoped>
.off-season-modal {
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 15, 0.75); /* transparent dark overlay */
  backdrop-filter: blur(4px);
  z-index: 9999; /* above Swiper, racecar, everything */
}

.off-season-content {
  background: rgba(0, 0, 0, 0.85);
  border-radius: 16px;
  padding: 2rem 2.5rem;
  text-align: center;
  color: #fff;
  font-family: system-ui, sans-serif;
  max-width: 320px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
}
</style>

