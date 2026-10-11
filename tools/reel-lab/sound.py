"""Original sound design for the reel editor v2 (no licensing issues: everything is synthesized here).
python3 sound.py <out_dir> [seconds] [bpm]
Writes: bed.wav (warm, modern music bed in the office's calm-confident mood), whoosh.wav, pop.wav, riser.wav, hit.wav, tick.wav
"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
out = sys.argv[1] if len(sys.argv) > 1 else '.'
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
BPM = float(sys.argv[3]) if len(sys.argv) > 3 else 98.0
rng = np.random.default_rng(7)

def lp(x, f, o=4): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(n, a, d, s=0.0, r=0.0):
    e = np.ones(n) * s
    ai = int(a * SR); di = int(d * SR); ri = int(r * SR)
    ai = min(ai, n); e[:ai] = np.linspace(0, 1, ai)
    di = min(di, n - ai); e[ai:ai + di] = np.linspace(1, s, di) if s else np.linspace(1, 0, di)
    if not s: e[ai + di:] = 0
    if ri and s: e[-ri:] *= np.linspace(1, 0, ri)
    return e
def reverb(x, mix=0.25):
    ir_n = int(1.8 * SR); t = np.arange(ir_n) / SR
    ir = rng.standard_normal(ir_n) * np.exp(-t * 3.2); ir = lp(ir, 6000); ir /= np.abs(ir).sum() ** 0.5 * 40
    wet = np.convolve(x, ir)[:len(x)]
    return x * (1 - mix) + wet * mix
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    wavfile.write(f'{out}/{name}', SR, (st * 32767).astype(np.int16))

# ---------- music bed ----------
n = int(DUR * SR); t = np.arange(n) / SR
beat = 60 / BPM; bar = 4 * beat
# Am - F - C - G (warm, determined), voiced for pads
prog = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
bass_notes = [45, 41, 48, 43]
f = lambda m: 440 * 2 ** ((m - 69) / 12)
pad = np.zeros(n); bass = np.zeros(n); keys = np.zeros(n); drums = np.zeros(n)
nbars = int(np.ceil(DUR / bar)) + 1
for b in range(nbars):
    ch = prog[b % 4]; s0 = int(b * bar * SR); s1 = min(n, int((b + 1) * bar * SR))
    if s0 >= n: break
    seg = np.arange(s1 - s0) / SR
    e = np.minimum(1, seg / 0.35) * np.minimum(1, (bar - seg) / 0.25)
    for m in ch:  # soft detuned saw pad
        for dt in (-0.07, 0.07):
            ph = 2 * np.pi * f(m + dt) * seg
            pad[s0:s1] += (2 * ((f(m + dt) * seg) % 1) - 1) * e * 0.05
    # bass: root on 1 and the "and" of 3
    for off, ln in ((0, 2.2 * beat), (2.5 * beat, 1.2 * beat)):
        a0 = s0 + int(off * SR); a1 = min(n, a0 + int(ln * SR))
        if a0 >= n: continue
        sg = np.arange(a1 - a0) / SR
        bass[a0:a1] += np.sin(2 * np.pi * f(bass_notes[b % 4]) * sg) * env(a1 - a0, 0.01, ln, 0.6, 0.08) * 0.35
    # plucked keys arpeggio in 8ths
    for k in range(8):
        a0 = s0 + int(k * beat / 2 * SR); a1 = min(n, a0 + int(0.5 * SR))
        if a0 >= n: continue
        m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 12
        sg = np.arange(a1 - a0) / SR
        keys[a0:a1] += (np.sin(2 * np.pi * f(m) * sg) + 0.3 * np.sin(4 * np.pi * f(m) * sg)) * np.exp(-sg * 7) * 0.09
    # drums: kick on 1 & 3, snap on 2 & 4, soft hats on 8ths (enter after bar 1)
    if b >= 1:
        for k in range(4):
            a0 = s0 + int(k * beat * SR)
            if a0 >= n: continue
            if k in (0, 2):
                ln = int(0.35 * SR); sg = np.arange(min(ln, n - a0)) / SR
                fr = 52 + 90 * np.exp(-sg * 30)
                drums[a0:a0 + len(sg)] += np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-sg * 9) * 0.55
            else:
                ln = int(0.18 * SR); m_ = min(ln, n - a0)
                drums[a0:a0 + m_] += bp(rng.standard_normal(m_), 1500, 5000) * np.exp(-np.arange(m_) / SR * 28) * 0.22
        for k in range(8):
            a0 = s0 + int(k * beat / 2 * SR); m_ = min(int(0.05 * SR), n - a0)
            if m_ > 0: drums[a0:a0 + m_] += hp(rng.standard_normal(m_), 8000) * np.exp(-np.arange(m_) / SR * 90) * (0.06 if k % 2 else 0.09)
pad = lp(pad, 2200); keys = lp(keys, 5000)
mix = reverb(pad * 0.9 + keys, 0.3) + lp(bass, 400) + drums
fade = np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 2.0)
save('bed.wav', norm(mix * fade, 0.8))

# ---------- sound effects ----------
def whoosh(d=0.55):
    m = int(d * SR); s = np.arange(m) / SR
    x = rng.standard_normal(m); cen = 400 + 5200 * np.sin(np.pi * s / d) ** 2
    y = np.zeros(m); blk = 512
    for i in range(0, m, blk):
        c = cen[i]; y[i:i + blk] = bp(x[i:i + blk], max(150, c * 0.6), min(16000, c * 1.4), 1)
    return norm(reverb(y * np.sin(np.pi * s / d) ** 1.5, 0.2), 0.7)
def pop():
    m = int(0.16 * SR); s = np.arange(m) / SR; fr = 900 * np.exp(-s * 18) + 320
    return norm(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-s * 26), 0.6)
def riser(d=1.2):
    m = int(d * SR); s = np.arange(m) / SR; fr = 180 * 2 ** (s / d * 3)
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.4 + hp(rng.standard_normal(m), 3000) * 0.25 * (s / d)
    return norm(reverb(tone * (s / d) ** 2, 0.3), 0.6)
def hit():
    m = int(1.2 * SR); s = np.arange(m) / SR
    k = np.sin(2 * np.pi * np.cumsum(45 + 140 * np.exp(-s * 25)) / SR) * np.exp(-s * 5)
    nz = lp(rng.standard_normal(m), 3000) * np.exp(-s * 9) * 0.5
    return norm(reverb(k + nz, 0.35), 0.8)
def tick():
    m = int(0.06 * SR); s = np.arange(m) / SR
    return norm(np.sin(2 * np.pi * 2400 * s) * np.exp(-s * 80), 0.45)
for nm, fn in (('whoosh.wav', whoosh), ('pop.wav', pop), ('riser.wav', riser), ('hit.wav', hit), ('tick.wav', tick)):
    save(nm, fn())
print('ok', DUR, BPM)
