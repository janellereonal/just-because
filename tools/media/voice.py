import numpy as np, scipy.signal as sg, scipy.io.wavfile as wf, sys
SR=24000
def note(f, dur, vib=5.2, depth=0.012, vowel=(700,1200,2600)):
    t=np.arange(int(SR*dur))/SR
    ph=2*np.pi*np.cumsum(f*(1+depth*np.sin(2*np.pi*vib*t)*np.minimum(1,t*3)))/SR
    # glottal-ish source: sum of harmonics with falling amplitude
    x=sum((1/k**1.2)*np.sin(k*ph) for k in range(1,18))
    x+=np.random.randn(len(t))*0.04
    # formants
    y=np.zeros_like(x)
    for fc,g in zip(vowel,(1,.6,.25)):
        b,a=sg.iirpeak(fc/(SR/2),Q=6); y+=g*sg.lfilter(b,a,x)
    env=np.minimum(1,t/0.06)*np.minimum(1,(dur-t)/0.12)
    return y*np.clip(env,0,1)
def song(notes, tempo=0.42, vowel=(700,1200,2600), base=1.0):
    out=[]
    for n,beats in notes:
        d=beats*tempo
        out.append(note(n*base,d,vowel=vowel) if n else np.zeros(int(SR*d)))
    s=np.concatenate(out); s=s/np.max(np.abs(s))*0.7
    # small room
    ir=np.exp(-np.linspace(0,6,int(SR*.25)))*np.random.randn(int(SR*.25))*0.04; ir[0]=1
    s=np.convolve(s,ir)[:len(s)]; s=s/np.max(np.abs(s))*0.8
    return s
G4,A4,B4,C5,D5,E5,F5,G5=392,440,494,523,587,659,698,784
C4,D4,E4,F4=262,294,330,349
hb=[(G4,.75),(G4,.25),(A4,1),(G4,1),(C5,1),(B4,2),(0,.5),(G4,.75),(G4,.25),(A4,1),(G4,1),(D5,1),(C5,2)]
wf.write('voice-mom.wav',SR,(song(hb,0.42,vowel=(800,1150,2800),base=1.0)*32767).astype(np.int16))
lull=[(E4,1),(G4,1),(C5,2),(B4,1),(A4,1),(G4,2),(A4,1),(B4,1),(C5,1),(E5,1),(D5,3)]
wf.write('voice-grandma.wav',SR,(song(lull,0.5,vowel=(600,1000,2500),base=0.92)*32767).astype(np.int16))
bon=[(C5,.5),(E5,.5),(G5,1),(E5,.5),(G5,.5),(C5,2),(0,.3),(D5,.5),(F5,.5),(A4*2,1),(G5,2)]
wf.write('voice-team.wav',SR,(song(bon,0.36,vowel=(500,900,2400),base=0.75)*32767).astype(np.int16))
