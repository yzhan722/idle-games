## 自动化通关测试：让 Ren'Py 自己把四条路线各跑一遍，验证脚本没有运行时错误、
## 每个结局都能按预期条件到达。
##
## 运行（在项目根目录）：
##   renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe renpy-8.5.3-sdk\renpy.py . test routes
## 或直接双击 test.bat
##
## 原理：`skip fast` 快进到下一个选项菜单，再由 autoplay.pick() 按策略决定点哪一项：
##   best      全部选第一项（最优 → TRUE END → 隐藏结局）
##   no_truth  同 best，但第三章不说出对周可的怀疑（→ GOOD END）
##   mixed     推理全对，其余选项按好感恒温（<50 选最优，否则选最差）（→ NORMAL END）
##   worst     全部选最后一项（推理连错 → BAD END）
## 本目录在 options.rpy 里已排除出发行包。

init 10 python in autoplay:
    import re
    # 命名 store 里 `import renpy` 拿到的是引擎包本身，而不是脚本里那个 renpy.exports 别名
    import renpy.exports as rexports
    import renpy.config as rconfig
    import store
    from store import persistent

    # 推理类菜单的识别：菜单标题或紧邻的上一句台词里出现这些词
    REASON_PAT = re.compile(r"推理|再想|回看|线索最关键|判断是|破绽|串起来|地点的关键|尽力一搏")

    def _items():
        scr = rexports.get_screen("choice")
        if scr is None:
            return [], []
        items = scr.scope.get("items", [])
        captions = [i.caption for i in items if i.action is None]
        choices = [i.caption for i in items if i.action is not None]
        return captions, choices

    def _is_reasoning(captions):
        last = getattr(store, "_last_say_what", "") or ""
        return bool(REASON_PAT.search(" ".join(captions) + " " + last))

    def _decide(s, captions, choices):
        if s == "worst":
            return choices[-1]
        if s == "no_truth":
            for c in choices:
                if c.startswith("暂时不说"):
                    return c
            return choices[0]
        if s == "mixed":
            # 推理全对；其余菜单按"恒温器"取舍：好感低于 50 就选最优，否则选最差。
            # 这样无论剧本增删多少菜单，中庸路线都会稳定落在 60 出头的 NE 区间（必经的固定加分约 +25 会把它从 50 抬上去），
            # 不像首末交替那样受菜单数量奇偶影响。
            if _is_reasoning(captions):
                return choices[0]
            return choices[0] if store.mo_favor < 50 else choices[-1]
        return choices[0]

    # `click expression` 会对同一个菜单求值两次（就绪检查 + 实际点击），
    # 这里按当前选项集合缓存决定，保证同一菜单只决策一次（mixed 策略的交替才正确）
    _memo = {"key": None, "chosen": ""}

    def pick():
        """返回当前菜单里应该点击的选项文字"""
        captions, choices = _items()
        if not choices:
            return ""
        key = tuple(choices)
        if _memo["key"] == key:
            return _memo["chosen"]
        s = persistent._autoplay_strategy or "best"
        chosen = _decide(s, captions, choices)
        _memo["key"] = key
        _memo["chosen"] = chosen
        print("[autoplay] %-8s %s -> %s" % (s, "R" if _is_reasoning(captions) else " ", chosen))
        return chosen

    def snapshot():
        return "mo=%s alice=%s kako=%s truth=%s fails=%s" % (
            store.mo_favor, store.alice_favor, store.kako_clue, store.truth_route, store.fail_count)

    # 记录到达的结局 label（挂在 extra.rpy 的进度回调之后）
    _prev_cb = rconfig.label_callback

    def _label_cb(name, abnormal):
        if _prev_cb is not None:
            _prev_cb(name, abnormal)
        if name in ("ending_te", "ending_he", "ending_ne", "ending_be"):
            persistent._autoplay_ending = name
            print("[autoplay] reached %s with %s" % (name, snapshot()))
        if name == "ending_hidden":
            persistent._autoplay_hidden = True

    rconfig.label_callback = _label_cb


testsuite routes:

    setup:
        $ _test.timeout = 90.0
        pause until screen "main_menu"

    before testcase:
        $ persistent._autoplay_ending = None
        $ persistent._autoplay_hidden = False
        $ persistent._autoplay_toggle = False
        if not screen "main_menu":
            run MainMenu(confirm=False)
        pause until screen "main_menu"
        click "开始游戏"
        advance until screen "input"
        keysym "K_RETURN"

    teardown:
        exit

    testcase route:
        # (策略, 预期结局 label, 是否应解锁隐藏结局)
        parameter (strategy, expected, hidden) = [
            ("best",     "ending_te", True),
            ("no_truth", "ending_he", False),
            ("mixed",    "ending_ne", False),
            ("worst",    "ending_be", False),
        ]
        $ persistent._autoplay_strategy = strategy
        # 最优路线约 50 个菜单（含 5 次调查菜单循环），最差路线约 53 个；这里留足 70 轮。
        # 路线结束回到主菜单后，多余轮次会立刻通过。
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        skip fast until screen "choice" or screen "main_menu"
        if screen "choice":
            click expression autoplay.pick()
        assert screen "main_menu"
        assert eval (persistent._autoplay_ending == expected)
        assert eval (persistent._autoplay_hidden == hidden)


