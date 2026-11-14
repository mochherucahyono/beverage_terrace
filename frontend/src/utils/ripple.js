export const createRipple = (e) => {
    // Cari elemen terdekat yang berupa button atau tag a (Link)
    const target = e.target.closest('button, a');
    if (!target) return;

    // Abaikan jika elemen memiliki kelas 'no-ripple'
    if (target.classList.contains('no-ripple') || target.closest('.no-ripple')) return;

    // Hapus gelombang sebelumnya jika ada
    const existingRipple = target.getElementsByClassName('ripple-span')[0];
    if (existingRipple) {
        existingRipple.remove();
    }

    const circle = document.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;

    const rect = target.getBoundingClientRect();

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.style.color = window.getComputedStyle(target).color;
    circle.className = 'ripple-span';

    // Pastikan target punya positioning yang pas untuk menampung ripple
    if (window.getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
    }
    target.style.overflow = 'hidden';

    target.appendChild(circle);

    // Hapus span animasi setelah selesai
    setTimeout(() => {
        circle.remove();
    }, 200);
};