#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generates crisp 16-bit PCM .wav sound effects and 4 distinct time-of-day/weather
ambient nature loops for Cloud Isle Market (Phase 3):
- harvest_pop.wav (plucky pop when harvesting crops / eating snacks)
- meso_coin.wav (bright metallic dual-tone coin chime)
- water_splash.wav (soft bubbly water droplet chime)
- wood_build.wav (warm wooden mallet tap + upgrade arpeggio)
- ui_click.wav & ui_hover.wav (wooden button click/hover)
- ambient_day.wav (sunny morning birdsong chirps + babbling brook)
- ambient_dusk.wav (warm sunset breeze + soft wooden wind chime)
- ambient_night.wav (gentle night crickets + mystic forest pad)
- ambient_rain.wav (pitter-patter magic rain + crystalline bell chime)
"""

import math
import os
import random
import struct
import wave

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_DIR = os.path.join(BASE_DIR, "assets", "sfx")
SAMPLE_RATE = 44100


def write_wav(filename: str, samples: list[float]) -> None:
    os.makedirs(SFX_DIR, exist_ok=True)
    path = os.path.join(SFX_DIR, filename)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        buf = bytearray()
        for s in samples:
            clamped = max(-0.98, min(0.98, s))
            buf.extend(struct.pack("<h", int(clamped * 32767.0)))
        wf.writeframes(bytes(buf))


def gen_harvest_pop() -> list[float]:
    dur = 0.16
    n = int(SAMPLE_RATE * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 340.0 + 580.0 * math.pow(t / dur, 0.65)
        phase += 2.0 * math.pi * freq / SAMPLE_RATE
        env = math.sin(math.pi * (t / dur)) * math.exp(-t * 9.0)
        val = (0.75 * math.sin(phase) + 0.25 * math.sin(phase * 2.0)) * env * 0.45
        out.append(val)
    return out


def gen_meso_coin() -> list[float]:
    dur = 0.34
    n = int(SAMPLE_RATE * dur)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        if t < 0.075:
            f = 987.77
            local_t = t
            env = math.exp(-local_t * 18.0)
        else:
            f = 1318.51
            local_t = t - 0.075
            env = math.exp(-local_t * 9.5)
        val = (
            0.65 * math.sin(2.0 * math.pi * f * t)
            + 0.25 * math.sin(2.0 * math.pi * (f * 2.0) * t)
            + 0.10 * math.sin(2.0 * math.pi * (f * 3.0) * t)
        ) * env * 0.38
        out.append(val)
    return out


def gen_water_splash() -> list[float]:
    dur = 0.24
    n = int(SAMPLE_RATE * dur)
    out = []
    phase = 0.0
    rng = random.Random(42)
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 520.0 + 380.0 * math.sin(t * 28.0)
        phase += 2.0 * math.pi * freq / SAMPLE_RATE
        env = math.exp(-t * 14.0)
        noise = (rng.random() * 2.0 - 1.0) * math.exp(-t * 22.0) * 0.12
        val = (math.sin(phase) * 0.28 * env) + noise
        out.append(val)
    return out


def gen_wood_build() -> list[float]:
    dur = 0.42
    n = int(SAMPLE_RATE * dur)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.0
        if t < 0.10:
            env = math.exp(-t * 38.0)
            val += math.sin(2.0 * math.pi * 210.0 * t) * env * 0.45
        if 0.10 <= t < 0.20:
            lt = t - 0.10
            env = math.exp(-lt * 36.0)
            val += math.sin(2.0 * math.pi * 260.0 * lt) * env * 0.48
        if t >= 0.18:
            lt = t - 0.18
            env = math.exp(-lt * 10.0)
            val += (
                0.35 * math.sin(2.0 * math.pi * 523.25 * lt)
                + 0.30 * math.sin(2.0 * math.pi * 659.25 * lt)
                + 0.25 * math.sin(2.0 * math.pi * 783.99 * lt)
                + 0.20 * math.sin(2.0 * math.pi * 1046.50 * lt)
            ) * env * 0.35
        out.append(val)
    return out


def gen_ui_click() -> list[float]:
    dur = 0.065
    n = int(SAMPLE_RATE * dur)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 55.0)
        val = (0.7 * math.sin(2.0 * math.pi * 680.0 * t) + 0.3 * math.sin(2.0 * math.pi * 1120.0 * t)) * env * 0.32
        out.append(val)
    return out


def gen_ui_hover() -> list[float]:
    dur = 0.035
    n = int(SAMPLE_RATE * dur)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 85.0)
        val = math.sin(2.0 * math.pi * 880.0 * t) * env * 0.16
        out.append(val)
    return out


def gen_ambient_day() -> list[float]:
    # Sunny Day: Babbling stream + gentle morning bird chirps at t=0.6s and t=2.1s
    dur = 3.2
    n = int(SAMPLE_RATE * dur)
    out = []
    rng = random.Random(101)
    lp1 = 0.0
    lp2 = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        raw = rng.random() * 2.0 - 1.0
        lp1 = lp1 * 0.95 + raw * 0.05
        lp2 = lp2 * 0.91 + lp1 * 0.09
        water = lp2 * (0.65 + 0.35 * math.sin(2.0 * math.pi * 0.625 * t)) * 0.08
        bird = 0.0
        for bt in (0.55, 0.72, 2.10, 2.28):
            if bt <= t < bt + 0.11:
                lt = t - bt
                bf = 1650.0 + 550.0 * math.sin(lt * 45.0)
                bird += math.sin(2.0 * math.pi * bf * lt) * math.sin(math.pi * lt / 0.11) * 0.045
        out.append(water + bird)
    return out


def gen_ambient_dusk() -> list[float]:
    # Sunset Dusk: Soft warm breeze + warm wooden/pentatonic wind chime
    dur = 3.2
    n = int(SAMPLE_RATE * dur)
    out = []
    rng = random.Random(202)
    lp = 0.0
    chime_notes = [(0.3, 523.25), (1.1, 659.25), (1.9, 783.99), (2.5, 587.33)]
    for i in range(n):
        t = i / SAMPLE_RATE
        raw = rng.random() * 2.0 - 1.0
        lp = lp * 0.975 + raw * 0.025
        breeze = lp * (0.5 + 0.5 * math.sin(2.0 * math.pi * 0.3125 * t)) * 0.09
        chime = 0.0
        for ct, cf in chime_notes:
            if t >= ct:
                lt = t - ct
                chime += math.sin(2.0 * math.pi * cf * lt) * math.exp(-lt * 4.5) * 0.035
        out.append(breeze + chime)
    return out


def gen_ambient_night() -> list[float]:
    # Firefly Night: Gentle rhythmic cricket trill + soft twilight harmonic pad
    dur = 3.2
    n = int(SAMPLE_RATE * dur)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        pad = (
            math.sin(2.0 * math.pi * 293.66 * t) * 0.016
            + math.sin(2.0 * math.pi * 440.00 * t) * 0.012
        )
        cricket = 0.0
        for ct in (0.2, 0.5, 1.4, 1.7, 2.6):
            if ct <= t < ct + 0.18:
                lt = t - ct
                pulse = 0.5 + 0.5 * math.sin(2.0 * math.pi * 38.0 * lt)
                cricket += math.sin(2.0 * math.pi * 3650.0 * lt) * pulse * math.sin(math.pi * lt / 0.18) * 0.022
        out.append(pad + cricket)
    return out


def gen_ambient_rain() -> list[float]:
    # Rainbow / Magic Rain: Soft pitter-patter rain + crystalline wind chime
    dur = 3.2
    n = int(SAMPLE_RATE * dur)
    out = []
    rng = random.Random(303)
    lp = 0.0
    bells = [(0.2, 1046.5), (0.9, 1174.7), (1.6, 1318.5), (2.3, 1568.0)]
    for i in range(n):
        t = i / SAMPLE_RATE
        raw = rng.random() * 2.0 - 1.0
        lp = lp * 0.88 + raw * 0.12
        rain = lp * 0.045
        bell = 0.0
        for bt, bf in bells:
            if t >= bt:
                lt = t - bt
                bell += math.sin(2.0 * math.pi * bf * lt) * math.exp(-lt * 5.5) * 0.032
        out.append(rain + bell)
    return out


def main() -> None:
    write_wav("harvest_pop.wav", gen_harvest_pop())
    write_wav("meso_coin.wav", gen_meso_coin())
    write_wav("water_splash.wav", gen_water_splash())
    write_wav("wood_build.wav", gen_wood_build())
    write_wav("ui_click.wav", gen_ui_click())
    write_wav("ui_hover.wav", gen_ui_hover())
    write_wav("ambient_stream.wav", gen_ambient_day())
    write_wav("ambient_day.wav", gen_ambient_day())
    write_wav("ambient_dusk.wav", gen_ambient_dusk())
    write_wav("ambient_night.wav", gen_ambient_night())
    write_wav("ambient_rain.wav", gen_ambient_rain())
    print("Generated all Phase 3 SFX & 4 weather ambient loops in:", SFX_DIR)


if __name__ == "__main__":
    main()
