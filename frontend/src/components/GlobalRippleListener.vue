<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { createRipple } from '../utils/ripple.js';

const router = useRouter();
const navigationTimers = new Set();

function handleClick(event) {
  const target = event.target.closest('button, a');
  if (!target) return;

  createRipple(event);

  const href = target.getAttribute('href');
  const shouldDelayNavigation =
    target.tagName === 'A' &&
    href?.startsWith('/') &&
    !target.hasAttribute('target') &&
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey;

  if (!shouldDelayNavigation) return;

  event.preventDefault();

  const timer = window.setTimeout(() => {
    navigationTimers.delete(timer);
    router.push(href);
  }, 200);

  navigationTimers.add(timer);
}

onMounted(() => {
  document.addEventListener('click', handleClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClick, true);
  navigationTimers.forEach((timer) => window.clearTimeout(timer));
  navigationTimers.clear();
});
</script>

