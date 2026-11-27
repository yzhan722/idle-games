#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Long idle run on a hidden, muted desktop (CI-G1): memory, handles and CPU time of the game process, once a minute.

Nothing becomes visible and nothing takes the focus; the profile is redirected, so the player's save is never touched.
Only the numbers of the child process itself are read (GetProcessMemoryInfo / GetProcessTimes), no hardware or WMI query.

  python tools/soak.py --hours 8 --out soak.csv -- <exe> [args...]
"""
import argparse, csv, ctypes, os, sys, tempfile, time
from ctypes import wintypes as w

k32 = ctypes.WinDLL('kernel32', use_last_error=True)
u32 = ctypes.WinDLL('user32', use_last_error=True)
psapi = ctypes.WinDLL('psapi', use_last_error=True)


class SI(ctypes.Structure):
    _fields_ = [('cb', w.DWORD), ('r', w.LPWSTR), ('desk', w.LPWSTR), ('title', w.LPWSTR), ('x', w.DWORD), ('y', w.DWORD), ('cx', w.DWORD), ('cy', w.DWORD),
                ('ccx', w.DWORD), ('ccy', w.DWORD), ('fill', w.DWORD), ('flags', w.DWORD), ('show', w.WORD), ('cb2', w.WORD), ('r2', ctypes.c_void_p),
                ('i', w.HANDLE), ('o', w.HANDLE), ('e', w.HANDLE)]


class PI(ctypes.Structure):
    _fields_ = [('hp', w.HANDLE), ('ht', w.HANDLE), ('pid', w.DWORD), ('tid', w.DWORD)]


class MEM(ctypes.Structure):
    _fields_ = [('cb', w.DWORD), ('faults', w.DWORD), ('peak_ws', ctypes.c_size_t), ('ws', ctypes.c_size_t), ('a', ctypes.c_size_t), ('b', ctypes.c_size_t),
                ('c', ctypes.c_size_t), ('d', ctypes.c_size_t), ('pagefile', ctypes.c_size_t), ('peak_pagefile', ctypes.c_size_t), ('private', ctypes.c_size_t)]


def filetime(ft):
    return ((ft.dwHighDateTime << 32) | ft.dwLowDateTime) / 1e7


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--hours', type=float, default=8.0)
    ap.add_argument('--out', default='soak.csv')
    ap.add_argument('--every', type=float, default=60.0)
    ap.add_argument('cmd', nargs=argparse.REMAINDER)
    a = ap.parse_args()
    cmd = a.cmd[1:] if a.cmd and a.cmd[0] == '--' else a.cmd
    if not cmd:
        ap.error('no command')
    profile = tempfile.mkdtemp(prefix='soak_profile_')
    os.environ['APPDATA'] = profile
    u32.CreateDesktopW.restype = w.HANDLE
    u32.CreateDesktopW.argtypes = [w.LPCWSTR, ctypes.c_void_p, ctypes.c_void_p, w.DWORD, w.DWORD, ctypes.c_void_p]
    k32.GetProcessTimes.argtypes = [w.HANDLE] + [ctypes.POINTER(w.FILETIME)] * 4
    k32.GetProcessHandleCount.argtypes = [w.HANDLE, ctypes.POINTER(w.DWORD)]
    k32.GetExitCodeProcess.argtypes = [w.HANDLE, ctypes.POINTER(w.DWORD)]
    k32.TerminateProcess.argtypes = [w.HANDLE, w.UINT]
    psapi.GetProcessMemoryInfo.argtypes = [w.HANDLE, ctypes.c_void_p, w.DWORD]
    desk = u32.CreateDesktopW('soak_%d' % os.getpid(), None, None, 0, 0x10000000, None)
    if not desk:
        raise ctypes.WinError(ctypes.get_last_error())
    si = SI(); si.cb = ctypes.sizeof(SI); si.desk = 'soak_%d' % os.getpid()
    pi = PI()
    line = ctypes.create_unicode_buffer(' '.join('"%s"' % c if ' ' in c else c for c in cmd))
    if not k32.CreateProcessW(None, line, None, None, False, 0x4000, None, None, ctypes.byref(si), ctypes.byref(pi)):
        raise ctypes.WinError(ctypes.get_last_error())
    start = time.time()
    prev_cpu, prev_t = 0.0, start
    code = w.DWORD(259)
    try:
        with open(a.out, 'w', newline='') as fh:
            out = csv.writer(fh)
            out.writerow(['minute', 'private_mb', 'working_set_mb', 'handles', 'cpu_percent_of_one_core'])
            while time.time() - start < a.hours * 3600:
                time.sleep(a.every)
                k32.GetExitCodeProcess(pi.hp, ctypes.byref(code))
                if code.value != 259:
                    print('the game ended with code', code.value)
                    break
                m = MEM(); m.cb = ctypes.sizeof(MEM)
                psapi.GetProcessMemoryInfo(pi.hp, ctypes.byref(m), m.cb)
                c, e, kt, ut = w.FILETIME(), w.FILETIME(), w.FILETIME(), w.FILETIME()
                k32.GetProcessTimes(pi.hp, ctypes.byref(c), ctypes.byref(e), ctypes.byref(kt), ctypes.byref(ut))
                n = w.DWORD(); k32.GetProcessHandleCount(pi.hp, ctypes.byref(n))
                cpu, now = filetime(kt) + filetime(ut), time.time()
                out.writerow([round((now - start) / 60), round(m.private / 1048576, 1), round(m.ws / 1048576, 1), n.value, round((cpu - prev_cpu) / (now - prev_t) * 100, 1)])
                fh.flush()
                prev_cpu, prev_t = cpu, now
    finally:
        k32.TerminateProcess(pi.hp, 0)
    print('wrote', a.out)


if __name__ == '__main__':
    sys.exit(main())
