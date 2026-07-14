(function () {
    var root = document.documentElement;
    var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- theme ---------- */

    var toggle = document.getElementById('theme-toggle');

    function syncToggle() {
        var dark = root.dataset.theme === 'dark';
        toggle.setAttribute('aria-pressed', String(dark));
        toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.setAttribute('data-pill', dark ? 'lights on' : 'lights off');
    }

    if (toggle) {
        syncToggle();
        toggle.addEventListener('click', function () {
            var dark = root.dataset.theme === 'dark';
            if (dark) {
                delete root.dataset.theme;
            } else {
                root.dataset.theme = 'dark';
            }
            localStorage.setItem('theme', dark ? 'light' : 'dark');
            syncToggle();
        });
    }

    /* ---------- surface / put back ---------- */

    var trigger = document.getElementById('surface');

    if (trigger) {
        trigger.addEventListener('click', function () {
            var open = root.classList.toggle('surfaced-open');
            trigger.setAttribute('aria-expanded', String(open));
            trigger.setAttribute('data-pill', open ? 'put it back' : 'curious?');
        });
    }

    /* ---------- background sound: a soft generative drone ---------- */

    var music = document.getElementById('music');
    var audioCtx = null;

    function buildDrone() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var master = audioCtx.createGain();
        master.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.045, audioCtx.currentTime + 3);
        master.connect(audioCtx.destination);

        var filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 850;
        filter.connect(master);

        /* C3 · G3 · C4 · E4 — quiet detuned sines, each breathing on its own clock */
        [130.81, 196.0, 261.63, 329.63].forEach(function (freq, i) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.detune.value = i % 2 ? 4 : -3;

            var gain = audioCtx.createGain();
            gain.gain.value = 0.22 / (i + 1);

            var lfo = audioCtx.createOscillator();
            lfo.frequency.value = 0.04 + i * 0.028;
            var lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 0.09 / (i + 1);
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            osc.connect(gain);
            gain.connect(filter);
            osc.start();
            lfo.start();
        });
    }

    function setMusicState(playing) {
        music.classList.toggle('muted', !playing);
        music.setAttribute('aria-pressed', String(playing));
        music.setAttribute('data-pill', playing ? 'hush' : 'play something');
        localStorage.setItem('music', playing ? 'on' : 'off');
    }

    if (music) {
        music.addEventListener('click', function () {
            if (!audioCtx) {
                buildDrone();
                setMusicState(true);
            } else if (audioCtx.state === 'running') {
                audioCtx.suspend();
                setMusicState(false);
            } else {
                audioCtx.resume();
                setMusicState(true);
            }
        });

        /* if it was playing on the last page, resume on the first gesture here
           (browsers won't let sound start without one) */
        if (localStorage.getItem('music') === 'on') {
            var resumeOnce = function () {
                if (!audioCtx) {
                    buildDrone();
                    setMusicState(true);
                }
                removeEventListener('pointerdown', resumeOnce);
                removeEventListener('keydown', resumeOnce);
            };
            addEventListener('pointerdown', resumeOnce);
            addEventListener('keydown', resumeOnce);
        }
    }

    /* ---------- copy email ---------- */

    var copyBtn = document.getElementById('copy-email');

    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            navigator.clipboard.writeText('deepanshuchaudharyy@gmail.com').then(function () {
                copyBtn.setAttribute('data-pill', 'copied.');
                setTimeout(function () {
                    copyBtn.setAttribute('data-pill', 'deepanshuchaudharyy@gmail.com');
                }, 1400);
            });
        });
    }

    /* ---------- metaballs: four wanderers + one cursor follower ---------- */

    var ballEls = [].slice.call(document.querySelectorAll('.ball'));
    var nameEl = document.getElementById('name');
    var overlays = [].slice.call(document.querySelectorAll('.name-overlay'));

    if (!ballEls.length) return;

    var W = innerWidth;
    var H = innerHeight;

    addEventListener('resize', function () {
        W = innerWidth;
        H = innerHeight;
    });

    /* base position (viewport fractions), wander amplitude, speed, phase */
    var conf = [
        { x: 0.78, y: 0.24, ax: 0.10, ay: 0.13, s: 0.00016, p: 0.0 },
        { x: 0.16, y: 0.72, ax: 0.12, ay: 0.09, s: 0.00021, p: 2.1 },
        { x: 0.64, y: 0.78, ax: 0.09, ay: 0.11, s: 0.00018, p: 4.2 },
        { x: 0.26, y: 0.20, ax: 0.11, ay: 0.10, s: 0.00024, p: 1.3 }
    ];

    var balls = ballEls.map(function (el, i) {
        var r = el.offsetWidth / 2;
        return { el: el, r: r, x: W / 2, y: H / 2, cursor: i === conf.length };
    });

    var mouse = { x: W * 0.5, y: H * 0.36, seen: false };

    addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.seen = true;
    }, { passive: true });

    function place(t) {
        balls.forEach(function (b, i) {
            if (b.cursor) {
                if (mouse.seen) {
                    b.x += (mouse.x - b.x) * 0.09;
                    b.y += (mouse.y - b.y) * 0.09;
                } else {
                    /* no pointer yet (or touch device): wander gently instead */
                    b.x = W * (0.5 + 0.16 * Math.sin(t * 0.00019 + 3.0));
                    b.y = H * (0.42 + 0.13 * Math.cos(t * 0.00023 + 1.7));
                }
            } else {
                var c = conf[i];
                b.x = W * (c.x + c.ax * Math.sin(t * c.s + c.p));
                b.y = H * (c.y + c.ay * Math.cos(t * c.s * 1.16 + c.p));
            }
            b.el.style.transform = 'translate3d(' + (b.x - b.r) + 'px,' + (b.y - b.r) + 'px,0)';
        });

        /* recolor the name where a ball passes behind it */
        if (nameEl && overlays.length) {
            var rect = nameEl.getBoundingClientRect();
            overlays.forEach(function (ov, i) {
                var b = balls[i];
                if (!b) return;
                ov.style.clipPath = 'circle(' + b.r * 0.92 + 'px at ' +
                    (b.x - rect.left) + 'px ' + (b.y - rect.top) + 'px)';
            });
        }
    }

    if (reduceMotion) {
        place(0); /* static composition, no drift, no follow */
    } else {
        requestAnimationFrame(function frame(t) {
            place(t);
            requestAnimationFrame(frame);
        });
    }
})();
