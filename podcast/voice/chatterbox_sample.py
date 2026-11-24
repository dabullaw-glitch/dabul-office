# Free Hebrew voice sample with Chatterbox Multilingual (open source, runs on CPU).
import os, re, time, subprocess, torch, soundfile as sf, numpy as np
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

DEFAULT = (
    "שלום, ואני יקיר דבול. ברוכים הבאים לנדל״ן בגובה העיניים, הפודקאסט שמסביר בשפה פשוטה מה באמת קורה כשקונים או מוכרים דירה. "
    "היום נדבר על הערת אזהרה. מה היא, למה רושמים אותה כבר ביום החתימה, ומה קורה אם שוכחים. "
    "בעסקאות שאני מלווה, זה אחד הצעדים הראשונים שעושים אחרי החתימה על החוזה. "
    "אז בואו נתחיל."
)
text = os.environ.get('TEXT') or DEFAULT
sents = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
for ref in ['ref1', 'ref2']:
    t0 = time.time(); parts = []
    for s in sents:
        wav = model.generate(s, language_id='he', audio_prompt_path=f'out/{ref}.wav', exaggeration=0.45, cfg_weight=0.5)
        parts.append(wav.squeeze(0).numpy()); parts.append(np.zeros(int(model.sr * 0.25), dtype=np.float32))
    audio = np.concatenate(parts)
    sf.write(f'out/{ref}-he.wav', audio, model.sr)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'out/{ref}-he.wav', '-af', 'loudnorm', '-b:a', '128k', f'out/sample-{ref}.mp3'], check=True)
    print(ref, 'seconds of audio', round(len(audio) / model.sr, 1), 'took', round(time.time() - t0), 's')
