<script setup></script>

<!-- OffSeason.vue -->
<template>
  <div class="off-season-modal">
    <div class="off-season-content">
      <div class="label kicker">CHEQUERED FLAG</div>
      <h2>Season’s over 🥹</h2>
      <p class="label">Enjoy winter break — see you next year on the grid! 🏎️❄️</p>
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
  padding: 24px;
  background: rgba(5, 5, 15, 0.75); /* transparent dark overlay */
  backdrop-filter: blur(4px);
  z-index: 9999; /* above Swiper, racecar, everything */
}

.off-season-content {
  width: 100%;
  max-width: 320px;
  box-sizing: border-box;
  background: var(--panel-bg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-top: 6px solid var(--team-color);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #fff;
}

.kicker {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

h2 {
  margin: 0;
  font-weight: 400;
  font-style: italic;
  font-size: 28px;
  line-height: 1.1;
}

p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: normal;
  color: rgba(255, 255, 255, 0.82);
}
</style>
