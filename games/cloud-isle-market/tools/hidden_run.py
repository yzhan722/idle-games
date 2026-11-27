# -*- coding: utf-8 -*-
"""在看不见的独立桌面上启动程序：不弹窗、不抢焦点。
用法: python hidden_run.py --cwd DIR --log FILE [--timeout 秒] [--env K=V ...] -- exe args..."""
import argparse, ctypes, os, subprocess, sys, msvcrt
from ctypes import wintypes as w

k32 = ctypes.WinDLL('kernel32', use_last_error=True)
u32 = ctypes.WinDLL('user32', use_last_error=True)


class STARTUPINFO(ctypes.Structure):
    _fields_ = [('cb', w.DWORD), ('lpReserved', w.LPWSTR), ('lpDesktop', w.LPWSTR), ('lpTitle', w.LPWSTR), ('dwX', w.DWORD), ('dwY', w.DWORD), ('dwXSize', w.DWORD), ('dwYSize', w.DWORD),
                ('dwXCountChars', w.DWORD), ('dwYCountChars', w.DWORD), ('dwFillAttribute', w.DWORD), ('dwFlags', w.DWORD), ('wShowWindow', w.WORD), ('cbReserved2', w.WORD),
                ('lpReserved2', ctypes.c_void_p), ('hStdInput', w.HANDLE), ('hStdOutput', w.HANDLE), ('hStdError', w.HANDLE)]


class PROCINFO(ctypes.Structure):
    _fields_ = [('hProcess', w.HANDLE), ('hThread', w.HANDLE), ('dwProcessId', w.DWORD), ('dwThreadId', w.DWORD)]


class SECATTR(ctypes.Structure):
    _fields_ = [('nLength', w.DWORD), ('lpSecurityDescriptor', ctypes.c_void_p), ('bInheritHandle', w.BOOL)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cwd', default=None)
    ap.add_argument('--log', required=True)
    ap.add_argument('--timeout', type=int, default=300)
    ap.add_argument('--env', action='append', default=[])
    ap.add_argument('cmd', nargs=argparse.REMAINDER)
    a = ap.parse_args()
    cmd = a.cmd[1:] if a.cmd and a.cmd[0] == '--' else a.cmd
    for kv in a.env:
        k, v = kv.split('=', 1)
        os.environ[k] = v
    u32.CreateDesktopW.restype = w.HANDLE
    u32.CreateDesktopW.argtypes = [w.LPCWSTR, w.LPCWSTR, ctypes.c_void_p, w.DWORD, w.DWORD, ctypes.c_void_p]
    name = 'claude_hidden_desk'
    desk = u32.CreateDesktopW(name, None, None, 0, 0x10000000, None)
    if not desk:
        raise SystemExit('CreateDesktop failed %d' % ctypes.get_last_error())
    k32.CreateFileW.restype = w.HANDLE
    k32.CreateFileW.argtypes = [w.LPCWSTR, w.DWORD, w.DWORD, ctypes.c_void_p, w.DWORD, w.DWORD, w.HANDLE]
    sa = SECATTR(ctypes.sizeof(SECATTR), None, True)
    hout = k32.CreateFileW(a.log, 0x40000000, 3, ctypes.byref(sa), 2, 0x80, None)
    hin = k32.CreateFileW('NUL', 0x80000000, 3, ctypes.byref(sa), 3, 0x80, None)
    si = STARTUPINFO()
    si.cb = ctypes.sizeof(STARTUPINFO)
    si.lpDesktop = name
    si.dwFlags = 0x100  # STARTF_USESTDHANDLES
    si.hStdInput, si.hStdOutput, si.hStdError = hin, hout, hout
    pi = PROCINFO()
    line = ctypes.create_unicode_buffer(subprocess.list2cmdline(cmd))
    k32.CreateProcessW.argtypes = [w.LPCWSTR, w.LPWSTR, ctypes.c_void_p, ctypes.c_void_p, w.BOOL, w.DWORD, ctypes.c_void_p, w.LPCWSTR, ctypes.c_void_p, ctypes.c_void_p]
    if not k32.CreateProcessW(None, line, None, None, True, 0x08000000, None, a.cwd, ctypes.byref(si), ctypes.byref(pi)):
        raise SystemExit('CreateProcess failed %d' % ctypes.get_last_error())
    k32.WaitForSingleObject.argtypes = [w.HANDLE, w.DWORD]
    r = k32.WaitForSingleObject(pi.hProcess, a.timeout * 1000)
    if r != 0:
        k32.TerminateProcess.argtypes = [w.HANDLE, w.UINT]
        k32.TerminateProcess(pi.hProcess, 124)
        k32.WaitForSingleObject(pi.hProcess, 5000)
    code = w.DWORD()
    k32.GetExitCodeProcess(pi.hProcess, ctypes.byref(code))
    k32.CloseHandle(pi.hProcess); k32.CloseHandle(pi.hThread); k32.CloseHandle(hout); k32.CloseHandle(hin)
    u32.CloseDesktop(desk)
    sys.exit(code.value)


main()
