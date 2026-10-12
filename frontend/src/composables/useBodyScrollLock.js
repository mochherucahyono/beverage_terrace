import { watch, onBeforeUnmount, toValue } from 'vue';

let lockCount = 0;
let prevOverflow = '';
let prevPaddingRight = '';

const lock = () => {
    if (lockCount === 0) {
        // Lebar scrollbar di desktop, supaya halaman tidak "melompat" saat scrollbar hilang
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        prevOverflow = document.body.style.overflow;
        prevPaddingRight = document.body.style.paddingRight;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
    }
    lockCount++;
};

const unlock = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;
    }
};

// isOpen: ref(boolean) atau getter, misalnya () => props.open
export function useBodyScrollLock(isOpen) {
    let locked = false;

    watch(
        () => toValue(isOpen),
        (open) => {
            if (open && !locked) {
                lock();
                locked = true;
            } else if (!open && locked) {
                unlock();
                locked = false;
            }
        }, { immediate: true }
    );

    // Jaga-jaga: kalau komponen dilepas saat modal masih terbuka (pindah halaman)
    onBeforeUnmount(() => {
        if (locked) {
            unlock();
            locked = false;
        }
    });
}