## 截图检查：跑到序章前两个菜单，确认多个角色能同时在场，并把实际画面存到 tests/screenshots/
## 供人工核对立绘比例与站位。截图会与上次结果逐像素比较，所以要带 --overwrite-screenshots：
##   renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe renpy-8.5.3-sdk\renpy.py . test shots --overwrite-screenshots
testsuite shots:

    setup:
        $ _test.timeout = 90.0
        pause until screen "main_menu"

    teardown:
        exit

    testcase prologue:
        $ persistent._autoplay_strategy = "best"
        if not screen "main_menu":
            run MainMenu(confirm=False)
        pause until screen "main_menu"
        screenshot "main_menu.png"
        click "开始游戏"
        advance until screen "input"
        keysym "K_RETURN"
        # 第一个菜单：转学前夜，主角家（无立绘），直接选过
        skip fast until screen "choice"
        click expression autoplay.pick()
        # 第二个菜单："代价"，图书馆，王老师（左）+ 艾丽丝（右）
        skip fast until screen "choice"
        pause 0.5
        $ print("[shots] showing:", sorted(renpy.get_showing_tags()))
        assert eval ({"wang", "alice"} <= set(renpy.get_showing_tags()))
        screenshot "prologue_library.png"
        click expression autoplay.pick()
        # 第三个菜单：与墨墨相遇，墨墨（中）+ 艾丽丝（右）
        skip fast until screen "choice"
        pause 0.5
        $ print("[shots] showing:", sorted(renpy.get_showing_tags()))
        assert eval ({"mo", "alice"} <= set(renpy.get_showing_tags()))
        screenshot "prologue_mo.png"
        # best 策略选"折千纸鹤" → 两句旁白后进入序章 CG
        click expression autoplay.pick()
        advance until eval ("cg" in renpy.get_showing_tags())
        pause 1.0
        assert eval ("cg" in renpy.get_showing_tags())
        screenshot "prologue_cg_crane.png"

    ## 第一章结尾：签名书 CG（书与脸必须在对话框之上）→ 章末夕阳背景 + 居中字幕
    testcase chapter1:
        $ persistent._autoplay_strategy = "best"
        if not screen "main_menu":
            run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start("chapter1")
        # best 路线在第一章 CG 之前有五个菜单（推理一 / 纸箱顺序 / 回应王老师 / 艾丽丝伸手 / 送书方式），
        # 之后逐句推进到 CG。快进模式下 eval 条件可能在 CG 一闪而过时没被采样到，所以这里改用 advance。
        skip fast until screen "choice"
        click expression autoplay.pick()
        skip fast until screen "choice"
        click expression autoplay.pick()
        skip fast until screen "choice"
        click expression autoplay.pick()
        skip fast until screen "choice"
        click expression autoplay.pick()
        skip fast until screen "choice"
        click expression autoplay.pick()
        advance until eval ("cg" in renpy.get_showing_tags())
        pause 1.0
        assert eval ("cg" in renpy.get_showing_tags())
        screenshot "ch1_cg_signing.png"
        # CG 之后还有"回家"与"次日清晨万事屋"两场戏，其中有一个入社菜单，先快进并选过
        skip fast until screen "choice"
        click expression autoplay.pick()
        # 章末 `centered` 字幕也是 say 语句，_last_say_what 会带上"第一章 · 完"
        advance until eval ("第一章" in (_last_say_what or ""))
        pause 1.5
        screenshot "ch1_sunset_chapter_end.png"

    ## 隐藏结局：万事屋背景叠墨墨立绘 → 两只千纸鹤 CG
    testcase hidden_ending:
        if not screen "main_menu":
            run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start("ending_hidden")
        advance until eval ("mo" in renpy.get_showing_tags())
        pause 1.0
        $ print("[shots] showing:", sorted(renpy.get_showing_tags()))
        screenshot "hidden_agency.png"
        advance until eval ("cg" in renpy.get_showing_tags())
        pause 1.0
        screenshot "hidden_cg_secondcrane.png"

    ## 直接从第六章开跳，检查终章 CG 与旧楼背景上叠立绘的实际观感
    testcase chapter6:
        if not screen "main_menu":
            run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start("chapter6")
        # 开场旁白后切到对峙 CG
        advance until eval ("cg" in renpy.get_showing_tags())
        pause 1.0
        screenshot "ch6_cg_confront.png"
        # 随后回到旧楼背景，墨墨（中）+ 周可（右）
        advance until eval ({"mo", "zhouke"} <= set(renpy.get_showing_tags()))
        pause 1.0
        $ print("[shots] showing:", sorted(renpy.get_showing_tags()))
        assert eval ("bg" in renpy.get_showing_tags())
        screenshot "ch6_oldbuilding.png"
