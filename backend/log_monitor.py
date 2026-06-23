"""
Second Brain AI — Live API Log Monitor
======================================
Run this in a separate terminal window:

    python backend/log_monitor.py

It watches backend/logs/api.log in real-time and renders a live
colour-coded table of every API request with status, duration, and
error details.
"""

import os
import sys
import json
import time

try:
    from rich.console import Console
    from rich.table import Table
    from rich.live import Live
    from rich.panel import Panel
    from rich.text import Text
    from rich.layout import Layout
    from rich.columns import Columns
    from rich import box
    from rich.style import Style
    from rich.align import Align
    from rich.rule import Rule
except ImportError:
    print("Installing 'rich' library …")
    os.system(f"{sys.executable} -m pip install rich")
    from rich.console import Console
    from rich.table import Table
    from rich.live import Live
    from rich.panel import Panel
    from rich.text import Text
    from rich.layout import Layout
    from rich.columns import Columns
    from rich import box
    from rich.style import Style
    from rich.align import Align
    from rich.rule import Rule

# ── Config ─────────────────────────────────────────────────────────────────
LOG_FILE = os.path.join(os.path.dirname(__file__), "logs", "api.log")
MAX_ROWS = 30          # keep the last N requests visible
REFRESH_RATE = 0.5     # seconds between screen refreshes

console = Console()

# Status → colour mapping
def status_style(code: int) -> str:
    if code < 300:   return "bold green"
    if code < 400:   return "bold cyan"
    if code < 500:   return "bold yellow"
    return "bold red"

def method_style(method: str) -> str:
    colours = {"GET": "cyan", "POST": "magenta", "PUT": "yellow",
                "DELETE": "red", "PATCH": "orange1"}
    return colours.get(method.upper(), "white")

def duration_style(ms: float) -> str:
    if ms < 200:  return "green"
    if ms < 800:  return "yellow"
    return "red"


# ── State ──────────────────────────────────────────────────────────────────
records: list[dict] = []
stats = {"total": 0, "ok": 0, "warn": 0, "error": 0, "total_ms": 0.0}


def parse_line(line: str):
    line = line.strip()
    if not line:
        return None
    try:
        data = json.loads(line)
        # Only process entries that look like request logs
        if "path" not in data:
            return None
        return data
    except json.JSONDecodeError:
        return None


def tail_file(path: str):
    """Open file and seek to end; yield new lines as they arrive."""
    # Wait until file exists
    while not os.path.exists(path):
        time.sleep(1)
    with open(path, "r", encoding="utf-8") as f:
        f.seek(0, 2)          # seek to end
        while True:
            line = f.readline()
            if line:
                yield line
            else:
                time.sleep(REFRESH_RATE)


def build_table() -> Table:
    table = Table(
        box=box.ROUNDED,
        show_header=True,
        header_style="bold white on #1a1a2e",
        border_style="#3d405b",
        padding=(0, 1),
        expand=True,
    )
    table.add_column("Time",       style="dim",     width=10)
    table.add_column("Method",      width=8,  justify="center")
    table.add_column("Endpoint",    min_width=22,   no_wrap=False)
    table.add_column("Status",      width=8,  justify="center")
    table.add_column("Duration",    width=10, justify="right")
    table.add_column("Error / Reason", min_width=30, no_wrap=False)

    for entry in records[-MAX_ROWS:]:
        ts_raw   = entry.get("timestamp", "")
        ts       = ts_raw[11:19] if len(ts_raw) >= 19 else ts_raw
        method   = entry.get("method", "-")
        path     = entry.get("path", "-")
        status   = entry.get("status", 0)
        dur      = entry.get("duration_ms", 0)
        err      = entry.get("error") or ""

        if isinstance(err, dict):
            err = f"[{err.get('type','')}] {err.get('message','')}"

        # truncate long paths
        if len(path) > 40:
            path = "…" + path[-38:]

        table.add_row(
            Text(ts,     style="dim"),
            Text(method, style=method_style(method)),
            Text(path,   style="white"),
            Text(str(status), style=status_style(status)),
            Text(f"{dur} ms",  style=duration_style(dur)),
            Text(str(err)[:120], style="red" if err else "dim"),
        )

    return table


def build_stats_panel() -> Panel:
    ok_pct = (stats["ok"] / stats["total"] * 100) if stats["total"] else 0
    avg_ms = (stats["total_ms"] / stats["total"]) if stats["total"] else 0

    lines = [
        f"[bold white]Total Requests :[/]  [cyan]{stats['total']}[/]",
        f"[bold white]✅ Success (2xx):[/]  [green]{stats['ok']}[/]  ({ok_pct:.1f}%)",
        f"[bold white]⚠️  Client err   :[/]  [yellow]{stats['warn']}[/]",
        f"[bold white]❌ Server err   :[/]  [red]{stats['error']}[/]",
        f"[bold white]⏱  Avg Response :[/]  [magenta]{avg_ms:.1f} ms[/]",
    ]
    content = "\n".join(lines)
    return Panel(content, title="[bold cyan]📊 Session Stats[/]",
                 border_style="cyan", padding=(1, 2))


def build_header() -> Panel:
    title = Text("🧠  Second Brain AI — Live API Monitor", justify="center",
                 style="bold white")
    sub   = Text("Watching: " + LOG_FILE, justify="center", style="dim")
    return Panel(
        Align.center(title.__str__() + "\n" + sub.__str__()),
        border_style="#7c3aed",
        style="on #0d0d1a",
    )


def update_stats(entry: dict):
    stats["total"]    += 1
    stats["total_ms"] += entry.get("duration_ms", 0)
    code = entry.get("status", 0)
    if code < 400:
        stats["ok"]    += 1
    elif code < 500:
        stats["warn"]  += 1
    else:
        stats["error"] += 1


def render() -> Layout:
    root = Layout()
    root.split_column(
        Layout(build_header(),      name="header",  size=5),
        Layout(name="body"),
        Layout(build_stats_panel(), name="footer",  size=9),
    )
    root["body"].update(
        Panel(build_table(),
              title=f"[bold white]📋 Endpoint Log (last {MAX_ROWS} calls)[/]",
              border_style="#3d405b")
    )
    return root


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    console.clear()
    console.print(
        Panel("[bold cyan]🧠 Second Brain AI Log Monitor[/]\n"
              f"[dim]Waiting for log file at:[/] [white]{LOG_FILE}[/]\n"
              "[dim]Start the backend server, then make some API calls.[/]",
              border_style="cyan")
    )

    # Replay existing lines first (last 200)
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
        for line in lines[-200:]:
            entry = parse_line(line)
            if entry:
                records.append(entry)
                update_stats(entry)

    with Live(render(), console=console, refresh_per_second=int(1 / REFRESH_RATE),
              screen=True) as live:
        for raw_line in tail_file(LOG_FILE):
            entry = parse_line(raw_line)
            if entry is None:
                continue
            records.append(entry)
            update_stats(entry)
            live.update(render())


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[bold red]Monitor stopped.[/]")
