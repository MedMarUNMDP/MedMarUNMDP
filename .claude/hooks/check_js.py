"""PostToolUse (Edit|Write): corre `node --check` sobre el archivo JS editado.

Si hay error de sintaxis devuelve exit 2 para que Claude lo vea y lo corrija en el acto.
Archivos .ts (Edge Functions, Deno) no se chequean acá.
"""
import json
import shutil
import subprocess
import sys

JS_EXT = (".js", ".cjs", ".mjs")


def main() -> int:
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8-sig", errors="replace"))
    except Exception:
        return 0
    tool_input = data.get("tool_input") or {}
    path = str(tool_input.get("file_path") or "")
    if not path.lower().endswith(JS_EXT):
        return 0
    node = shutil.which("node")
    if not node:
        return 0
    result = subprocess.run([node, "--check", path], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        print(f"node --check falló en {path}:\n{result.stderr.strip()[:2000]}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
